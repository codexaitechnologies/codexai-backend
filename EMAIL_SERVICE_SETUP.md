# Email Service Setup Guide

## Overview

When a user is successfully created, the system automatically sends a professional welcome email with:
- Personalized greeting
- Course enrollment confirmation
- Course brochure link
- Feature highlights
- Formatted HTML and plain text versions

## Prerequisites

### AWS SES (Simple Email Service) Setup

1. **Verify Email Address/Domain in SES**
   ```bash
   aws ses verify-email-identity --email-address noreply@codexai.com --region ap-south-1
   # or
   aws ses verify-domain-identity --domain codexai.com --region ap-south-1
   ```

2. **Request Production Access** (if in Sandbox mode)
   - Go to AWS Console > SES > Account Dashboard
   - Click "Edit your account details"
   - Fill the form and submit for production access
   - Usually takes 24 hours for approval

3. **Check SES Status**
   ```bash
   aws ses get-account-sending-enabled --region ap-south-1
   ```

## Configuration

### Environment Variables

Settings in `serverless.yml`:

```yaml
environment:
  SES_FROM_EMAIL: noreply@codexai.com        # Email sender address
  DEFAULT_BROCHURE_LINK: https://codexai.com/brochure.pdf  # Default brochure URL
```

### Update Sender Email

Edit `serverless.yml` and change:
```yaml
SES_FROM_EMAIL: your-verified-email@yourdomain.com
```

## Email Request Format

When creating a user, you can optionally provide a custom brochure link:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+91-9876543210",
  "course": "Web Development",
  "brochureLink": "https://custom-link.com/web-dev-brochure.pdf"
}
```

If `brochureLink` is not provided, it defaults to `DEFAULT_BROCHURE_LINK` from environment variables.

## Email Content

The email includes:

### Header
- Gradient background with welcome message

### Body
- Personalized greeting with user's name
- Course enrollment confirmation
- Course details box with course name
- Features list (curriculum, projects, mentorship, certification, etc.)
- Call-to-action button linking to brochure
- Brochure contents preview
- Support information

### Footer
- Company name and contact details
- Website link
- Automated email disclaimer

## Error Handling

**Important**: If email sending fails, the user is still created successfully. The response will include:

```json
{
  "message": "User created successfully (welcome email failed to send)",
  "user": { ... },
  "emailStatus": "failed",
  "emailError": "Details about the error"
}
```

This ensures that temporary SES issues don't block user registration.

## Testing Email Locally

### 1. Test Email Format (No SES Required)

Check that the email service can properly construct the email:

```bash
# Run from project root
node -e "
const { sendWelcomeEmail } = require('./src/utils/emailService');
console.log('Email service loaded successfully');
"
```

### 2. Test with AWS SES Sandbox

1. Add recipient email to SES verified addresses
2. Deploy to AWS
3. Create a user with the test email

### 3. View Sent Emails in AWS Console

```bash
# Check sent email metrics
aws ses get-send-statistics --region ap-south-1

# View bounces and complaints
aws ses list-verified-email-addresses --region ap-south-1
```

## Testing via Postman

### Create User with Email

```http
POST https://<api-id>.lambda-url.ap-south-1.on.aws/users
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "test@example.com",
  "phoneNumber": "+91-9876543210",
  "course": "Web Development",
  "brochureLink": "https://codexai.com/courses/web-dev-brochure.pdf"
}
```

### Response with Email Sent

```json
{
  "message": "User created successfully and welcome email sent",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Doe",
    "email": "test@example.com",
    "phoneNumber": "+91-9876543210",
    "course": "Web Development",
    "createdAt": "2026-03-30T10:30:45.123Z",
    "updatedAt": "2026-03-30T10:30:45.123Z"
  },
  "emailStatus": "sent"
}
```

## Troubleshooting

### Error: "Email address not verified"

**Solution**: Verify the sender email in SES
```bash
aws ses verify-email-identity --email-address noreply@codexai.com --region ap-south-1
aws ses list-verified-email-addresses --region ap-south-1
```

### Error: "Account sending limit exceeded"

**Solution**: You're in SES Sandbox mode. Request production access from AWS Console.

### Error: "Invalid email address"

**Solution**: The recipient email is invalid or not verified (if in Sandbox).

### Email not received

**Check:**
1. Email is in SES verified list (sandbox mode)
2. Account has production access
3. Check CloudWatch logs: `serverless logs -f createUser --tail`
4. Check AWS SES bounce/complaint notifications

## CloudWatch Logs

View email sending logs:

```bash
# View createUser logs (includes email sending)
serverless logs -f createUser --tail

# Filter for email errors
serverless logs -f createUser --tail | grep -i "email\|ses"
```

## Production Considerations

1. **Email Templates**: Consider using SES Email Templates for better management
2. **Bounce Handling**: Set up SNS notifications for bounces and complaints
3. **Rate Limiting**: SES has sending rate limits; monitor and adjust
4. **Custom Domain**: Use a custom domain with DKIM/SPF for higher deliverability
5. **Email List Management**: Implement unsubscribe links for compliance
6. **Analytics**: Track email opens, clicks, and bounces

## Advanced: Custom Email Templates

To use SES Email Templates instead of inline HTML:

```javascript
// Option 1: Use SES Templates
const params = {
  Source: process.env.SES_FROM_EMAIL,
  Destination: { ToAddresses: [email] },
  Template: 'WelcomeEmailTemplate',
  TemplateData: JSON.stringify({
    fullName: user.fullName,
    course: user.course,
    brochureLink: brochureLink,
  }),
};

await ses.sendTemplatedEmail(params).promise();
```

## Support

For issues or questions:
1. Check AWS SES documentation
2. Review CloudWatch logs
3. Verify SES account status in AWS Console
4. Contact AWS Support for SES-specific issues
