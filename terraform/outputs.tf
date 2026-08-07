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

output "frontend_s3_url" {
  description = "React Frontend Website URL"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "rds_endpoint" {
  description = "RDS MySQL Endpoint"
  value       = aws_db_instance.mysql.endpoint
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
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
