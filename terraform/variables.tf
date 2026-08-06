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
