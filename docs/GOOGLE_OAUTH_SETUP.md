# Google OAuth Integration Guide

This guide explains how to implement Google OAuth sign up/login with the CodexAI backend.

## Overview

The Google OAuth integration allows users to sign up and log in using their Google account. The backend validates Google ID tokens and creates/updates Cognito users accordingly.

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: Add your frontend domains
   - Authorized redirect URIs: Add your frontend callback URLs
5. Copy the **Client ID** from the credentials page

### 2. Backend Configuration

Add to `.env`:
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Deploy Backend

```bash
npm install
serverless deploy
```

---

## Frontend Implementation

### Option 1: Using Google Sign-In Button (Recommended)

#### Install Google Sign-In Library

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

#### HTML Setup

```html
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleCredentialResponse">
</div>
<div class="g_id_signin" data-type="standard"></div>
```

#### JavaScript Implementation

```javascript
async function handleCredentialResponse(response) {
  try {
    // Send ID token to backend
    const result = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/auth/google-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googleIdToken: response.credential
      })
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(data.error || 'Google signup failed');
    }

    // Store tokens
    localStorage.setItem('idToken', data.idToken);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('email', data.email);

    // Redirect to dashboard
    window.location.href = '/dashboard';

  } catch (error) {
    console.error('Google signup error:', error);
    alert('Failed to sign up with Google: ' + error.message);
  }
}

// Initialize Google Sign-In
window.onload = function() {
  google.accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID',
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(
    document.getElementById('buttonDiv'),
    { theme: 'outline', size: 'large' }
  );
};
```

---

### Option 2: Using React Component

#### Install Dependencies

```bash
npm install @react-oauth/google
```

#### Implementation

```jsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

function GoogleSignUp() {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post(
        'https://jbd1szydoc.lambda-url.ap-south-1.on.aws/auth/google-signup',
        {
          googleIdToken: credentialResponse.credential
        }
      );

      // Save tokens and user info
      localStorage.setItem('idToken', response.data.idToken);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('email', response.data.email);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Google signup error:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google sign up failed');
  };

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text="signup_with"
      />
    </GoogleOAuthProvider>
  );
}

export default GoogleSignUp;
```

---

### Option 3: Using Vue.js

#### Install Dependencies

```bash
npm install vue3-google-login
```

#### Implementation

```vue
<template>
  <div>
    <GoogleLogin
      :clientId="googleClientId"
      @success="handleGoogleSuccess"
      @error="handleGoogleError"
    />
  </div>
</template>

<script setup>
import { GoogleLogin } from 'vue3-google-login'
import axios from 'axios'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const handleGoogleSuccess = async (response) => {
  try {
    const result = await axios.post(
      'https://jbd1szydoc.lambda-url.ap-south-1.on.aws/auth/google-signup',
      {
        googleIdToken: response.credential
      }
    )

    // Save tokens
    localStorage.setItem('idToken', result.data.idToken)
    localStorage.setItem('userId', result.data.userId)
    localStorage.setItem('email', result.data.email)

    // Redirect
    window.location.href = '/dashboard'
  } catch (error) {
    console.error('Google signup error:', error)
  }
}

const handleGoogleError = () => {
  console.error('Google sign up failed')
}
</script>
```

---

## API Endpoint

**POST** `/auth/google-signup`

### Request

```json
{
  "googleIdToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiJjbGllbnRfaWQuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiY2xpZW50X2lkLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjEwNzY5MTUwMzUwMDA2MTUwNzE2IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJLdG1TWmdmWVBxNTFfUzB1WjBYUWciLCJpYXQiOjE2NzY0ODUzNjAsImV4cCI6MTY3NjQ4ODk2MH0.signature"
}
```

### Success Response (200)

```json
{
  "message": "Google login successful",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "fullName": "John Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "idToken": "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMDc2OTE1MDM1MDAwNjE1MDcxNiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiSm9obiBEb2UiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tLy4uLiIsInVzZXJJZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImF1ZCI6ImNsaWVudF9pZCIsImlzcyI6ImNvZ25pdG8taWRwLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS9hcC1zb3V0aC0xX3h4eHh4eHh4eCIsImlhdCI6MTY3NjQ4NTM2MCwiZXhwIjoxNjc2NDg4OTYwfQ.",
  "provider": "Google"
}
```

### Error Responses

**400 - Missing Field**
```json
{
  "error": "Missing required field: googleIdToken"
}
```

**401 - Invalid Token**
```json
{
  "error": "Invalid or expired Google token",
  "details": "Error message from Google"
}
```

**400 - No Email**
```json
{
  "error": "Email not available from Google account"
}
```

---

## Flow Diagram

```
┌─────────────────┐
│   User clicks   │
│  Google button  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Google Sign-In      │
│ Dialog opens        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ User authenticates  │
│ with Google         │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐         ┌──────────────────────┐
│ Google returns      │────────▶│ Frontend sends       │
│ idToken to frontend │         │ idToken to backend   │
└─────────────────────┘         └────────┬─────────────┘
                                         │
                                         ▼
                            ┌──────────────────────────┐
                            │ Backend verifies token   │
                            │ with Google              │
                            └────────┬─────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │ Extract user info:         │
                        │ - email                    │
                        │ - name                     │
                        │ - picture                  │
                        │ - googleId                 │
                        └────────┬───────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │ Check if user exists in    │
                    │ Cognito                    │
                    └────────┬───────────────────┘
                             │
                    ┌────────┴──────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ User exists  │    │ Create new   │
            │ in Cognito   │    │ Cognito user │
            └──────┬───────┘    └──────┬───────┘
                   │                   │
                   └────────┬──────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │ Create DynamoDB     │
                  │ user record         │
                  └────────┬────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ Return JWT tokens   │
                  │ to frontend         │
                  └────────┬────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ Frontend stores     │
                  │ tokens & redirects  │
                  │ to dashboard        │
                  └─────────────────────┘
```

---

## Security Considerations

1. **Token Validation:**
   - Backend validates token signature with Google
   - Verifies token hasn't expired
   - Verifies token audience matches Client ID

2. **User Privacy:**
   - Email is verified by Google
   - User picture stored optionally
   - No password stored for Google users

3. **Token Storage:**
   - Store tokens in httpOnly cookies (server-set)
   - Don't store in localStorage if handling sensitive data
   - Clear tokens on logout

4. **HTTPS Only:**
   - Google Sign-In requires HTTPS in production
   - Test with `localhost` in development

---

## Environment Variables

### Frontend

```env
# .env or .env.local
VITE_GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com
VITE_API_BASE_URL=https://jbd1szydoc.lambda-url.ap-south-1.on.aws
```

### Backend

```env
# .env
GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com
COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Testing with Postman

1. Get a Google ID token from frontend
2. Make POST request to `/auth/google-signup`
3. Body:
   ```json
   {
     "googleIdToken": "token-from-google"
   }
   ```
4. Receive JWT tokens and user info

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid or expired Google token" | Get a fresh token from Google Sign-In |
| "Email not available from Google account" | Ensure Google account has email privacy enabled |
| "CORS error" | Check that frontend domain is in Google OAuth allowed origins |
| "User not created in Cognito" | Check IAM permissions: AdminCreateUser, AdminGetUser, AdminSetUserPassword |
| "Token verification fails" | Verify GOOGLE_CLIENT_ID in .env matches frontend Client ID |

---

## Next Steps

1. Get Google Client ID from [Google Cloud Console](https://console.cloud.google.com/)
2. Add to `.env` file
3. Deploy backend: `serverless deploy`
4. Implement frontend Google Sign-In button
5. Test the complete flow
6. Monitor CloudWatch logs for any issues

---

## Additional Resources

- [Google Identity Services Docs](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 for Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [AWS Cognito Identities](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
