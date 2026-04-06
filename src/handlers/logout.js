const { globalSignOut } = require('../utils/cognito');
const { formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Logout user (global sign out)
 * Required fields: accessToken
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.accessToken) {
      // Try to get accessToken from Authorization header
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      if (!authHeader) {
        return formatResponse(400, {
          error: 'Missing required field: accessToken (in body or Authorization header)',
        });
      }

      const tokenParts = authHeader.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return formatResponse(400, {
          error: 'Invalid Authorization header format. Use: Bearer <token>',
        });
      }

      body.accessToken = tokenParts[1];
    }

    // Global sign out
    await globalSignOut(body.accessToken);

    return formatResponse(200, {
      message: 'Logged out successfully. All tokens have been invalidated.',
    });
  } catch (error) {
    console.error('Logout error:', error);

    if (error.code === 'NotAuthorizedException') {
      return formatResponse(401, {
        error: 'Invalid or expired access token',
      });
    }

    if (error.code === 'InvalidParameterException') {
      return formatResponse(400, {
        error: 'Invalid access token provided',
      });
    }

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, {
        error: 'User not found',
      });
    }

    return handleError(error);
  }
};
