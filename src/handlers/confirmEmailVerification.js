const { confirmSignUp } = require('../utils/cognito');
const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Confirm email verification with OTP code
 * Required fields: email, confirmationCode
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.email || !body.confirmationCode) {
      return formatResponse(400, {
        error: 'Missing required fields: email, confirmationCode',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Confirm sign up in Cognito
    await confirmSignUp(body.email, body.confirmationCode);

    // Create user record in DynamoDB if it doesn't exist
    const userId = uuidv4();
    const existingUser = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId: body.email }, // Using email as lookup key
    }).promise().catch(() => null);

    if (!existingUser?.Item) {
      await dynamodb.put({
        TableName: USERS_TABLE,
        Item: {
          userId: userId,
          email: body.email,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }).promise();
    } else {
      // Update existing user to mark email as verified
      await dynamodb.update({
        TableName: USERS_TABLE,
        Key: { userId: existingUser.Item.userId },
        UpdateExpression: 'SET emailVerified = :true, updatedAt = :now',
        ExpressionAttributeValues: {
          ':true': true,
          ':now': new Date().toISOString(),
        },
      }).promise();
    }

    return formatResponse(200, {
      message: 'Email verified successfully. You can now login.',
      email: body.email,
    });
  } catch (error) {
    console.error('Email confirmation error:', error);

    if (error.code === 'ExpiredCodeException') {
      return formatResponse(400, {
        error: 'Verification code has expired. Please request a new code.',
      });
    }

    if (error.code === 'CodeMismatchException') {
      return formatResponse(400, {
        error: 'Invalid verification code. Please try again.',
      });
    }

    if (error.code === 'NotAuthorizedException') {
      return formatResponse(400, {
        error: 'User could not be confirmed. Please try again.',
      });
    }

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, {
        error: 'User not found. Please sign up first.',
      });
    }

    return handleError(error);
  }
};
