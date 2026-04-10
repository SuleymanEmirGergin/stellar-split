# AWS Deployment Guide

Deployment guide for the Repo Builder Agent when the target platform is **AWS**.

This guide covers a production-grade setup using ECS Fargate (containers), RDS (PostgreSQL), ElastiCache (Redis), ECR (container registry), ALB (load balancer), and Secrets Manager.

---

## 1. When to Choose AWS

| ✅ Good For | ❌ Not Ideal For |
|---|---|
| Production SaaS with compliance needs | MVPs and early-stage projects |
| Full infrastructure control | Teams without AWS / DevOps expertise |
| Enterprise customers requiring VPC | Projects where Railway/Render is sufficient |
| High-traffic, multi-region deployments | Tight budget (AWS overhead is higher) |
| SOC2, HIPAA, GDPR regulated workloads | Rapid prototyping |

---

## 2. Architecture Overview

```
                  ┌─────────────────────────────┐
Browser/Client    │     CloudFront (CDN)         │
                  └────────────┬────────────────┘
                               │
                  ┌────────────▼────────────────┐
                  │  ALB (Application Load      │
                  │  Balancer)                  │
                  └────────────┬────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌────────▼──────┐    ┌───────▼──────┐
   │ ECS Fargate │    │ ECS Fargate   │    │ ECS Fargate  │
   │ API Service │    │ Worker Service│    │ (future svc) │
   └──────┬──────┘    └────────┬──────┘    └──────────────┘
          │                    │
   ┌──────▼──────────────────▼───────────────────────┐
   │            Private VPC Subnet                    │
   │   ┌───────────┐    ┌──────────────────────────┐  │
   │   │ RDS       │    │ ElastiCache (Redis)       │  │
   │   │ PostgreSQL│    │ BullMQ + Cache            │  │
   │   │ Multi-AZ  │    └──────────────────────────┘  │
   │   └───────────┘                                  │
   └──────────────────────────────────────────────────┘
```

---

## 3. Generated Infrastructure Files

```
infra/
  aws/
    task-definition.api.json      ← ECS task definition for API
    task-definition.worker.json   ← ECS task definition for Worker
    ecs-service.api.json          ← ECS service config
    ecs-service.worker.json
  docker/
    Dockerfile.api
    Dockerfile.worker
.github/
  workflows/
    deploy-aws.yml                ← CI/CD pipeline
```

---

## 4. Dockerfile (Production — Non-Root)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/main"]
```

---

## 5. ECS Task Definition

```json
{
  "family": "api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/api:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:app/prod/DATABASE_URL" },
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:app/prod/JWT_SECRET" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:app/prod/REDIS_URL" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

---

## 6. Secrets Manager

**Never** use environment variables in ECS task definitions for secrets. Use AWS Secrets Manager:

```bash
# Create secret
aws secretsmanager create-secret \
  --name "app/prod/DATABASE_URL" \
  --secret-string "postgresql://user:pass@rds-endpoint:5432/dbname"

# Reference in task definition (see "secrets" above)
```

Secrets to store:
```
app/prod/DATABASE_URL
app/prod/REDIS_URL
app/prod/JWT_SECRET
app/prod/JWT_REFRESH_SECRET
app/prod/STRIPE_SECRET_KEY
app/prod/STRIPE_WEBHOOK_SECRET
app/prod/SENDGRID_API_KEY
app/prod/AWS_ACCESS_KEY_ID        ← for S3 access from app
app/prod/AWS_SECRET_ACCESS_KEY
```

---

## 7. CI/CD Workflow (GitHub Actions)

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: your-app-api
  ECS_CLUSTER: your-app-cluster
  ECS_SERVICE_API: api-service
  ECS_SERVICE_WORKER: worker-service

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --passWithNoTests
      - run: npm audit --audit-level=high

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push API image to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f infra/docker/Dockerfile.api \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster $ECS_CLUSTER \
            --task-definition api-migrate \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
            --wait-for-stop

      - name: Update ECS API service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE_API \
            --force-new-deployment

      - name: Update ECS Worker service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE_WORKER \
            --force-new-deployment

      - name: Wait for deployment to stabilize
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE_API $ECS_SERVICE_WORKER
```

---

## 8. Required AWS Resources

Provision these before first deployment:

| Resource | Purpose | Notes |
|---|---|---|
| **ECR Repository** | Docker image storage | One per service |
| **ECS Cluster** | Container orchestration | Fargate mode |
| **RDS PostgreSQL** | Primary database | Multi-AZ for production |
| **ElastiCache Redis** | Queue + cache | Cluster mode optional |
| **ALB** | Load balancer | With HTTPS listener |
| **ACM Certificate** | SSL/TLS for ALB | Auto-renewed |
| **Secrets Manager** | Secure credentials | Per secret, ~$0.40/mo |
| **CloudWatch Logs** | Application logging | Log groups per service |
| **VPC** | Network isolation | Private subnets for DB/Redis |
| **IAM Roles** | ECS permissions | `ecsTaskExecutionRole` + `ecsTaskRole` |

---

## 9. Cost Estimate (us-east-1)

| Component | Spec | Monthly Cost |
|---|---|---|
| ECS Fargate — API | 0.5 vCPU, 1GB, 1 task | ~$15 |
| ECS Fargate — Worker | 0.25 vCPU, 512MB, 1 task | ~$8 |
| RDS PostgreSQL | db.t3.micro, Multi-AZ | ~$50 |
| ElastiCache Redis | cache.t3.micro | ~$15 |
| ALB | 1 LCU average | ~$20 |
| ECR | 10GB storage | ~$1 |
| Secrets Manager | 5 secrets | ~$2 |
| CloudWatch Logs | 5GB/mo | ~$3 |
| **Total estimate** | | **~$114/mo** |

Scale vertically (larger instances) or horizontally (more tasks) as load grows.
