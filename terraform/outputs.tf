output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  description = "Domain name of CloudFront distribution for Frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "rds_endpoint" {
  description = "RDS Database Endpoint"
  value       = aws_db_instance.mysql.endpoint
}

output "secretsmanager_secret_arn" {
  description = "Secrets Manager Secret ARN for DB credentials"
  value       = aws_secretsmanager_secret.db_secret.arn
}

output "ecr_repository_urls" {
  description = "ECR Repository URLs for containers"
  value = {
    frontend           = aws_ecr_repository.frontend.repository_url
    api_gateway        = aws_ecr_repository.api_gateway.repository_url
    auth_service       = aws_ecr_repository.auth_service.repository_url
    ticket_service     = aws_ecr_repository.ticket_service.repository_url
    comment_service    = aws_ecr_repository.comment_service.repository_url
    attachment_service = aws_ecr_repository.attachment_service.repository_url
    dashboard_service  = aws_ecr_repository.dashboard_service.repository_url
  }
}
