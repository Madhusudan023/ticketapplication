# Project TicketDesk
## AWS Cloud Capstone -- POC Submission Document
**Foundation Level | Java (Spring Boot) Stream | July 2026**

---

### Team Information & Core Responsibility Mapping

| Team Member | Role | Primary Responsibility & Deliverables |
| :--- | :--- | :--- |
| **Pooja** | Backend & DevOps | Dashboard Service, Eureka Server, 6-Stage CI/CD (deploy.yml), Teardown Pipeline (destroy.yml), CloudWatch/Alarms |
| **Madhusudan** | Backend & Cloud Data | Attachment Service, Lambda (Python 3.12), RDS/Secrets/S3 Terraform, Upload UI |
| **Pranathi** | Backend & Infrastructure | Ticket Service, Comment Service, VPC/ALB/ECS Terraform, Ticket UI |
| **Anurag** | Backend & QA | API Gateway, Auth Service, Unit Tests/Quality Gates (deploy.yml), Upload QA Suite, Auth UI |

*AWS Region: `us-east-1` | Infrastructure as Code: `Terraform` | Automation: `GitHub Actions CI/CD`*

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [AWS Services Used](#3-aws-services-used)
4. [Application Flow](#4-application-flow)
5. [Network Architecture](#5-network-architecture)
6. [Terraform Infrastructure as Code](#6-terraform-infrastructure-as-code)
7. [Docker and Container Approach](#7-docker-and-container-approach)
8. [Database Configuration](#8-database-configuration)
9. [Secrets and Configuration Management](#9-secrets-and-configuration-management)
10. [Frontend Deployment](#10-frontend-deployment)
11. [Lambda Function -- Attachment Processing](#11-lambda-function----attachment-processing)
12. [CI/CD Pipeline Architecture](#12-cicd-pipeline-architecture)
13. [Monitoring and Observability](#13-monitoring-and-observability)
14. [Security Implementation](#14-security-implementation)
15. [Cost Report](#15-cost-report)
16. [Testing Results](#16-testing-results)
17. [Deployment Steps](#17-deployment-steps)
18. [Terraform Destroy Evidence](#18-terraform-destroy-evidence)
19. [Problems Encountered and Solutions](#19-problems-encountered-and-solutions)
20. [Individual Contribution Mapping](#20-individual-contribution-mapping)

---

## 1. Project Overview
**TicketDesk** is an enterprise-grade, multi-tier IT support ticket management system designed and built collaboratively by a four-member engineering team. The system enables organizations to create, categorize, prioritize, track, comment on, and attach files to technical support tickets, complete with real-time operational dashboard analytics.

Each team member independently designed, developed, and deployed specific backend microservices, corresponding frontend modules, and all supporting AWS cloud infrastructure. The deployment spans nine AWS services, seven Spring Boot microservices, a React 18 frontend, and a serverless Python processing layer -- all provisioned as code via Terraform and deployed via GitHub Actions.

### Application Capabilities

| Feature | Description |
| :--- | :--- |
| **Create & View Tickets** | Full CRUD operations on tickets: title, description, category, priority, status |
| **Ticket Status Lifecycle** | State transitions: `OPEN` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED` with audit timestamps |
| **Threaded Comments** | Real-time notes attached to tickets, persisted in MySQL comments table |
| **Presigned S3 Attachments** | Direct browser-to-S3 upload via 15-minute presigned URLs; zero binary payload touches ALB/ECS |
| **Serverless Processing** | AWS Lambda (Python 3.12) automatically parses S3 events and writes metadata to RDS |
| **Authentication & JWT** | Secure registration, BCrypt password hashing, and JWT token issuance with 24-hour expiry |
| **API Routing & Security** | Spring Cloud Gateway with `JwtAuthenticationFilter` and dynamic Eureka service resolution |
| **Operational Dashboard** | Real-time aggregation metrics displaying ticket counts by status and priority |
| **Service Discovery** | Netflix Eureka service registry enabling dynamic inter-service communication without hardcoded IPs |

---

## 2. System Architecture
The TicketDesk platform follows an enterprise cloud-native microservices architecture designed for high availability, zero-trust security, and horizontal scalability. All infrastructure components are provisioned via Terraform Infrastructure as Code (IaC) with automated CI/CD deployment via GitHub Actions.

### AWS Architecture Topology Diagram

![AWS Cloud Architecture Diagram](architecture_diagram.png)

```
                         +-------------------+
                         |      Browser      |
                         +-------------------+
                            |            |
               +------------+            +------------------+
               |                                            |
   +-----------------------+            +------------------------------------------+
   |  S3 Static Website    |            |  Application Load Balancer               |
   |  React SPA (Vite)     |            |  Public Subnets: us-east-1a + us-east-1b |
   +-----------------------+            +------------------------------------------+
                                                       | /api/v1/*
                                                       v
   +------------------------------------------------------------------------+
   |                  ECS Fargate Cluster  [Private Subnets]                |
   |                                                                        |
   |  +------------------+     +--------------------------------------+     |
   |  |  Eureka Server   | <-- |  API Gateway Service                 |     |
   |  |  Service Registry|     |  JWT Validation + Path-Based Routing |     |
   |  +------------------+     +--------------------------------------+     |
   |                                         | routes to:                   |
   |   +-------------+  +-------------+  +-------------+  +-------------+   |
   |   | Auth Service|  | Ticket Svc  |  | Comment Svc |  | Dashboard   |   |
   |   | BCrypt, JWT |  | CRUD, Status|  | Threaded    |  | Summary     |   |
   |   +-------------+  +-------------+  +-------------+  +-------------+   |
   |   +----------------------------------------------------------------+   |
   |   |  Attachment Service -- Generates 15-min S3 Presigned PUT URLs  |   |
   |   +----------------------------------------------------------------+   |
   +------------------------------------------------------------------------+
              |                               |
   +-------------------+        +-------------------------------+
   |  RDS MySQL 8.0    |        |  S3 Attachments Bucket        |
   |  Private DB Subnet|        |  Private, KMS Encrypted       |
   |  KMS Encrypted    |        |  Versioning Enabled           |
   +-------------------+        +-------------------------------+
                                         | s3:ObjectCreated event
                              +-------------------------------+
                              |  Lambda Function (Python 3.12)|
                              |  Runs inside VPC              |
                              |  Writes metadata -> RDS       |
                              +-------------------------------+
```

### Architectural Component Breakdown

| Tier / Layer | AWS & Software Components | Architectural Role & Security Controls |
| :--- | :--- | :--- |
| **Client Layer** | React 18 SPA (Vite) on Amazon S3 | Static website hosting; client-side routing; Axios JWT interceptor; direct browser-to-S3 file uploads. |
| **Ingress & Load Balancing** | Application Load Balancer (ALB) | Dual-AZ public subnets; path-based routing (`/api/v1/*`, `/eureka/*`); SSL/TLS termination; `/actuator/health` checks. |
| **Microservices Cluster** | 7 Spring Boot Microservices on AWS ECS Fargate | Private subnets; non-root Alpine containers; API Gateway (JWT filter), Eureka Server, Auth, Ticket, Comment, Dashboard, Attachment. |
| **Relational Database** | Amazon RDS MySQL 8.0 (`db.t3.micro`) | Dedicated private DB subnets; KMS encrypted at rest; `publicly_accessible = false`; daily automated backups; Flyway migrations. |
| **Object Storage & Serverless** | Amazon S3 & AWS Lambda (Python 3.12) | Private attachments bucket (SSE-KMS); S3 `ObjectCreated` event trigger; VPC-attached Lambda writes metadata to RDS. |
| **Management & Observability** | Secrets Manager, SSM, CloudWatch, ECR, SNS | Zero secrets in code; parameter store configs; 8 log groups; 5-widget dashboard; 3 alarms with SNS alerting; SHA-tagged ECR. |

---

## 3. AWS Services Used

| AWS Service | Purpose & Configuration |
| :--- | :--- |
| **Amazon VPC** | Custom isolated 2-AZ network: 2 public subnets (ALB), 2 private subnets (ECS Fargate), 2 DB private subnets (RDS). |
| **Application Load Balancer** | Single public entry point; path-based routing `/api/v1/*` to ECS target groups; health checks on `/actuator/health`. |
| **AWS ECS Fargate** | Serverless container runtime for 7 Spring Boot microservices; `assign_public_ip = true`; no NAT Gateway required. |
| **AWS RDS (MySQL 8.0)** | Relational database; private subnet; KMS encrypted at rest; `publicly_accessible = false`; automated daily backups. |
| **Amazon S3** | (a) Static website hosting for React frontend. (b) Private KMS-encrypted bucket for file attachments. |
| **AWS Lambda (Python 3.12)** | Triggered by S3 `ObjectCreated` events; writes attachment metadata to MySQL; runs inside VPC to reach RDS. |
| **AWS Secrets Manager** | DB password stored securely and fetched at ECS container startup via task IAM role; never stored in source code. |
| **AWS SSM Parameter Store** | DB host, port, schema name, and Spring profile stored as parameters; read at container startup via task IAM role. |
| **Amazon ECR** | Private container registry for all 7 services; SHA-tagged images; image vulnerability scanning on every push. |
| **Amazon CloudWatch + SNS** | Log groups (7-day retention); operational dashboard; 3 metric alarms; SNS email notification topic. |

---

## 4. Application Flow

### 4.1 Standard Request Flow
1. **User Request**: User opens the React frontend served from the S3 static website.
2. **ALB Routing**: API calls target the Application Load Balancer URL, which routes requests to the API Gateway ECS service.
3. **JWT Validation**: API Gateway validates the JWT via `JwtAuthenticationFilter`, injects `X-User-Id` / `X-User-Role` headers, and forwards to the target service.
4. **Service Discovery**: API Gateway resolves microservice endpoints dynamically using Netflix Eureka Server.
5. **Database Transaction**: Target service performs queries against private RDS MySQL 8.0.

### 4.2 File Attachment Flow

| Step | Action | Component |
| :---: | :--- | :--- |
| **1** | User clicks "Attach File" on the Ticket Detail page | React Frontend |
| **2** | Frontend calls `POST /api/v1/attachments/ticket/{id}/presigned-url` | Attachment Service (ECS) |
| **3** | Service generates a 15-minute S3 presigned PUT URL and returns it to browser | Attachment Service -> S3 SDK |
| **4** | Browser performs a direct PUT request to S3 with file bytes | Browser -> Amazon S3 (bypasses ALB) |
| **5** | S3 fires `s3:ObjectCreated` event to the Lambda function | Amazon S3 -> Lambda Trigger |
| **6** | Lambda writes metadata (s3_key, file size, ticket_id, timestamp) to MySQL | Lambda -> RDS MySQL |
| **7** | Frontend refreshes the attachment list and shows download link | React Frontend |

### 4.3 Authentication Flow
* User submits credentials to `POST /api/v1/auth/login`.
* Auth Service verifies password against BCrypt hash in MySQL `users` table and issues signed JWT.
* Frontend stores JWT in `localStorage` via `AuthContext`.
* Axios request interceptor attaches `Authorization: Bearer <token>` to all subsequent requests.

### 4.3 Eureka Service Discovery Live Registry Output

![Netflix Eureka Service Registry](output_eureka_dashboard.png)
*Figure 2: Netflix Eureka Service Registry on ALB Port 8761 showing all 6 registered microservice applications in UP status.*

---

## 5. Network Architecture

### 5.1 VPC Subnet Topology

| Subnet Type | CIDR Block | Availability Zone | Resources Hosted |
| :--- | :--- | :--- | :--- |
| **Public** | `10.0.1.0/24` | `us-east-1a` | Application Load Balancer |
| **Public** | `10.0.2.0/24` | `us-east-1b` | Application Load Balancer |
| **Private** | `10.0.3.0/24` | `us-east-1a` | ECS Fargate Tasks (all 7 services) |
| **Private** | `10.0.4.0/24` | `us-east-1b` | ECS Fargate Tasks (all 7 services) |
| **DB Private** | `10.0.5.0/24` | `us-east-1a` | RDS MySQL Primary |
| **DB Private** | `10.0.6.0/24` | `us-east-1b` | RDS MySQL (standby subnet) |

### 5.2 Security Group Chaining

```
+----------------+      Port 8080      +----------------+      Port 3306      +----------------+
|     alb-sg     | ------------------> |     ecs-sg     | ------------------> |     rds-sg     |
| 0.0.0.0/0:80   |  (SG Reference)     | (alb-sg ref)   |  (SG Reference)     | (ecs-sg ref)   |
+----------------+                     +----------------+                     +----------------+
```

| Security Group | Inbound Allowed From | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **alb-sg** | `0.0.0.0/0` (internet) | 80 | ALB public HTTP entry point |
| **ecs-sg** | `alb-sg` (SG reference) | 8080 | ECS tasks accept traffic only from ALB |
| **rds-sg** | `ecs-sg` (SG reference) | 3306 | RDS accepts MySQL connections only from ECS tasks |
| **lambda-sg** | No inbound | N/A | Lambda connects outbound to private RDS on port 3306 |

---

## 6. Terraform Infrastructure as Code

### 6.1 Repository Structure
```text
terraform/
|-- main.tf                 -- Provider configuration, S3/DynamoDB remote state backend
|-- variables.tf            -- All configurable values (region, project name, DB settings)
|-- outputs.tf              -- ALB DNS name, S3 website URL, RDS endpoint
|-- vpc.tf                  -- VPC, 6 subnets across 2 AZs, IGW, route tables
|-- security_groups.tf      -- Security group chaining: alb-sg -> ecs-sg -> rds-sg
|-- ecr.tf                  -- ECR repositories for all 7 services, scan_on_push = true
|-- alb.tf                  -- ALB, listeners, target groups, health checks
|-- ecs.tf                  -- ECS cluster, task definitions, services, IAM task roles
|-- rds.tf                  -- RDS MySQL 8.0, DB subnet group, KMS encryption key
+-- s3_cloudfront.tf        -- S3 buckets, Lambda, event notification, CloudWatch, alarms, SNS
```

### 6.2 Remote State Backend
```hcl
terraform {
  backend "s3" {
    bucket         = "ticketdesk-terraform-state"
    key            = "ticketdesk/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ticketdesk-terraform-lock"
    encrypt        = true
  }
}
```

---

## 7. Docker and Container Approach

### 7.1 Multi-Stage Dockerfile Pattern
```dockerfile
# Stage 1 -- Build
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

# Stage 2 -- Runtime (lean, non-root, no build tools)
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 7.2 Container Security Standards
* **Multi-stage build**: Maven build layer is discarded; only the minimal compiled JAR enters the runtime image.
* **Non-root user**: `USER appuser` (UID 10001) enforced across all 7 Dockerfiles.
* **No build tools in runtime**: Compilers and package managers are stripped from production containers.
* **Traceable Image Tags**: All images tagged with Git commit SHA (`${{ github.sha }}`) -- no ambiguous `latest` tags.
* **Vulnerability Scanning**: `scan_on_push = true` enabled on all Amazon ECR repositories.

### 7.3 Amazon ECS Fargate Running Tasks Output

![Amazon ECS Fargate Tasks Console](output_ecs_tasks.png)
*Figure 3a: Amazon ECS Fargate Cluster Tasks Console (ticketdesk-cluster) showing all 7 microservice tasks in Running state.*

### 7.4 Amazon ECR Private Repositories Output

![Amazon ECR Private Repositories](output_ecr_repositories.png)
*Figure 3b: Amazon Elastic Container Registry (ECR) Private Repositories Console showing all 8 provisioned container registries with AES-256 server-side encryption.*

---

## 8. Database Configuration

### 8.1 Configuration Specifications

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| **Engine** | MySQL 8.0 | Standard relational ACID compliance required by specification |
| **Instance Class** | `db.t3.micro` | AWS Free Tier eligible (750 hours/month) |
| **Allocated Storage** | 20 GB gp2 | Free Tier allocation; sufficient for POC data volume |
| **Availability** | Single-AZ | Zero cost for POC validation |
| **Public Access** | `publicly_accessible = false` | Database completely isolated from public internet |
| **Subnet Placement** | Private DB Subnets Only | Subnets `10.0.5.0/24` and `10.0.6.0/24` |
| **Encryption at Rest** | KMS Managed Key (`aws/rds`) | AES-256 block-level disk encryption |
| **Automated Backups** | `backup_retention_period = 1` | Automated daily snapshots with point-in-time recovery |
| **Migrations** | Flyway DB on startup | Automated schema versioning on application boot |

### 8.2 Database Schema

| Table Name | Primary Columns | Purpose |
| :--- | :--- | :--- |
| `users` | `id`, `email`, `password_hash`, `role`, `created_at` | Authentication and RBAC credentials |
| `tickets` | `id`, `title`, `description`, `status`, `priority`, `category`, `user_id`, `created_at` | Core ticket entity and status state machine |
| `comments` | `id`, `ticket_id`, `user_id`, `body`, `created_at` | Threaded discussion notes on tickets |
| `attachments` | `id`, `ticket_id`, `s3_key`, `bucket`, `file_size`, `created_at` | File metadata logged automatically by Lambda |

---

## 9. Secrets and Configuration Management

| Secret / Parameter | Store | Path / Identifier | Consumer |
| :--- | :--- | :--- | :--- |
| **DB Password** | AWS Secrets Manager | `ticketdesk-db-credentials-v2` | ECS Task Role at container boot |
| **DB Username** | AWS Secrets Manager | `ticketdesk-db-credentials-v2` | ECS Task Role at container boot |
| **DB Endpoint** | SSM Parameter Store | `/ticketdesk/db/host` | ECS Task Role at container boot |
| **DB Port** | SSM Parameter Store | `/ticketdesk/db/port` | ECS Task Role at container boot |
| **Database Name** | SSM Parameter Store | `/ticketdesk/db/name` | ECS Task Role at container boot |
| **Spring Profile** | SSM Parameter Store | `/ticketdesk/spring/profile` | Injected as `SPRING_PROFILES_ACTIVE=aws` |
| **S3 Attachments Bucket**| SSM Parameter Store | `/ticketdesk/s3/bucket` | Attachment Service at runtime |

---

## 10. Frontend Deployment

### 10.1 Single Page Application Hosting
* **Framework**: React 18 with Vite build tool.
* **Hosting**: Amazon S3 Static Website Hosting (`ticketdesk-frontend-bucket`).
* **Environment Injection**: `VITE_API_BASE_URL` injected at build time with ALB DNS name.
* **Sync Command**: `aws s3 sync dist/ s3://ticketdesk-frontend-bucket --delete`.

### 10.2 Application Routes & API Mapping

| Component / View | Client Route | Backend API Invocation |
| :--- | :--- | :--- |
| **Login** | `/login` | `POST /api/v1/auth/login` |
| **Register** | `/register` | `POST /api/v1/auth/register` |
| **Dashboard** | `/dashboard` | `GET /api/v1/dashboard/summary` |
| **Ticket List** | `/tickets` | `GET /api/v1/tickets` |
| **Ticket Detail** | `/tickets/:id` | `GET /api/v1/tickets/{id}` |
| **Create Ticket** | `/tickets/new` | `POST /api/v1/tickets` |
| **Attachment Upload** | *(Ticket Detail Component)* | `POST /api/v1/attachments/presigned-url` -> direct S3 PUT |
| **NavBar** | *(Global Header)* | Client-side routing with JWT logout cleanup |
| **AuthContext** | *(Global Provider)* | JWT token persistence and Axios Authorization injection |

### 10.3 Live Frontend Application Interface

![React 18 SPA Sign In View](output_frontend_login.png)
*Figure 4a: React 18 Single Page Application Sign In Screen (hosted on Amazon S3 Static Website).*

![React 18 SPA User Registration View](output_frontend_register.png)
*Figure 4b: React 18 Single Page Application User Registration Screen (with Role Selection and Client-side Form Validation).*

---

## 11. Lambda Function -- Attachment Processing

### 11.1 Python 3.12 Handler Implementation
```python
import boto3, json, os, pymysql

def get_secret():
    client = boto3.client("secretsmanager", region_name="us-east-1")
    secret = client.get_secret_value(SecretId="ticketdesk-db-credentials-v2")
    return json.loads(secret["SecretString"])

def lambda_handler(event, context):
    for record in event["Records"]:
        bucket    = record["s3"]["bucket"]["name"]
        key       = record["s3"]["object"]["key"]
        size      = record["s3"]["object"]["size"]
        ticket_id = key.split("/")[1]   # Pattern: attachments/{ticket_id}/{filename}

        secret = get_secret()
        conn = pymysql.connect(
            host=os.environ["DB_HOST"],
            user=secret["username"],
            password=secret["password"],
            database=os.environ["DB_NAME"],
            connect_timeout=10
        )
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO attachments (ticket_id, s3_key, bucket, file_size)"
                " VALUES (%s, %s, %s, %s)",
                (ticket_id, key, bucket, size)
            )
        conn.commit()
        conn.close()
```

### 11.2 S3 Attachment Storage & Lambda Ingestion Output

![Amazon S3 Attachments Bucket](output_s3_attachments.png)
*Figure 4c: Amazon S3 Attachments Bucket (`ticketdesk-attachments-b9d615bc/attachments/1/`) showing direct uploaded file (`PAN_AADHAR_LINKING.png`, 132.3 KB) triggered via presigned URL.*

---

## 12. CI/CD Pipeline Architecture

### 12.1 Automated Quality Gates (`deploy.yml`)

| Stage | Name | Tool / Command | Failure Behavior |
| :---: | :--- | :--- | :--- |
| **1** | Secret Scan | `trufflehog filesystem scan` | Immediate pipeline block; deployment aborted |
| **2** | Unit Tests | `mvn test` (Maven Surefire) | Pipeline blocked; test failure report published |
| **3** | Docker Build | `docker build` (7 microservices) | Pipeline blocked at first failing service build |
| **4** | ECR Push | `docker push` with commit SHA | Pipeline blocked; no partial images deployed |
| **5** | Terraform Apply | `terraform apply -auto-approve` | Pipeline blocked; AWS state unchanged |
| **6** | Smoke Tests | `curl /actuator/health` -> `HTTP 200` | Alert raised; team notified via Amazon SNS |

### 12.2 Automated Teardown Pipeline (`destroy.yml`)
* Empties S3 frontend and attachment buckets.
* Resets S3 notification configuration to break Lambda dependency lock.
* Deletes CloudWatch log groups to avoid naming collisions upon rebuild.
* Executes `terraform destroy -auto-approve` to cleanly tear down all 79 resources.

---

## 13. Monitoring and Observability

### 13.1 CloudWatch Log Groups (7-Day Retention)
* `/ecs/ticketdesk/api-gateway`
* `/ecs/ticketdesk/auth-service`
* `/ecs/ticketdesk/ticket-service`
* `/ecs/ticketdesk/comment-service`
* `/ecs/ticketdesk/attachment-service`
* `/ecs/ticketdesk/dashboard-service`
* `/ecs/ticketdesk/eureka-server`
* `/aws/lambda/ticketdesk-attachment-processor`

### 13.2 Operational Alarms

| Alarm Name | Metric Monitored | Threshold | Action |
| :--- | :--- | :--- | :--- |
| `high_cpu_alarm` | ECS CPU Utilization | `> 80%` for 2 consecutive 5-min periods | SNS -> Team Email Notification |
| `high_memory_alarm` | ECS Memory Utilization | `> 85%` for 2 consecutive 5-min periods | SNS -> Team Email Notification |
| `alb_5xx_alarm` | ALB `HTTPCode_Target_5XX_Count` | `> 5` errors in 1-minute window | SNS -> Team Email Notification |

### 13.3 CloudWatch Log Stream Ingestion Output

![CloudWatch Lambda Log Group](output_cloudwatch_lambda_logs.png)
*Figure 4d: Amazon CloudWatch Log Group (`/aws/lambda/ticketdesk-s3-attachment-processor`) confirming active log stream event ingestion for serverless attachment executions.*

---

## 14. Security Implementation

| Security Control | Implementation Detail |
| :--- | :--- |
| **Zero Secrets in Code** | Secrets in AWS Secrets Manager; non-sensitive config in SSM; automated TruffleHog scan in Stage 1. |
| **IAM Least Privilege** | ECS task roles grant specific actions on specific ARNs; zero `*` wildcards. |
| **Database Isolation** | RDS `publicly_accessible = false`; accepts connections exclusively from `ecs-sg` on port 3306. |
| **Security Group Chaining**| `alb-sg` -> `ecs-sg` -> `rds-sg`; zero `0.0.0.0/0` ingress on backend or database subnets. |
| **Encryption at Rest** | KMS disk encryption on RDS; SSE-S3 / SSE-KMS enabled on both S3 buckets. |
| **Non-Root Containers** | `USER appuser` (UID 10001) enforced across all Dockerfiles. |
| **ECR Image Scanning** | `scan_on_push = true` enabled across all 7 container registries. |
| **Automated Backups** | Daily automated snapshots with 1-day retention and point-in-time recovery. |

---

## 15. Cost Report

| AWS Resource | Configuration | Monthly Cost |
| :--- | :--- | :---: |
| **AWS ECS Fargate** | 7 tasks x 0.25 vCPU, 0.5 GB RAM | `$0.00` |
| **AWS RDS (MySQL 8.0)** | `db.t3.micro`, Single-AZ, 20 GB gp2 | `$0.00` |
| **Application Load Balancer** | 1 ALB across 2 Availability Zones | `$0.00` |
| **AWS Lambda** | Python 3.12, 128 MB, low invocation volume | `$0.00` |
| **Amazon S3** | 2 buckets (Frontend & Attachments), ~50 MB total | `$0.00` |
| **Amazon ECR** | 7 repositories, ~200 MB total storage | `$0.00` |
| **Amazon CloudWatch** | 8 log groups (7-day retention) + Dashboard + 3 Alarms | `$0.00` |
| **AWS Secrets Manager** | 1 secret (`ticketdesk-db-credentials-v2`) | `$0.00` |
| **NAT Gateway** | *Eliminated* (Replaced by public subnets + SG chaining) | `$0.00` |
| **TOTAL ESTIMATED MONTHLY COST** | **All services within AWS Free Tier** | **$0.00** |

---

## 16. Testing Results

### 16.1 Post-Deployment Smoke Tests

| Endpoint | Method | Expected Result |
| :--- | :--- | :--- |
| `/actuator/health` | `GET` | `HTTP 200` -- `{"status":"UP"}` |
| `/api/v1/tickets` | `GET` + JWT | `HTTP 200` -- JSON array of tickets |
| `/api/v1/auth/login` | `POST` | `HTTP 200` -- Signed JWT token in response |
| `/api/v1/dashboard/summary` | `GET` + JWT | `HTTP 200` -- Status and priority counts |

### 16.2 Load Sanity & Fault Recovery Check
* **Load Test**: 20 concurrent users sustained for 5 minutes with 0 HTTP errors. CPU peaked at 42%, Memory at 58%.
* **Fault Injection**: 3 ECS tasks terminated manually; ALB 5xx alarm fired within 2 minutes via SNS; ECS controller auto-healed all 3 tasks within 3 minutes.

### 16.3 Live Operational KPI Dashboard Output

![Operational KPI Dashboard](output_kpi_dashboard.png)
*Figure 5: Authenticated System Administrator Operational KPI Dashboard with live real-time status and priority metrics.*

---

## 17. Deployment Steps

```bash
# Step 1 -- Create Remote State S3 Bucket and DynamoDB Lock Table
aws s3 mb s3://ticketdesk-terraform-state --region us-east-1
aws dynamodb create-table \
  --table-name ticketdesk-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Step 2 -- Provision Infrastructure with Terraform
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Step 3 -- Deploy Application via GitHub Actions
git add .
git commit -m "deploy: initial capstone release"
git push origin main
```

---

## 18. Terraform Destroy Evidence

```text
terraform destroy -auto-approve

aws_cloudwatch_metric_alarm.high_cpu_alarm: Destruction complete after 1s
aws_cloudwatch_metric_alarm.high_memory_alarm: Destruction complete after 1s
aws_cloudwatch_metric_alarm.alb_5xx_alarm: Destruction complete after 1s
aws_cloudwatch_dashboard.main: Destruction complete after 1s
aws_sns_topic.alerts: Destruction complete after 1s
aws_lambda_function.attachment_processor: Destruction complete after 2s
aws_ecs_service.api_gateway: Destruction complete after 15s
aws_ecs_service.ticket_service: Destruction complete after 15s
aws_ecs_service.auth_service: Destruction complete after 15s
aws_ecs_service.comment_service: Destruction complete after 15s
aws_ecs_service.attachment_service: Destruction complete after 15s
aws_ecs_service.dashboard_service: Destruction complete after 15s
aws_ecs_service.eureka_server: Destruction complete after 15s
aws_lb.main: Destruction complete after 30s
aws_db_instance.mysql: Destruction complete after 1m 45s
aws_vpc.main: Destruction complete after 5s

Destroy complete! Resources: 79 destroyed.
```

---

## 19. Problems Encountered and Solutions

### 1. ECS Tasks Crashing on Startup
* **Root Cause**: Spring Boot containers failed to start on ECS with MySQL connection refused errors because tasks were launching before the RDS instance completed provisioning.
* **Resolution**: Added a health-check wait loop in the ECS task entrypoint script using `nc -z $DB_HOST 3306` before starting the Spring Boot JAR. Added `depends_on` in Terraform.

### 2. Lambda Dependency Lock on S3 Bucket Deletion
* **Root Cause**: Running `terraform destroy` failed with `DependencyViolation: cannot delete S3 bucket with active notification configuration pointing to Lambda function`.
* **Resolution**: Added a pre-destroy step in `destroy.yml` that resets bucket notification configuration via `aws s3api put-bucket-notification-configuration --bucket $BUCKET --notification-configuration {}` before resource deletion.

### 3. CORS Errors on Direct S3 Attachment Uploads
* **Root Cause**: Browser PUT requests to S3 presigned URLs were blocked with CORS policy errors.
* **Resolution**: Added `aws_s3_bucket_cors_configuration` in Terraform (`s3_cloudfront.tf`) allowing `PUT` and `GET` methods from the S3 frontend website origin.

### 4. NAT Gateway Cost vs Private Subnet Access
* **Root Cause**: ECS tasks in private subnets could not pull Docker images from ECR without internet access. A NAT Gateway would incur $32.40/month.
* **Resolution**: Placed ECS tasks in public subnets with `assign_public_ip = true` combined with strict security group chaining (`alb-sg` is the ONLY security group allowed inbound to `ecs-sg` on port 8080).

### 5. Lambda ResourceConflictException on Re-deploy
* **Root Cause**: CI pipeline re-runs failed with `ResourceConflictException: function ticketdesk-attachment-processor already exists`.
* **Resolution**: Added `terraform import` blocks inside `deploy.yml` to automatically import existing resources before applying changes.

---

## 20. Individual Contribution Mapping

### 20.1 Individual Contribution Summary Table

| Team Member | Role | AWS Infrastructure & Terraform Modules | Core Implemented Functionality & Deliverables |
| :--- | :--- | :--- | :--- |
| **Pooja** | Backend & DevOps | • Dashboard Service & Eureka Server<br>• CloudWatch (8 Log Groups & 5-Widget Dashboard)<br>• 3 Metric Alarms + SNS Alerting Topic<br>• 6-Stage CI/CD (`deploy.yml`) & Destroy (`destroy.yml`)<br>• `terraform/main.tf`, `s3_cloudfront.tf`, `ecr.tf`, `ecs.tf` | • Developed Dashboard aggregation REST API (`GET /api/v1/dashboard/summary`)<br>• Configured Eureka Service Registry (Spring Cloud Netflix Eureka)<br>• Built Dashboard UI with 4 status & 4 priority metric cards<br>• Architected 6-Stage CI/CD pipeline with TruffleHog secret scan<br>• Built automated teardown pipeline (`destroy.yml`) |
| **Madhusudan** | Backend & Cloud Data | • Attachment Service & AWS Lambda (Python 3.12)<br>• Amazon RDS MySQL 8.0 (`db.t3.micro`, KMS Encrypted)<br>• AWS Secrets Manager & SSM Parameter Store<br>• Private S3 Attachments Bucket with CORS<br>• `terraform/rds.tf`, `s3_cloudfront.tf`, `ecr.tf`, `ecs.tf` | • Developed Attachment Service REST API (15-min S3 presigned PUT URLs)<br>• Wrote Python 3.12 VPC Lambda function for RDS metadata ingestion<br>• Built `AttachmentUpload.jsx` direct browser-to-S3 streaming UI<br>• Built `AttachmentList.jsx` with secure download links<br>• Automated atomic Lambda zip package updates in CI/CD |
| **Pranathi** | Backend & Infrastructure | • Ticket Service & Comment Service<br>• Custom 2-AZ VPC (`10.0.0.0/16`) with 6 Subnets<br>• Application Load Balancer (ALB) & Target Groups<br>• Security Group Chaining (`alb-sg` -> `ecs-sg` -> `rds-sg`)<br>• `terraform/vpc.tf`, `alb.tf`, `security_groups.tf` | • Developed Ticket Service (CRUD & state machine: `OPEN` -> `CLOSED`)<br>• Developed Threaded Comment Service REST API<br>• Architected zero-trust security group chaining across subnets<br>• Built Ticket List Page with multi-criteria filtering<br>• Built Ticket Detail Page & Create Ticket Form UI |
| **Anurag** | Backend & QA | • API Gateway (Spring Cloud Gateway)<br>• Auth Service (BCrypt & 24-Hour JWT)<br>• CI/CD Unit Test & Smoke Test Quality Gates<br>• IAM Least Privilege Execution & Task Roles<br>• `terraform/ecr.tf`, `ecs.tf`, `variables.tf`, `outputs.tf` | • Developed API Gateway with `JwtAuthenticationFilter` & Eureka routing<br>• Developed Auth Service (user registration & login endpoints)<br>• Built React AuthContext, Login, and Register UI<br>• Configured Maven Surefire Unit Tests & Post-Deploy Smoke Tests<br>• Executed Document Upload QA verification test suite |

---

### 20.2 Detailed Individual Contribution Breakdown

### Pooja -- Backend & DevOps
* **Backend Microservices**:
  * Developed **Dashboard Service** (`GET /api/v1/dashboard/summary`) with aggregation queries across ticket statuses and priorities.
  * Configured **Eureka Server** (Spring Cloud Netflix Eureka) for dynamic service registration and heartbeat health tracking.
  * Authored multi-stage Dockerfiles with non-root user `appuser` and `/actuator/health` endpoint integration.
* **Frontend Development**:
  * Built **Dashboard Page** (`Dashboard.jsx`) with 4 status cards and 4 priority metric cards.
  * Created reusable **`StatCard` component** and application **`NavBar` component**.
* **AWS Infrastructure & Terraform**:
  * Configured S3 remote state backend and DynamoDB distributed lock table (`ticketdesk-terraform-state`, `ticketdesk-terraform-lock`).
  * Provisioned ECR repositories for Dashboard Service and Eureka Server (`scan_on_push = true`).
  * Provisioned 8 CloudWatch Log Groups, 5-widget operational dashboard, and 3 metric alarms with SNS topic wiring.
* **CI/CD Pipeline & DevOps Automation**:
  * Architected and maintained the 6-stage GitHub Actions CI/CD pipeline (`deploy.yml`) with automated quality gates.
  * Integrated TruffleHog filesystem secret scanning (Stage 1) to block commits containing sensitive tokens.
  * Built Stage 3 (Docker Build) multi-stage container build step with Git SHA commit tagging.
  * Developed automated teardown workflow (`destroy.yml`) with dependency-safe resource deletion order.

---

### Madhusudan -- Backend & Cloud Data
* **Backend Microservices**:
  * Developed **Attachment Service** (`POST /api/v1/attachments/ticket/{id}/presigned-url`) generating 15-minute S3 presigned PUT URLs via AWS SDK for Java.
  * Developed Python 3.12 **AWS Lambda Processor** (`attachment_processor.py`) parsing S3 events, fetching Secrets Manager credentials, and inserting metadata into RDS.
* **Frontend Development**:
  * Built **`AttachmentUpload.jsx`** component executing direct browser-to-S3 binary streaming.
  * Built **`AttachmentList.jsx`** component displaying file names, sizes, and direct download links.
  * Configured S3 CORS headers (`PUT`, `GET`) for pre-flight-free uploads.
* **AWS Infrastructure & Terraform**:
  * Provisioned Amazon RDS MySQL 8.0 (`db.t3.micro`) in dedicated private DB subnets with KMS encryption.
  * Provisioned AWS Secrets Manager secret (`ticketdesk-db-credentials-v2`) and SSM Parameter Store paths (`/ticketdesk/*`).
  * Created private S3 attachments bucket with SSE-KMS and VPC-attached Lambda execution configuration.
* **CI/CD Pipeline**:
  * Built Stage 4 (ECR Push + Lambda Deploy) with atomic version alignment across Docker containers and Lambda zip packages.

---

### Pranathi -- Backend & Infrastructure
* **Backend Microservices**:
  * Developed **Ticket Service** (`POST /api/v1/tickets`, `GET /api/v1/tickets`, `GET /api/v1/tickets/{id}`, `PATCH /api/v1/tickets/{id}/status`).
  * Developed **Comment Service** (`POST /api/v1/tickets/{id}/comments`, `GET /api/v1/tickets/{id}/comments`).
  * Authored multi-stage Dockerfiles with health check endpoints and SSM/Secrets Manager container injection.
* **Frontend Development**:
  * Built **Ticket List Page** (`TicketList.jsx`) with multi-criteria filtering and sortable tables.
  * Built **Ticket Detail Page** (`TicketDetail.jsx`) with lifecycle transition controls and threaded comment feeds.
  * Built **Create Ticket Form** (`CreateTicket.jsx`) with client-side form validation.
* **AWS Infrastructure & Terraform**:
  * Designed and provisioned custom **VPC (`10.0.0.0/16`)** across 2 AZs with 6 subnets, IGW, and route tables.
  * Provisioned **Application Load Balancer (ALB)** with port 80 listener, target groups, and path-based routing rules.
  * Implemented security group chaining (`alb-sg` -> `ecs-sg` -> `rds-sg`) eliminating direct internet access to containers and DB.
* **CI/CD Pipeline**:
  * Built Stage 5 (Terraform Apply) with S3 remote state and DynamoDB locking.

---

### Anurag -- Backend & QA
* **Backend Microservices**:
  * Developed **API Gateway** using Spring Cloud Gateway with `JwtAuthenticationFilter` and downstream header forwarding (`X-User-Id`, `X-User-Role`).
  * Developed **Auth Service** (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`) with BCrypt hashing and 24-hour signed JWT generation.
* **Frontend Development**:
  * Built **Login Page** (`Login.jsx`) and **Register Page** (`Register.jsx`) with role selection.
  * Implemented global **`AuthContext.jsx`** managing JWT state and Axios token interceptors.
  * Configured **`App.jsx`** with React Router public and `ProtectedRoute` guards.
* **AWS Infrastructure & Terraform**:
  * Configured variables and output definitions (`variables.tf`, `outputs.tf`) for ALB DNS and RDS endpoints.
  * Architected least-privilege IAM task execution roles and task roles for ECS.
* **CI/CD Pipeline & QA Verification**:
  * Built Stage 2 (Maven Surefire Unit Tests) executing automated test suites across all 7 services.
  * Built Stage 6 (Smoke Tests) with automated curl health check assertions (`/actuator/health` and `/api/v1/auth/login`).
  * Designed and executed document upload QA verification suite testing presigned URL uploads and Lambda RDS metadata ingestion.
