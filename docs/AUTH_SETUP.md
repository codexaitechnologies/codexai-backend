# CodexAI Authentication Setup Guide

This guide explains the Cognito-based authentication system implemented for CodexAI Backend.

## Overview

The authentication system uses **AWS Cognito** for user management and JWT token generation.All authentication handlers are located in `src/handlers/` with the auth utility in `src/utils/cognito.js`.

## Authentication Endpoints

### 1. Sign Up with Email & Password
**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210"
}
```

**Requirements:**
- Email: Valid email format
- Password: Min 8 characters, must contain uppercase, lowercase, and numbers
- Phone: 10+ characters with optional country code

**Response (Success - 200):**
```json
{
  "message": "User registered successfully. Please check your email for verification code.",
  "userSub": "uuid-of-user",
  "codeDeliveryDetails": {
    "Destination": "u***@example.com",
    "DeliveryMedium": "EMAIL",
    "AttributeName": "email"
  }
}
```

**Response (Error):**
- `409`: Email already exists
- `400`: Invalid password/email format or missing fields

---

### 2. Confirm Email Verification
**Endpoint:** `POST /auth/confirm-email`

**Request Body:**
```json
{
  "email": "user@example.com",
  "confirmationCode": "123456"
}
```

**Response (Success - 200):**
```json
{
  "message": "Email verified successfully. You can now login.",
  "email": "user@example.com"
}
```

**Response (Error):**
- `400`: Invalid or expired confirmation code
- `404`: User not found

---

### 3. Resend Email Code
**Endpoint:** `POST /auth/resend-code`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "Verification code sent successfully",
  "codeDeliveryDetails": {
    "Destination": "u***@example.com",
    "DeliveryMedium": "EMAIL",
    "AttributeName": "email"
  },
  "email": "user@example.com"
}
```

**Response (Error):**
- `404`: User not found
- `429`: Too many requests

---

### 4. Login with Email & Password
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (Success - 200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "idToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Response (Error):**
- `401`: Invalid email or password
- `403`: User email not confirmed
- `404`: User not found
- `429`: Too many login attempts

---

### 5. Forget Password
**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "Password reset code sent to your email",
  "codeDeliveryDetails": {
    "Destination": "u***@example.com",
    "DeliveryMedium": "EMAIL",
    "AttributeName": "email"
  },
  "email": "user@example.com"
}
```

**Response (Error):**
- `404`: User not found
- `403`: User email not confirmed
- `429`: Too many requests

---

### 6. Reset Password
**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "confirmationCode": "123456",
  "newPassword": "NewSecurePass123"
}
```

**Requirements:**
- New password must meet the same requirements as signup (min 8 chars, uppercase, lowercase, numbers)

**Response (Success - 200):**
```json
{
  "message": "Password reset successfully. You can now login with your new password.",
  "email": "user@example.com"
}
```

**Response (Error):**
- `400`: Invalid reset code or password doesn't meet requirements
- `429`: Too many attempts

---

### 7. Logout
**Endpoint:** `POST /auth/logout`

**Request Body (Option 1 - Body):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request Header (Option 2 - Authorization Header):**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success - 200):**
```json
{
  "message": "Logged out successfully. All tokens have been invalidated."
}
```

**Response (Error):**
- `401`: Invalid or expired access token
- `400`: Missing access token

---

### 8. Google OAuth (Placeholder)
**Endpoint:** `POST /auth/google-signup`

**Status:** Implementation pending

**Purpose:** Sign up / login with Google account after successful Google OAuth flow

---

## User Schema

### Cognito User Attributes
```
- email (String, Required, Immutable)
- phone_number (String, Required, Mutable)
- name (String, Required, Mutable)
- email_verified (Boolean)
```

### DynamoDB User Record
```
{
  "userId": "uuid",
  "email": "user@example.com",
  "emailVerified": true,
  "createdAt": "2024-04-04T10:30:00Z",
  "updatedAt": "2024-04-04T10:30:00Z"
}
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# AWS Region
AWS_REGION=ap-south-1

# Cognito will be automatically created with deploy
# These will be set after deploy:
COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Password Policy

All passwords must meet the following criteria:
- **Minimum Length:** 8 characters
- **Uppercase:** At least 1 uppercase letter (A-Z)
- **Lowercase:** At least 1 lowercase letter (a-z)
- **Numbers:** At least 1 number (0-9)
- **Symbols:** Not required

**Example Valid Passwords:**
- `CodexAi2024`
- `Password123`
- `Test@Password01`

---

## Deployment

### 1. Deploy Infrastructure
```bash
npm install
serverless deploy
```

### 2. Verify Cognito Resources
After deployment, check AWS Console:
- User Pool: `codexai-userpool-dev` (or prod)
- User Pool Client: `codexai-app-client-dev` (or prod)

### 3. Update Environment
After deployment, update your `.env` with the generated Cognito IDs from CloudFormation outputs.

---

## Security Considerations

1. **Token Management:**
   - Access tokens expire in 1 hour
   - Use refresh tokens to get new access tokens
   - Store tokens securely (preferably in httpOnly cookies)

2. **Email Verification:**
   - All users must verify their email before using services
   - Verification codes expire after 24 hours

3. **Password Recovery:**
   - Password reset codes expire after 24 hours
   - Reset codes can only be used once

4. **MFA (Optional):**
   - Can be enabled per user
   - Supports software token and SMS-based MFA

5. **CORS:**
   - Configured for allowed origins only
   - Add your domain to serverless.yml if needed

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error description message",
  "message": "Additional context if applicable"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (access denied)
- `404`: Not found (user doesn't exist)
- `409`: Conflict (email already exists)
- `429`: Too many requests (rate limited)
- `500`: Internal server error

---

## Testing with Postman

1. **Create New User:**
   - POST: `http://localhost:3000/auth/signup`
   - Body: Fill in email, password, fullName, phoneNumber

2. **Verify Email:**
   - Check email for verification code
   - POST: `http://localhost:3000/auth/confirm-email`
   - Body: email, confirmationCode

3. **Login:**
   - POST: `http://localhost:3000/auth/login`
   - Body: email, password

4. **Protected Endpoints:**
   - Include Authorization header: `Bearer <accessToken>`

---

## Frontend Integration

### Using axios with TypeScript:

```typescript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000'
});

// Sign Up
const signUp = async (email, password, fullName, phoneNumber) => {
  return API.post('/auth/signup', {
    email,
    password,
    fullName,
    phoneNumber
  });
};

// Confirm Email
const confirmEmail = async (email, confirmationCode) => {
  return API.post('/auth/confirm-email', {
    email,
    confirmationCode
  });
};

// Login
const login = async (email, password) => {
  return API.post('/auth/login', { email, password });
};

// Logout
const logout = async (accessToken) => {
  return API.post('/auth/logout', { accessToken });
};

// Forgot Password
const forgotPassword = async (email) => {
  return API.post('/auth/forgot-password', { email });
};

// Reset Password
const resetPassword = async (email, confirmationCode, newPassword) => {
  return API.post('/auth/reset-password', {
    email,
    confirmationCode,
    newPassword
  });
};

export { signUp, confirmEmail, login, logout, forgotPassword, resetPassword };
```

---

## Next Steps

1. **Google OAuth Integration:**
   - Install `google-auth-library`: `npm install google-auth-library`
   - Implement Google ID token verification
   - Link Google identity to Cognito

2. **Database Sync:**
   - After email confirmation, ensure user profile is complete in DynamoDB
   - Sync additional user data from Cognito

3. **Session Management:**
   - Implement token refresh mechanism
   - Store tokens in httpOnly cookies

4. **Monitoring:**
   - Set up CloudWatch alarms for auth failures
   - Monitor Cognito usage and costs

---

## Troubleshooting

### Issue: "User pool not found"
- Ensure serverless deploy was successful
- Check Cognito User Pool ID in environment variables

### Issue: "Invalid token"
- Token may have expired, use refresh token to get new one
- Check token format in Authorization header

### Issue: "Email not verified"
- User must confirm email with verification code first
- Check spam folder for verification email

### Issue: "Too many requests"
- Cognito has rate limiting enabled
- Wait before retrying the request

---

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Serverless Framework Guide](https://www.serverless.com/)
- [JWT Token Format](https://jwt.io/)
