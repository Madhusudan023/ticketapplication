terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Remote backend — configured via -backend-config flags in CI/CD
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  # Item 31 — every resource automatically tagged
  default_tags {
    tags = {
      Project     = "ticketdesk"
      Owner       = "devops-team"
      Environment = "production"
      CostCenter  = "engineering-101"
    }
  }
}
