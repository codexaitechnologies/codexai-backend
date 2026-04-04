# Authentication Quick Reference

## Postman Collection Examples

### 1. Sign Up
```
POST {{base_url}}/auth/signup

{
  "email": "john@example.com",
  "password": "TestPass123",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210"
}
```

### 2. Resend Verification Code
```
POST {{base_url}}/auth/resend-code

{
  "email": "john@example.com"
}
```

### 3. Confirm Email
```
POST {{base_url}}/auth/confirm-email

{
  "email": "john@example.com",
  "confirmationCode": "123456"
}
```

### 4. Login
```
POST {{base_url}}/auth/login

{
  "email": "john@example.com",
  "password": "TestPass123"
}

RESPONSE:
{
  "message": "Login successful",
  "accessToken": "...",
  "idToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

### 5. Logout
```
POST {{base_url}}/auth/logout

Header:
Authorization: Bearer {{accessToken}}

OR Body:
{
  "accessToken": "..."
}
```

### 6. Forgot Password
```
POST {{base_url}}/auth/forgot-password

{
  "email": "john@example.com"
}
```

### 7. Reset Password
```
POST {{base_url}}/auth/reset-password

{
  "email": "john@example.com",
  "confirmationCode": "123456",
  "newPassword": "NewTestPass123"
}
```

---

## File Structure

```
src/
├── handlers/
│   ├── signUpWithEmailPassword.js      # Sign up handler
│   ├── loginWithEmailPassword.js       # Login handler
│   ├── confirmEmailVerification.js     # Email confirmation
│   ├── resendEmailCode.js              # Resend verification code
│   ├── forgetPassword.js               # Initiate password reset
│   ├── resetPassword.js                # Complete password reset
│   ├── logout.js                       # User logout
│   └── signUpWithGoogle.js             # Google OAuth (placeholder)
└── utils/
    ├── cognito.js                      # Cognito helper functions
    ├── dynamodb.js                     # DynamoDB utilities
    └── emailService.js                 # Email utilities
```

---

## Deployment Checklist

- [ ] Run `npm install` to install dependencies
- [ ] Run `serverless deploy` to create Cognito resources
- [ ] Copy `COGNITO_USER_POOL_ID` from CloudFormation outputs
- [ ] Copy `COGNITO_CLIENT_ID` from CloudFormation outputs
- [ ] Update `.env` file with Cognito IDs
- [ ] Test authentication endpoints using Postman
- [ ] Verify email delivery is working (check spam folder)
- [ ] Test token-based endpoints with Authorization header

---

## Local Testing

```bash
# Start serverless offline
npm run dev

# Base URL for local testing
http://localhost:3000
```

---

## Important Notes

1. **Email Verification Required:** Users must confirm their email before accessing other services
2. **Password Policy:** Min 8 chars, uppercase, lowercase, numbers
3. **Token Expiry:** Access tokens valid for 1 hour
4. **Rate Limiting:** Cognito enforces rate limits on auth attempts
5. **CORS:** Configured for specified domains only

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| User already exists | Use different email during signup |
| Verification code expired | Request new code with /auth/resend-code |
| Token expired | Use refresh token to get new access token |
| Email not verified | Complete email verification before login |
| Invalid password | Ensure: 8+ chars, uppercase, lowercase, numbers |

---

## Database Record Creation

When user confirms email, a record is automatically created in DynamoDB:

```
Table: users-{stage}
Key: userId (UUID)
Attributes:
- userId: UUID
- email: user@example.com
- emailVerified: true
- createdAt: ISO timestamp
- updatedAt: ISO timestamp
```

---

## Next Phase: Additional Features

- [ ] Implement Google OAuth integration
- [ ] Add phone number verification via SMS
- [ ] Enable MFA (TOTP via Authenticator app)
- [ ] Implement account linking (email + social providers)
- [ ] Add user profile update endpoints
- [ ] Implement admin-only user management endpoints
