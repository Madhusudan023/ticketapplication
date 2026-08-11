# ── Item 18: Application config in SSM Parameter Store, read at runtime ──

resource "aws_ssm_parameter" "db_url" {
  name      = "/${var.project_name}/db-url"
  type      = "SecureString"
  value     = "jdbc:mysql://${aws_db_instance.mysql.address}:3306/ticketdesk_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-db-url" }
}

resource "aws_ssm_parameter" "db_username" {
  name      = "/${var.project_name}/db-username"
  type      = "SecureString"
  value     = var.db_username
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-db-username" }
}

resource "aws_ssm_parameter" "db_password" {
  name      = "/${var.project_name}/db-password"
  type      = "SecureString"
  value     = var.db_password
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-db-password" }
}

resource "aws_ssm_parameter" "eureka_url" {
  name      = "/${var.project_name}/eureka-url"
  type      = "String"
  value     = "http://${aws_lb.main.dns_name}:8761/eureka/"
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-eureka-url" }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name      = "/${var.project_name}/jwt-secret"
  type      = "SecureString"
  value     = "ticketdesk-super-secret-key-2026-production-grade-min-256bits"
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-jwt-secret" }
}

resource "aws_ssm_parameter" "attachment_bucket" {
  name      = "/${var.project_name}/attachment-bucket"
  type      = "String"
  value     = aws_s3_bucket.attachments.bucket
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-attachment-bucket" }
}

resource "aws_ssm_parameter" "aws_region" {
  name      = "/${var.project_name}/aws-region"
  type      = "String"
  value     = var.aws_region
  overwrite = true
  tags      = { Name = "${var.project_name}-ssm-aws-region" }
}
