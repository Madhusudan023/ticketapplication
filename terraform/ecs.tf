resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7
}

# ─────────────────────────────────────────────────────────────
#  EUREKA SERVER — ECS FARGATE TASK DEFINITION
# ─────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "eureka" {
  family                   = "${var.project_name}-eureka-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "eureka-server"
      image     = "${aws_ecr_repository.eureka_server.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8761
          hostPort      = 8761
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "eureka"
        }
      }
    }
  ])
}

# ─────────────────────────────────────────────────────────────
#  EUREKA SERVER — ECS FARGATE SERVICE
# ─────────────────────────────────────────────────────────────
resource "aws_ecs_service" "eureka" {
  name            = "${var.project_name}-eureka-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.eureka.arn
  desired_count   = 1
  launch_type     = "FARGATE"

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

  depends_on = [aws_lb_listener.http]
}
