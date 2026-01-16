# Ecom Copilot

## Architecture (target)
- Frontend: React -> S3 + CloudFront
- Backend: FastAPI -> ECS Fargate (behind ALB)
- Auth: Cognito (JWT)
- Data: RDS Postgres
- Secrets: AWS Secrets Manager
- Logs: CloudWatch

## Environments
- local: dev on machine
- staging: develop branch deploys here
- production: main branch deploys here

## Repo layout
- ui-web/  (React)
- py/      (FastAPI)
- infra/   (CDK/Terraform later)
