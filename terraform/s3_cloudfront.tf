resource "random_id" "bucket_suffix" {
  byte_length = 4
  lifecycle { ignore_changes = all }
}

# ─────────────────────────────────────────────────────────────────────────────
# FRONTEND S3 BUCKET — public static website hosting (Free Tier)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${random_id.bucket_suffix.hex}"
  force_destroy = true
  lifecycle { ignore_changes = all }
  tags = { Name = "${var.project_name}-frontend-bucket" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
  lifecycle { ignore_changes = all }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" }
  lifecycle { ignore_changes = all }
}

resource "aws_s3_bucket_policy" "frontend_public" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })
}

# Item 20 — Encryption at rest on the bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
  lifecycle { ignore_changes = all }
}

# ─────────────────────────────────────────────────────────────────────────────
# ATTACHMENTS S3 BUCKET — private, presigned-URL upload (Items 23, 24)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "attachments" {
  bucket        = "${var.project_name}-attachments-${random_id.bucket_suffix.hex}"
  force_destroy = true
  tags          = { Name = "${var.project_name}-attachments-bucket" }
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket                  = aws_s3_bucket.attachments.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Item 20 — Encryption at rest on attachment bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS — allow browser presigned PUT requests
resource "aws_s3_bucket_cors_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
