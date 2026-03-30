# Gmail Setup Guide - Using Your Personal Gmail to Send Emails

This guide helps you set up your personal Gmail account to send CodexAI welcome emails instead of using AWS SES.

## Benefits Over AWS SES

✅ **No sandbox restrictions** - Send to any email address immediately
✅ **No verification process** - Just use your own Gmail account
✅ **Free** - Gmail's free tier supports plenty of email sends
✅ **Easier setup** - No AWS console configuration needed
✅ **Personalized sender** - Emails come from your actual Gmail address
✅ **Good for development** - Perfect for testing and small-scale deployments

## Step 1: Enable 2-Factor Authentication on Your Gmail Account

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Look for "2-Step Verification" in the left sidebar
3. Click on it and follow Google's instructions to enable 2FA
4. You'll need a phone to receive verification codes

## Step 2: Create a Gmail App Password

1. After enabling 2FA, go back to [Google Account Security Settings](https://myaccount.google.com/security)
2. Look for "App passwords" (only visible if 2FA is enabled)
3. Select:
   - **App**: Mail
   - **Device**: Windows Computer (or your OS)
4. Click "Generate"
5. Google will show a **16-character password**
6. **Copy this password** - you'll need it next

**IMPORTANT**: This is different from your Gmail password. Keep it safe!

## Step 3: Set Environment Variables

### Option A: Using `.env` file (Development)

Create a `.env` file in the project root:

```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

**Replace with your actual:**
- `GMAIL_USER`: Your full Gmail address (e.g., adarshchaudhary03@gmail.com)
- `GMAIL_APP_PASSWORD`: The 16-character password from Step 2 (spaces can be included or removed)

### Option B: Using Terminal (Development)

```bash
export GMAIL_USER="your-email@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

Then deploy:
```bash
sls deploy
```

### Option C: AWS Secrets Manager (Production - Recommended)

1. Store credentials in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name codexai/gmail \
  --secret-string "{\"GMAIL_USER\":\"your-email@gmail.com\",\"GMAIL_APP_PASSWORD\":\"xxxx xxxx xxxx xxxx\"}" \
  --region ap-south-1
```

2. Update Lambda function to retrieve from Secrets Manager (advanced setup)

### Option D: GitHub Actions / CI/CD Pipeline

Set as repository secrets in GitHub:

```bash
GitHub Settings > Secrets > New repository secret
- Name: GMAIL_USER
- Value: your-email@gmail.com

GitHub Settings > Secrets > New repository secret
- Name: GMAIL_APP_PASSWORD
- Value: xxxx xxxx xxxx xxxx
```

## Step 4: Install Dependencies

```bash
npm install
```

This installs `nodemailer` which is required for Gmail SMTP.

## Step 5: Deploy

```bash
# Deploy to AWS
sls deploy

# Or deploy to specific stage
sls deploy --stage prod
```

## Step 6: Test Email Sending

### Create a test user:

```bash
curl -X POST https://<api-id>.lambda-url.ap-south-1.on.aws/users \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phoneNumber": "+91-9876543210",
    "course": "Web Development",
    "brochureLink": "https://codexai.com/brochure.pdf"
  }'
```

Check that user's email for the welcome email!

### Using Postman:

1. Import `CodexAI_Backend_API.postman_collection.json`
2. Set variables:
   - `base_url`: Your deployed API URL
3. Run "Create User" request
4. Check the email inbox for the welcome email

## Troubleshooting

### Error: "Invalid login credentials"

**Cause**: Gmail credentials are wrong or app password not created

**Solution**:
1. Verify your Gmail address is correct
2. Make sure 2FA is enabled
3. Generate a new app password and try again

### Error: "Less secure apps not allowed"

**Cause**: Using your actual Gmail password instead of app password

**Solution**:
- Use the 16-character app password, not your Gmail password
- App passwords only work with 2FA enabled

### Error: "GMAIL_USER or GMAIL_APP_PASSWORD environment variables not found"

**Cause**: Environment variables not set during deployment

**Solution**:

```bash
# Make sure to set environment variables before deploying
export GMAIL_USER="your-email@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
sls deploy
```

Or in `serverless.yml`, use hardcoded values (not recommended):

```yaml
environment:
  GMAIL_USER: your-email@gmail.com
  GMAIL_APP_PASSWORD: xxxx xxxx xxxx xxxx
```

### Email not received

Check:
1. Email went to spam folder
2. Check CloudWatch logs: `serverless logs -f createUser --tail`
3. Verify environment variables are set: See logs for "GMAIL_USER" value
4. Check Gmail account: Is 2FA still enabled? App password still valid?

### Gmail Account Showing "Sign-in Blocked"

If you see alerts in your Gmail:

1. Go to [Gmail Security Alerts](https://myaccount.google.com/u/0/security?pli=1)
2. If you see "Unrecognized sign in attempt", click "This was me"
3. Gmail might allow access after confirmation

## Viewing Email Logs

```bash
# View all emails sent
serverless logs -f createUser --tail

# Filter for email-related logs
serverless logs -f createUser --tail | grep -i "email\|success"
```

## Email Sending Limits

**Gmail SMTP Limits:**
- **Free account**: ~500 emails per day
- **Google Workspace**: ~10,000 emails per day
- **Rate**: ~100 emails per minute

For production with higher volume, consider:
- AWS SES (1st 62k emails free, then $0.10 per 1000)
- SendGrid
- Mailgun
- AWS SES + Gmail hybrid approach

## Advanced: Rotating App Passwords

If you want to rotate credentials for security:

1. Generate a new app password in Google Account
2. Update environment variables
3. Delete old app password in Google Account
4. Redeploy: `sls deploy`

## Security Best Practices

✅ **Never commit credentials** to Git
✅ **Use environment variables** for secrets
✅ **Use `.gitignore`** to exclude `.env` files
✅ **Rotate passwords** periodically
✅ **Use different passwords** for different environments (dev, prod, staging)
✅ **Monitor Gmail account** for unusual activity
✅ **Use App Passwords** instead of account password

## What's Happening Behind the Scenes

When a user is created:

1. User data is saved to DynamoDB
2. `nodemailer` connects to Gmail's SMTP server
3. Email is composed from the template
4. Email is sent using your Gmail account
5. Response confirms email was sent
6. If email fails, user is still created (non-blocking)

## Switching Back to AWS SES

To switch back to SES later:

1. Install AWS SDK: `npm install aws-sdk`
2. Update `emailService.js` to use SES
3. Update `serverless.yml`:
   ```yaml
   environment:
     SES_FROM_EMAIL: noreply@codexai.com
   iam:
     statements:
       - ses:SendEmail
   ```
4. Deploy: `sls deploy`

## Support

For Gmail-related issues:
- Check [Gmail Help Center](https://support.google.com/mail)
- Review [Nodemailer Documentation](https://nodemailer.com)
- Check CloudWatch logs in AWS Console

For CodexAI specific issues:
- Check CloudWatch logs: `serverless logs -f createUser`
- Review Lambda error details in AWS Console

---

**You're all set!** Your CodexAI backend will now send welcome emails from your personal Gmail account. 🚀
