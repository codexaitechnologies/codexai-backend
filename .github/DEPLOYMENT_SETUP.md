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

| Secret Name | Description | Value |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | Get from [AWS IAM](https://console.aws.amazon.com/iam/) |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | Get from [AWS IAM](https://console.aws.amazon.com/iam/) |
| `GMAIL_USER` | Gmail account for sending emails | `codexaitechnologies@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail App Password | From [Google Account Settings](https://myaccount.google.com/apppasswords) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From [Google Cloud Console](https://console.cloud.google.com/) |
| `RAZORPAY_KEY_ID` | Razorpay API Key | From [Razorpay Dashboard](https://dashboard.razorpay.com/) |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | From [Razorpay Dashboard](https://dashboard.razorpay.com/) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | From [Razorpay Dashboard](https://dashboard.razorpay.com/) |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | From [AWS Cognito Console](https://console.aws.amazon.com/cognito/) |
| `COGNITO_CLIENT_ID` | AWS Cognito Client ID | From [AWS Cognito Console](https://console.aws.amazon.com/cognito/) |
| `SUPPORT_EMAIL` | Support email address | Your support email (optional, defaults to support@codexai.com) |

### 2. Create AWS IAM User (Recommended)

It's best practice to create a dedicated IAM user for deployments with minimal required permissions:

**Steps**:
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. Name: `github-deployer`
4. **Create user without permission policy first**
5. Click → **Add permissions** → **Create inline policy**
6. Use this JSON policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:PassRole",
        "iam:DeleteRolePolicy",
        "s3:*",
        "cloudformation:*",
        "logs:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    }
  ]
}
```

7. Click **Review policy** → **Create policy**
8. Go back to user → **Create access key**
9. Select **Other** → **Next**
10. Copy Access Key ID and Secret Access Key
11. Add them to GitHub Secrets as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

Your `serverless.yml` is already configured with:
- **Organization**: `thevisionariesclub`
- **App**: `codexai`
- **Service**: `codexai-backend`
- **Region**: `ap-south-1`
- **Runtime**: `Node.js 20.x`

## Important Configuration Changes

### Serverless Framework Organization Disabled for CI/CD

The `serverless.yml` has `org` and `app` commented out:

```yaml
# Commented out for CI/CD - we authenticate using AWS credentials
# org: thevisionariesclub
# app: codexai
```

**Why?** In CI/CD environments, we authenticate using AWS credentials only. The org/app settings require Serverless Dashboard authentication which adds unnecessary complexity.

**Local Development**: If you want to use Serverless Dashboard locally, uncomment these lines and follow Serverless Dashboard setup.

**CI/CD (GitHub Actions)**: Stays commented out - we use AWS IAM credentials which is simpler and more secure for automated deployments.

Before pushing code, test deployment locally:

```bash
# 1. Install serverless framework
npm install -g serverless

# 2. Configure AWS credentials
export AWS_ACCESS_KEY_ID=your_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=ap-south-1

# 3. Create .env file with required variables
cp .env.example .env
# Edit .env and add all required values

# 4. Test deployment (dry-run with verbose output)
serverless deploy --stage production --verbose

# 5. Check what was deployed
serverless info --stage production

# 6. View logs
serverless logs -f your_function_name --stage production
```

## Deployment Workflow

Every time you push to `main` or `master`:

1. ✅ Code is checked out
2. ✅ Node.js 20 is set up
3. ✅ Dependencies are installed (with npm ci for exact versions)
4. ✅ `.env` file is created with secrets from GitHub Secrets
5. ✅ AWS credentials are configured
6. ✅ AWS credentials are verified with `aws sts get-caller-identity`
7. ✅ `serverless deploy --stage production` runs with verbose logging
8. ✅ Deployment status is verified
9. ✅ Lambda functions and API Gateway endpoints are updated on AWS

## Quick Setup Checklist

- [ ] Create GitHub Secrets with all values from the table above
- [ ] Create AWS IAM user `github-deployer` with deployment policy
- [ ] Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to GitHub Secrets
- [ ] Test locally with `serverless deploy --stage production --verbose`
- [ ] Push to `main` or `master` branch
- [ ] Check GitHub Actions tab for deployment status
- [ ] Verify in AWS Lambda console that functions are deployed

## Monitoring Deployments

1. Go to your GitHub repository
2. Click **Actions** tab
3. View deployment logs in real-time
4. Check status on **Serverless Dashboard** for more details

## Troubleshooting

### Authentication Failed Error
**Error**: `Error: Authentication failed.`

**Solutions**:
1. ✅ Verify all AWS secrets are added correctly
   ```bash
   # Verify AWS credentials locally
   aws configure list
   ```

2. ✅ Ensure AWS IAM user has correct permissions:
   - `AWSLambdaFullAccess`
   - `AmazonAPIGatewayFullAccess`
   - `AmazonDynamoDBFullAccess`
   - `IAMFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFormation` permissions

3. ✅ Check GitHub Secrets are correctly set:
   - Go to Settings → Secrets and variables → Actions
   - Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are present
   - Regenerate keys if needed

4. ✅ Test AWS credentials locally:
   ```bash
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   aws sts get-caller-identity
   ```

### .env file not found
**Error**: `DOTENV: Could not find .env file.`

**Solution**: This is normal and non-critical. The workflow creates the .env file dynamically from GitHub Secrets.

### Missing environment variables
**Error**: `Undefined property '${{env:VARIABLE_NAME}}'`

**Solution**: Add the required secret to GitHub Secrets (see table above)

### Deployment timeout
**Solution**: Check if your Lambda functions are trying to access resources that don't exist or are misconfigured.

### "Stack already exists"
**Solution**: This is normal for subsequent deployments. Serverless will update the existing stack.

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
