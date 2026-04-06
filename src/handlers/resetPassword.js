const { confirmForgotPassword } = require('../utils/cognito');
const { formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Reset password with reset code from forgot password flow
 * Required fields: email, confirmationCode, newPassword
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.email || !body.confirmationCode || !body.newPassword) {
      return formatResponse(400, {
        error: 'Missing required fields: email, confirmationCode, newPassword',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(body.newPassword)) {
      return formatResponse(400, {
        error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
      });
    }

    // Confirm forgot password
    await confirmForgotPassword(body.email, body.confirmationCode, body.newPassword);

    return formatResponse(200, {
      message: 'Password reset successfully. You can now login with your new password.',
      email: body.email,
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error.code === 'ExpiredCodeException') {
      return formatResponse(400, {
        error: 'Reset code has expired. Please request a new password reset.',
      });
    }

    if (error.code === 'CodeMismatchException') {
      return formatResponse(400, {
        error: 'Invalid reset code. Please try again.',
      });
    }

    if (error.code === 'InvalidPasswordException') {
      return formatResponse(400, {
        error: error.message || 'Password does not meet the required criteria',
      });
    }

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, {
        error: 'User not found',
      });
    }

    if (error.code === 'TooManyRequestsException') {
      return formatResponse(429, {
        error: 'Too many attempts. Please try again later.',
      });
    }

    return handleError(error);
  }
};
