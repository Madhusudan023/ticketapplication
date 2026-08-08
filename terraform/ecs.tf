# ──────────────────────────────────────────────────────────────────────────────
# ECS CLUSTER
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
  lifecycle { ignore_changes = all }
  tags = { Name = "${var.project_name}-cluster" }
}

# ──────────────────────────────────────────────────────────────────────────────
# CLOUDWATCH LOG GROUP
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7
  lifecycle { ignore_changes = all }
}

# ──────────────────────────────────────────────────────────────────────────────
# IAM ROLES
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
  lifecycle { ignore_changes = all }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  lifecycle { ignore_changes = all }
}

resource "aws_iam_role_policy_attachment" "ecs_ecr_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  lifecycle { ignore_changes = all }
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
  lifecycle { ignore_changes = all }
}

# ──────────────────────────────────────────────────────────────────────────────
# LOCALS
# ──────────────────────────────────────────────────────────────────────────────
locals {
  log_config = {
    logDriver = "awslogs"
    options = {
      "awslogs-group"        = "/ecs/${var.project_name}"
      "awslogs-region"       = var.aws_region
      "awslogs-create-group" = "true"
    }
  }
  # Eureka URL via ALB
  eureka_url = "http://${aws_lb.main.dns_name}:8761/eureka/"

  # RDS base host:port (endpoint includes port)
  rds_host = aws_db_instance.mysql.endpoint

  # Unified DB URL pointing to ticketdesk_db (created automatically by RDS)
  db_url = "jdbc:mysql://${local.rds_host}/ticketdesk_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true"

  # Common env vars passed to every service that needs Eureka
  eureka_env = [
    { name = "EUREKA_CLIENT_SERVICEURL_DEFAULTZONE", value = local.eureka_url },
    { name = "EUREKA_URI",                           value = local.eureka_url }
  ]
}


# ──────────────────────────────────────────────────────────────────────────────
# 1. EUREKA SERVER
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "eureka" {
  family                   = "${var.project_name}-eureka"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "eureka-server"
    image     = "${aws_ecr_repository.eureka_server.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8761, hostPort = 8761, protocol = "tcp" }]
    environment = [{ name = "SPRING_PROFILES_ACTIVE", value = "docker" }]
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "eureka" }) }
  }])
}

resource "aws_ecs_service" "eureka" {
  name                 = "${var.project_name}-eureka-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.eureka.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.eureka.arn
    container_name   = "eureka-server"
    container_port   = 8761
  }
  health_check_grace_period_seconds = 120
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_lb_listener.eureka, aws_iam_role_policy_attachment.ecs_execution_policy]
}

# ──────────────────────────────────────────────────────────────────────────────
# 2. API GATEWAY
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "api-gateway"
    image     = "${aws_ecr_repository.api_gateway.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8080, hostPort = 8080, protocol = "tcp" }]
    environment = local.eureka_env
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "api-gateway" }) }
  }])
}

resource "aws_ecs_service" "api_gateway" {
  name                 = "${var.project_name}-gateway-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.api_gateway.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 8080
  }
  health_check_grace_period_seconds = 120
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_lb_listener.api_gateway, aws_ecs_service.eureka]
}

# ──────────────────────────────────────────────────────────────────────────────
# 3. AUTH SERVICE
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "auth_service" {
  family                   = "${var.project_name}-auth-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "auth-service"
    image     = "${aws_ecr_repository.auth_service.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8089, hostPort = 8089, protocol = "tcp" }]
    environment = concat(local.eureka_env, [
      { name = "SPRING_DATASOURCE_URL",      value = local.db_url },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
      { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password }
    ])
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "auth" }) }
  }])
}

resource "aws_ecs_service" "auth_service" {
  name                 = "${var.project_name}-auth-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.auth_service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_ecs_service.eureka, aws_db_instance.mysql]
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. TICKET SERVICE
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "ticket_service" {
  family                   = "${var.project_name}-ticket-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "ticket-service"
    image     = "${aws_ecr_repository.ticket_service.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8082, hostPort = 8082, protocol = "tcp" }]
    environment = concat(local.eureka_env, [
      { name = "SPRING_DATASOURCE_URL",      value = local.db_url },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
      { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password }
    ])
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "ticket" }) }
  }])
}

resource "aws_ecs_service" "ticket_service" {
  name                 = "${var.project_name}-ticket-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.ticket_service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_ecs_service.eureka, aws_db_instance.mysql]
}

# ──────────────────────────────────────────────────────────────────────────────
# 5. COMMENT SERVICE
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "comment_service" {
  family                   = "${var.project_name}-comment-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "comment-service"
    image     = "${aws_ecr_repository.comment_service.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8084, hostPort = 8084, protocol = "tcp" }]
    environment = concat(local.eureka_env, [
      { name = "SPRING_DATASOURCE_URL",      value = local.db_url },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
      { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password }
    ])
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "comment" }) }
  }])
}

resource "aws_ecs_service" "comment_service" {
  name                 = "${var.project_name}-comment-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.comment_service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_ecs_service.eureka, aws_db_instance.mysql]
}

# ──────────────────────────────────────────────────────────────────────────────
# 6. ATTACHMENT SERVICE
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "attachment_service" {
  family                   = "${var.project_name}-attachment-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "attachment-service"
    image     = "${aws_ecr_repository.attachment_service.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8085, hostPort = 8085, protocol = "tcp" }]
    environment = concat(local.eureka_env, [
      { name = "SPRING_DATASOURCE_URL",      value = local.db_url },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
      { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password }
    ])
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "attachment" }) }
  }])
}

resource "aws_ecs_service" "attachment_service" {
  name                 = "${var.project_name}-attachment-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.attachment_service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_ecs_service.eureka, aws_db_instance.mysql]
}

# ──────────────────────────────────────────────────────────────────────────────
# 7. DASHBOARD SERVICE
# ──────────────────────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "dashboard_service" {
  family                   = "${var.project_name}-dashboard-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name      = "dashboard-service"
    image     = "${aws_ecr_repository.dashboard_service.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 8087, hostPort = 8087, protocol = "tcp" }]
    environment = concat(local.eureka_env, [
      { name = "SPRING_DATASOURCE_URL",      value = local.db_url },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
      { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password }
    ])
    logConfiguration = { logDriver = local.log_config.logDriver, options = merge(local.log_config.options, { "awslogs-stream-prefix" = "dashboard" }) }
  }])
}

resource "aws_ecs_service" "dashboard_service" {
  name                 = "${var.project_name}-dashboard-service"
  cluster              = aws_ecs_cluster.main.id
  task_definition      = aws_ecs_task_definition.dashboard_service.arn
  desired_count        = 1
  launch_type          = "FARGATE"
  force_new_deployment = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  lifecycle { ignore_changes = [desired_count] }
  depends_on = [aws_ecs_service.eureka, aws_db_instance.mysql]
}
