const { resendConfirmationCode } = require('../../utils/cognito');
const { formatResponse, handleError } = require('../../utils/dynamodb');

/**
 * Resend email verification code
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

    // Resend confirmation code
    const result = await resendConfirmationCode(body.email);

    return formatResponse(200, {
      message: 'Verification code sent successfully',
      codeDeliveryDetails: result.CodeDeliveryDetails,
      email: body.email,
    });
  } catch (error) {
    console.error('Resend code error:', error);

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

    if (error.code === 'NotAuthorizedException') {
      return formatResponse(400, {
        error: 'User is already confirmed. You can proceed to login.',
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
