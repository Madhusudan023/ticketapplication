import json
import urllib.request
import urllib.error
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """
    Lambda triggered by S3 ObjectCreated events on the attachments bucket.
    Parses the uploaded file metadata and calls attachment-service /record
    endpoint to persist the metadata in the database.

    Expected S3 key format: attachments/{ticketId}/{uuid_filename}
    """
    alb_dns = os.environ.get("ALB_DNS", "")
    record_url = f"http://{alb_dns}/api/v1/attachments/record"

    processed = []
    errors = []

    for s3_record in event.get("Records", []):
        try:
            bucket = s3_record["s3"]["bucket"]["name"]
            key = urllib.parse.unquote_plus(s3_record["s3"]["object"]["key"])
            size = s3_record["s3"]["object"].get("size", 0)
            etag = s3_record["s3"]["object"].get("eTag", "")

            logger.info(f"Processing upload: bucket={bucket} key={key} size={size}")

            # Parse key: attachments/{ticketId}/{filename}
            parts = key.split("/")
            if len(parts) < 3 or parts[0] != "attachments":
                logger.warning(f"Unexpected key format: {key}. Skipping.")
                continue

            ticket_id = int(parts[1])
            file_name = "/".join(parts[2:])

            payload = {
                "ticketId": ticket_id,
                "fileName": file_name,
                "originalFileName": file_name,
                "storageUrl": f"s3://{bucket}/{key}",
                "fileSize": size,
                "contentType": "application/octet-stream",
                "eTag": etag,
            }

            body = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                record_url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Content-Length": str(len(body)),
                },
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=10) as resp:
                response_body = resp.read().decode("utf-8")
                logger.info(f"attachment-service /record response: {response_body}")
                processed.append(key)

        except urllib.error.HTTPError as e:
            error_msg = f"HTTP {e.code} calling /record for key {key}: {e.read().decode()}"
            logger.error(error_msg)
            errors.append(error_msg)
        except Exception as exc:
            error_msg = f"Error processing {key}: {exc}"
            logger.error(error_msg, exc_info=True)
            errors.append(error_msg)

    return {
        "statusCode": 200 if not errors else 207,
        "body": json.dumps({
            "processed": processed,
            "errors": errors,
        }),
    }


# urllib.parse needs explicit import in this scope
import urllib.parse
