# GitHub Actions - Serverless Deployment Setup

This GitHub Action automatically deploys your CodeXAI backend to AWS Lambda using the Serverless Framework.

## What It Does

- Triggers on every push to `main` or `master` branch
- Installs dependencies
- Configures AWS credentials from GitHub Secrets
- Runs `serverless deploy` to deploy to production

## Setup Instructions

### 1. Add GitHub Secrets

Go to your GitHub repository **Settings** → **Secrets and variables** → **Actions** and add these secrets:

#### Required Secrets:

| Secret Name | Description | How to Get |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | [AWS IAM Console](https://console.aws.amazon.com/iam/) → Users → Your User → Access Keys → Create New Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | Same as above |
| `SERVERLESS_ACCESS_KEY` | Serverless Framework Token | [Serverless Dashboard](https://app.serverless.com/) → Settings → API Tokens |

### 2. Create AWS IAM User (Recommended)

It's best practice to create a dedicated IAM user for deployments:

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. Name it something like `github-deployer`
4. Attach policy: **AWSLambdaFullAccess**, **AmazonAPIGatewayFullAccess**, **AmazonDynamoDBFullAccess**, **IAMFullAccess**
5. Create Access Keys and use them in GitHub Secrets

### 3. Get Serverless Access Key

1. Go to [Serverless Dashboard](https://app.serverless.com/)
2. Login with your Serverless account (or create one)
3. Go to **Settings** → **Org/App Settings** → **API Tokens**
4. Create a new API token
5. Copy and add it as `SERVERLESS_ACCESS_KEY` in GitHub Secrets

### 4. Verify Configuration

Your `serverless.yml` is already configured with:
- **Organization**: `thevisionariesclub`
- **App**: `codexai`
- **Service**: `codexai-backend`
- **Region**: `ap-south-1`
- **Runtime**: `Node.js 20.x`

## Deployment Workflow

Every time you push to `main` or `master`:

1. ✅ Code is checked out
2. ✅ Node.js 20 is set up
3. ✅ Dependencies are installed
4. ✅ AWS credentials are configured
5. ✅ `serverless deploy --stage production` runs
6. ✅ Lambda functions and API Gateway endpoints are updated

## Monitoring Deployments

1. Go to your GitHub repository
2. Click **Actions** tab
3. View deployment logs in real-time
4. Check status on **Serverless Dashboard** for more details

## Troubleshooting

### Deployment Failed: "Invalid Access Key"
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
- Ensure the IAM user has necessary permissions

### Deployment Failed: "Unauthorized"
- Check `SERVERLESS_ACCESS_KEY` is correct
- Verify organization name and app name in `serverless.yml`

### Deployment Failed: "No such file or directory"
- Ensure `package.json` and `serverless.yml` are in the root directory
- Check that dependencies installed successfully

## Manual Deployment (if needed)

```bash
# Deploy manually
npm run deploy

# Deploy to specific stage
serverless deploy --stage staging
```

## Environment Variables

The workflow automatically handles:
- AWS credentials from GitHub Secrets
- Serverless Framework configuration from `serverless.yml`
- Region: `ap-south-1`
- Stage: `production`

If you need different stages, modify the `deploy.yml` file.

## Security Best Practices

✅ Use a dedicated IAM user for deployments
✅ Rotate access keys regularly
✅ Use GitHub OIDC Provider (optional, more secure)
✅ Never commit secrets to the repository
✅ Review deployment logs regularly

## Questions?

For issues with Serverless Framework, visit: https://www.serverless.com/framework/docs
For AWS issues, visit: https://docs.aws.amazon.com/
