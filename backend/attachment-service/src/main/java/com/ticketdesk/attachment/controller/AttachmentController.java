package com.ticketdesk.attachment.controller;

import com.ticketdesk.attachment.dto.ApiResponse;
import com.ticketdesk.attachment.dto.RecordUploadRequest;
import com.ticketdesk.attachment.entity.Attachment;
import com.ticketdesk.attachment.repository.AttachmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attachments")
@CrossOrigin(origins = "*")
public class AttachmentController {

    private final AttachmentRepository repo;

    @Value("${app.s3.bucket:}")
    private String bucketName;

    @Value("${app.aws.region:us-east-1}")
    private String awsRegion;

    public AttachmentController(AttachmentRepository repo) {
        this.repo = repo;
    }

    /**
     * Item 23 — GET /api/v1/attachments/presigned-url
     * Generates a presigned S3 PUT URL so the frontend can upload
     * the file directly to S3 without going through the API.
     */
    @GetMapping("/presigned-url")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPresignedUrl(
            @RequestParam Long ticketId,
            @RequestParam String fileName,
            @RequestParam(defaultValue = "application/octet-stream") String contentType) {

        if (bucketName == null || bucketName.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("S3 bucket not configured"));
        }

        try {
            String key = "attachments/" + ticketId + "/" + UUID.randomUUID() + "_" + fileName;

            S3Presigner presigner = S3Presigner.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();

            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build();

            PutObjectPresignRequest presignReq = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(putReq)
                    .build();

            PresignedPutObjectRequest presigned = presigner.presignPutObject(presignReq);
            presigner.close();

            Map<String, String> result = new HashMap<>();
            result.put("uploadUrl", presigned.url().toString());
            result.put("key", key);
            result.put("storageUrl", "s3://" + bucketName + "/" + key);
            result.put("bucket", bucketName);

            return ResponseEntity.ok(ApiResponse.success("Presigned URL generated (valid 15 min)", result));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to generate presigned URL: " + e.getMessage()));
        }
    }

    /**
     * Item 24 — POST /api/v1/attachments/record
     * Called by the Lambda after a successful S3 upload to persist metadata.
     */
    @PostMapping("/record")
    public ResponseEntity<ApiResponse<Attachment>> recordUpload(@RequestBody RecordUploadRequest req) {
        try {
            Attachment a = new Attachment();
            a.setTicketId(req.getTicketId());
            a.setFileName(req.getFileName() != null ? req.getFileName() : "unknown");
            a.setOriginalFileName(req.getOriginalFileName() != null ? req.getOriginalFileName() : req.getFileName());
            a.setStorageUrl(req.getStorageUrl());
            a.setFileSize(req.getFileSize() != null ? req.getFileSize() : 0L);
            a.setContentType(req.getContentType() != null ? req.getContentType() : "application/octet-stream");
            Attachment saved = repo.save(a);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Attachment recorded from S3 upload", saved));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to record attachment: " + e.getMessage()));
        }
    }

    /**
     * GET /api/v1/attachments/ticket/{ticketId}
     * List all attachments for a ticket.
     */
    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<ApiResponse<List<Attachment>>> listByTicket(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ApiResponse.success("Attachments retrieved", repo.findByTicketId(ticketId)));
    }

    /**
     * DELETE /api/v1/attachments/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        Attachment a = repo.findById(id).orElse(null);
        if (a == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Attachment not found with id: " + id));
        }
        repo.delete(a);
        return ResponseEntity.ok(ApiResponse.success("Attachment deleted", null));
    }

    /**
     * GET /api/v1/attachments/health
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of(
            "status", "UP",
            "bucket", bucketName != null ? bucketName : "not-configured"
        )));
    }
}
