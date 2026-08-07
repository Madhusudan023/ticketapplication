resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public[*].id

  lifecycle {
    ignore_changes = all
  }

  tags = { Name = "${var.project_name}-alb" }
}

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

  lifecycle {
    ignore_changes = all
  }

  tags = { Name = "${var.project_name}-eureka-tg" }
}

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
    matcher             = "200-499"
  }

  lifecycle {
    ignore_changes = all
  }

  tags = { Name = "${var.project_name}-gateway-tg" }
}

resource "aws_lb_listener" "eureka" {
  load_balancer_arn = aws_lb.main.arn
  port              = "8761"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.eureka.arn
  }

  lifecycle {
    ignore_changes = all
  }
}

resource "aws_lb_listener" "api_gateway" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }

  lifecycle {
    ignore_changes = all
  }
}
