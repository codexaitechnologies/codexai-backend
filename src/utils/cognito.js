const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('./dynamodb');

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

/**
 * Sign up user with email and password
 */
const signUpUser = async (email, password, fullName, phoneNumber) => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'name',
        Value: fullName,
      },
      {
        Name: 'phone_number',
        Value: phoneNumber,
      },
    ],
  };

  return cognito.signUp(params).promise();
};

/**
 * Initiate auth (login)
 */
const initiateAuth = async (email, password) => {
  const params = {
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  return cognito.initiateAuth(params).promise();
};

/**
 * Confirm user email with OTP
 */
const confirmSignUp = async (email, confirmationCode) => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode,
  };

  return cognito.confirmSignUp(params).promise();
};

/**
 * Resend confirmation code
 */
const resendConfirmationCode = async (email) => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
  };

  return cognito.resendConfirmationCode(params).promise();
};

/**
 * Forgot password - initiate forgot password flow
 */
const forgotPassword = async (email) => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
  };

  return cognito.forgotPassword(params).promise();
};

/**
 * Confirm forgot password with reset code
 */
const confirmForgotPassword = async (email, confirmationCode, newPassword) => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode,
    Password: newPassword,
  };

  return cognito.confirmForgotPassword(params).promise();
};

/**
 * Global sign out
 */
const globalSignOut = async (accessToken) => {
  const params = {
    AccessToken: accessToken,
  };

  return cognito.globalSignOut(params).promise();
};

/**
 * Get user attributes from access token
 */
const getUserAttributes = async (accessToken) => {
  const params = {
    AccessToken: accessToken,
  };

  return cognito.getUserAttributes(params).promise();
};

/**
 * Get user info (name and email) from access token
 * Transforms CloudFormation attribute format to clean object
 */
const getUser = async (accessToken) => {
  const result = await getUserAttributes(accessToken);
  const attributes = {};

  if (result.UserAttributes) {
    result.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });
  }

  return {
    email: attributes.email,
    name: attributes.name,
    fullName: attributes.name,
    phoneNumber: attributes.phone_number,
    sub: attributes.sub,
  };
};

/**
 * Get user attributes from Cognito by email (admin operation)
 * Returns fullName, phoneNumber, and sub (userId)
 */
const getUserByEmail = async (email) => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: email,
  };

  const result = await cognito.adminGetUser(params).promise();
  const attributes = {};

  if (result.UserAttributes) {
    result.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });
  }

  return {
    sub: attributes.sub, // Cognito user ID
    fullName: attributes.name || '',
    phoneNumber: attributes.phone_number || '',
    email: attributes.email,
  };
};

module.exports = {
  cognito,
  USER_POOL_ID,
  CLIENT_ID,
  signUpUser,
  initiateAuth,
  confirmSignUp,
  resendConfirmationCode,
  forgotPassword,
  confirmForgotPassword,
  globalSignOut,
  getUserAttributes,
  getUser,
  getUserByEmail,
};
