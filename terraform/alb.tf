resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# Eureka Target Group (Port 8761)
resource "aws_lb_target_group" "eureka" {
  name        = "${var.project_name}-eureka-tg"
  port        = 8761
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 10
    interval            = 30
    matcher             = "200-399"
  }

  tags = {
    Name = "${var.project_name}-eureka-tg"
  }
}

# API Gateway Target Group (Port 8080)
resource "aws_lb_target_group" "api_gateway" {
  name        = "${var.project_name}-gateway-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/actuator/health"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 10
    interval            = 30
    matcher             = "200-399"
  }

  tags = {
    Name = "${var.project_name}-gateway-tg"
  }
}

# Listeners
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.eureka.arn
  }
}

resource "aws_lb_listener" "eureka" {
  load_balancer_arn = aws_lb.main.arn
  port              = "8761"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.eureka.arn
  }
}

resource "aws_lb_listener" "api_gateway" {
  load_balancer_arn = aws_lb.main.arn
  port              = "8080"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }
}
