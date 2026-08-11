resource "aws_secretsmanager_secret" "db_secret" {
  name        = "${var.project_name}-db-credentials-v2"
  description = "RDS MySQL Database credentials for TicketDesk"
  lifecycle { ignore_changes = all }
  tags = { Name = "${var.project_name}-db-secret" }
}

resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id = aws_secretsmanager_secret.db_secret.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
  })
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  lifecycle { ignore_changes = all }
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
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  # Item 21 — automated backups with non-zero retention
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Item 20 — encryption at rest
  storage_encrypted = true

  lifecycle {
    ignore_changes = [
      allocated_storage,
      max_allocated_storage
    ]
  }

  tags = { Name = "${var.project_name}-rds-mysql" }
}
