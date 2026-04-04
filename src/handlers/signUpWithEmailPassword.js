const { signUpUser } = require('../utils/cognito');
const { formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Sign up user with email and password
 * Required fields: email, password, fullName, phoneNumber
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.email || !body.password || !body.fullName || !body.phoneNumber) {
      return formatResponse(400, {
        error: 'Missing required fields: email, password, fullName, phoneNumber',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Validate password strength (minimum 8 characters, at least one number, one uppercase, one lowercase)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(body.password)) {
      return formatResponse(400, {
        error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    if (!phoneRegex.test(body.phoneNumber)) {
      return formatResponse(400, {
        error: 'Invalid phone number format',
      });
    }

    // Sign up user in Cognito
    const signUpResult = await signUpUser(
      body.email,
      body.password,
      body.fullName,
      body.phoneNumber
    );

    return formatResponse(200, {
      message: 'User registered successfully. Please check your email for verification code.',
      userSub: signUpResult.UserSub,
      codeDeliveryDetails: signUpResult.CodeDeliveryDetails,
    });
  } catch (error) {
    console.error('Sign up error:', error);

    if (error.code === 'UsernameExistsException') {
      return formatResponse(409, {
        error: 'Email already exists. Please try logging in or use a different email.',
      });
    }

    if (error.code === 'InvalidPasswordException') {
      return formatResponse(400, {
        error: error.message || 'Password does not meet the required criteria',
      });
    }

    if (error.code === 'InvalidParameterException') {
      return formatResponse(400, {
        error: error.message || 'Invalid parameters provided',
      });
    }

    return handleError(error);
  }
};
