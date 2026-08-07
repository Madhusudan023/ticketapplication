variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "ticketdesk"
}

variable "container_port" {
  description = "Port exposed by the API container"
  type        = number
  default     = 8080
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
}

variable "image_tag" {
  description = "Docker image tag (Git commit SHA)"
  type        = string
  default     = "latest"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  default     = "TicketDeskPass123!"
}
