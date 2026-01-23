# Ecom Copilot — ChatGPT Handoff

## Repo root (local)
C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

## GitHub
Repo: https://github.com/branchtar/ecom-copilot  
Default working branch: develop  
Current feature branch (latest): feature/amazon-connect

## AWS App Runner (API)
Service: ecom-copilot-api-dev  
Region: us-east-1  
Source directory: api  
Build command: pip install -r requirements.txt  
Start command: python -m uvicorn server:app --host 0.0.0.0 --port 8080  
Port: 8080  
Swagger: https://<APP_RUNNER_SERVICE_URL>/docs  

IMPORTANT HISTORY: deploy failed when using python3 (python3 not found). Use python.

## Latest known local commands to resume
Open PowerShell:
Set-Location "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
git fetch --all --prune
git status

Continue feature branch:
git checkout feature/amazon-connect
git pull
git log --oneline -5

Switch to develop:
git checkout develop
git pull

## Backup (end of session)
git status
git add -A
git commit -m "Describe what changed"
git push

(First push of a new branch: git push -u origin feature/<name>)

## What we added so far (Amazon Connect)
- Added httpx + boto3 to api/requirements.txt
- Added endpoint: GET /api/integrations/amazon/start
  - Generates Seller Central consent URL
  - Needs env var AMAZON_SPAPI_APP_ID to return ok:true

## Next step (the real work)
1) Merge feature/amazon-connect -> develop (PR)
2) Confirm App Runner deploys develop
3) Add App Runner env vars:
   - AMAZON_SPAPI_APP_ID
   - AMAZON_SELLER_CENTRAL_BASE (optional)
   - AMAZON_SPAPI_REDIRECT_URI (for callback step)
4) Implement callback endpoint:
   - exchange spapi_oauth_code for refresh token
   - store refresh token securely (AWS Secrets Manager)
5) Wire UI button to start connect flow (calls /api/integrations/amazon/start)

## How to test cloud API
="https://<APP_RUNNER_SERVICE_URL>"
irm "/health"
irm "/api/integrations/amazon/start"