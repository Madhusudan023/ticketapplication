resource "random_password" "db_password" {
  length  = 16
  special = false

  lifecycle {
    ignore_changes = all
  }
}

resource "aws_secretsmanager_secret" "db_secret" {
  name        = "${var.project_name}-db-credentials-v2"
  description = "RDS MySQL Database credentials for TicketDesk"

  lifecycle {
    ignore_changes = all
  }

  tags = { Name = "${var.project_name}-db-secret" }
}

resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id = aws_secretsmanager_secret.db_secret.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
  })

  lifecycle {
    ignore_changes = all
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  lifecycle {
    ignore_changes = all
  }

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

resource "aws_db_instance" "mysql" {
  identifier             = "${var.project_name}-db"
  allocated_storage      = 20
  max_allocated_storage  = 50
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  db_name                = "ticketdesk_db"
  username               = var.db_username
  password               = random_password.db_password.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  lifecycle {
    ignore_changes = all
  }

  tags = { Name = "${var.project_name}-rds-mysql" }
}
