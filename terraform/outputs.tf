output "alb_dns_name" {
  description = "ALB DNS Name (main entry point)"
  value       = aws_lb.main.dns_name
}

output "eureka_dashboard_url" {
  description = "Eureka Service Discovery Dashboard"
  value       = "http://${aws_lb.main.dns_name}:8761"
}

output "api_gateway_url" {
  description = "API Gateway URL (all microservice API calls)"
  value       = "http://${aws_lb.main.dns_name}"
}

# Item 22 — Frontend served via CloudFront, NOT public S3
output "frontend_url" {
  description = "React Frontend URL (via CloudFront CDN)"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "attachment_bucket_name" {
  description = "S3 bucket for file attachments (private)"
  value       = aws_s3_bucket.attachments.bucket
}

output "sns_alerts_arn" {
  description = "SNS Topic ARN for CloudWatch alarms"
  value       = aws_sns_topic.alerts.arn
}

output "rds_endpoint" {
  description = "RDS MySQL Endpoint"
  value       = aws_db_instance.mysql.endpoint
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
}

output "nat_gateway_ip" {
  description = "NAT Gateway Elastic IP (outbound IP for private ECS tasks)"
  value       = aws_eip.nat.public_ip
}

output "ecr_repository_urls" {
  description = "ECR Repository URLs"
  value = {
    eureka_server      = aws_ecr_repository.eureka_server.repository_url
    api_gateway        = aws_ecr_repository.api_gateway.repository_url
    auth_service       = aws_ecr_repository.auth_service.repository_url
    ticket_service     = aws_ecr_repository.ticket_service.repository_url
    comment_service    = aws_ecr_repository.comment_service.repository_url
    attachment_service = aws_ecr_repository.attachment_service.repository_url
    dashboard_service  = aws_ecr_repository.dashboard_service.repository_url
    frontend           = aws_ecr_repository.frontend.repository_url
  }
}
