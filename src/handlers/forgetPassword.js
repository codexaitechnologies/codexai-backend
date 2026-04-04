const { forgotPassword } = require('../utils/cognito');
const { formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Initiate forgot password flow
 * Required fields: email
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.email) {
      return formatResponse(400, {
        error: 'Missing required field: email',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Initiate forgot password flow
    const result = await forgotPassword(body.email);

    return formatResponse(200, {
      message: 'Password reset code sent to your email',
      codeDeliveryDetails: result.CodeDeliveryDetails,
      email: body.email,
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, {
        error: 'User not found. Please sign up first.',
      });
    }

    if (error.code === 'InvalidParameterException') {
      return formatResponse(400, {
        error: 'Invalid email provided',
      });
    }

    if (error.code === 'UserNotConfirmedException') {
      return formatResponse(403, {
        error: 'User email not confirmed. Please verify your email first.',
      });
    }

    if (error.code === 'TooManyRequestsException') {
      return formatResponse(429, {
        error: 'Too many requests. Please try again later.',
      });
    }

    if (error.code === 'LimitExceededException') {
      return formatResponse(429, {
        error: 'Attempt limit exceeded. Please try again after some time.',
      });
    }

    return handleError(error);
  }
};
