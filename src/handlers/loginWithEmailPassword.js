const { initiateAuth } = require('../utils/cognito');
const { formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Login user with email and password
 * Required fields: email, password
 * Returns: tokens, user email, and name for localStorage
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.email || !body.password) {
      return formatResponse(400, {
        error: 'Missing required fields: email, password',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Initiate auth
    const authResult = await initiateAuth(body.email, body.password);

    // Check if user needs to confirm sign up (for new users)
    if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return formatResponse(403, {
        message: 'User must set permanent password',
        session: authResult.Session,
        requiredAttributes: authResult.ChallengeParameters.userAttributes,
      });
    }

    // Check if MFA is required
    if (authResult.ChallengeName === 'SOFTWARE_TOKEN_MFA' || authResult.ChallengeName === 'SMS_MFA') {
      return formatResponse(403, {
        message: 'MFA verification required',
        session: authResult.Session,
        challengeName: authResult.ChallengeName,
      });
    }

    // Check if email verification is required
    if (authResult.ChallengeName === 'USER_PASSWORD_AUTH') {
      return formatResponse(403, {
        message: 'User email verification required',
        session: authResult.Session,
      });
    }

    // Decode idToken to extract user attributes
    const idTokenParts = authResult.AuthenticationResult.IdToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString('utf-8'));
    
    const userName = decodedPayload.name || decodedPayload['given_name'] || 'User';
    const userEmail = decodedPayload.email || body.email;
    const phoneNumber = decodedPayload.phone_number || '';

    return formatResponse(200, {
      message: 'Login successful',
      accessToken: authResult.AuthenticationResult.AccessToken,
      idToken: authResult.AuthenticationResult.IdToken,
      refreshToken: authResult.AuthenticationResult.RefreshToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn,
      user: {
        email: userEmail,
        name: userName,
        phoneNumber: phoneNumber,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, {
        error: 'User not found. Please sign up first.',
      });
    }

    if (error.code === 'NotAuthorizedException') {
      return formatResponse(401, {
        error: 'Invalid email or password',
      });
    }

    if (error.code === 'UserNotConfirmedException') {
      return formatResponse(403, {
        error: 'User email not confirmed. Please verify your email first.',
      });
    }

    if (error.code === 'PasswordResetRequiredException') {
      return formatResponse(403, {
        error: 'Password reset is required. Please use forgot password.',
      });
    }

    if (error.code === 'TooManyRequestsException') {
      return formatResponse(429, {
        error: 'Too many login attempts. Please try again later.',
      });
    }

    return handleError(error);
  }
};
