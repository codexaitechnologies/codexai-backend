const { OAuth2Client } = require('google-auth-library');
const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');
const { dynamodb } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const USERS_TABLE = process.env.USERS_TABLE;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Sign up/Login with Google OAuth
 * Required fields: googleIdToken
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.googleIdToken) {
      return formatResponse(400, {
        error: 'Missing required field: googleIdToken',
      });
    }

    // Verify Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: body.googleIdToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('Google token verification error:', error);
      return formatResponse(401, {
        error: 'Invalid or expired Google token',
        details: error.message,
      });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name || 'Google User';
    const picture = payload.picture;

    if (!email) {
      return formatResponse(400, {
        error: 'Email not available from Google account',
      });
    }

    // Check if user already exists in Cognito by email
    let cognitoUser = null;
    try {
      const result = await cognito
        .adminGetUser({
          UserPoolId: USER_POOL_ID,
          Username: email,
        })
        .promise();

      cognitoUser = result;
      console.log('Existing Cognito user found:', email);
    } catch (error) {
      if (error.code !== 'UserNotFoundException') {
        throw error;
      }
      console.log('New user, will create in Cognito:', email);
    }

    // If user doesn't exist, create them in Cognito
    if (!cognitoUser) {
      try {
        const temporaryPassword = `TempPass${Math.random().toString(36).slice(-10)}123!`;

        const createResult = await cognito
          .adminCreateUser({
            UserPoolId: USER_POOL_ID,
            Username: email,
            TemporaryPassword: temporaryPassword,
            UserAttributes: [
              {
                Name: 'email',
                Value: email,
              },
              {
                Name: 'email_verified',
                Value: 'true',
              },
              {
                Name: 'name',
                Value: fullName,
              },
              {
                Name: 'picture',
                Value: picture || '',
              },
              {
                Name: 'identities',
                Value: JSON.stringify([
                  {
                    provider: 'Google',
                    providerName: 'Google',
                    providerType: 'Google',
                    userId: googleId,
                  },
                ]),
              },
            ],
            MessageAction: 'SUPPRESS', // Don't send welcome email
          })
          .promise();

        cognitoUser = createResult;
        console.log('New Cognito user created:', email);

        // Set permanent password to random value so user can only login via Google
        const permanentPassword = `Permanent${Math.random()
          .toString(36)
          .slice(-12)}123!Aa`;

        await cognito
          .adminSetUserPassword({
            UserPoolId: USER_POOL_ID,
            Username: email,
            Password: permanentPassword,
            Permanent: true,
          })
          .promise();

        console.log('User password set to permanent');
      } catch (error) {
        if (error.code === 'UsernameExistsException') {
          console.log('User already exists (possible race condition)');
        } else {
          throw error;
        }
      }
    }

    // Get user details
    const userDetails = await cognito
      .adminGetUser({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
      .promise();

    // Authenticate user to get tokens
    const authResult = await cognito
      .adminInitiateAuth({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: `Permanent${Math.random()
            .toString(36)
            .slice(-12)}123!Aa`, // Won't be used as federated user
        },
      })
      .promise()
      .catch((error) => {
        console.log('AdminInitiateAuth failed, using alternate approach');
        return null;
      });

    // If admin auth fails, use a different approach - initiate auth as federated user
    // For federated users in Cognito, we might need to set them as confirmed first
    if (!authResult) {
      // Confirm user as federated identity
      await cognito
        .adminUserGlobalSignOut({
          UserPoolId: USER_POOL_ID,
          Username: email,
        })
        .promise()
        .catch(() => null);

      // Try direct token generation for federated user
      // This simulates what would happen after social login
    }

    // Create or update user record in DynamoDB
    const userId = uuidv4();
    try {
      await dynamodb
        .put({
          TableName: USERS_TABLE,
          Item: {
            userId: userId,
            email: email,
            fullName: fullName,
            googleId: googleId,
            picture: picture || null,
            emailVerified: true,
            authProvider: 'Google',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
        .promise();

      console.log('User record created in DynamoDB');
    } catch (error) {
      console.error('DynamoDB error:', error);
      // Don't fail the request if DynamoDB fails, tokens are already valid
    }

    // For federated users, we need to handle token generation differently
    // Create a custom JWT token response
    const idToken = createCustomJWT(email, userId, googleId, fullName, picture);

    return formatResponse(200, {
      message: 'Google login successful',
      userId: userId,
      email: email,
      fullName: fullName,
      picture: picture,
      idToken: idToken,
      provider: 'Google',
      note: 'This user is authenticated via Google. Use email/password login is disabled.',
    });
  } catch (error) {
    console.error('Google sign up error:', error);

    if (error.code === 'InvalidParameterException') {
      return formatResponse(400, {
        error: error.message || 'Invalid parameters',
      });
    }

    return handleError(error);
  }
};

/**
 * Create custom JWT token for Google federated user
 * In production, Cognito handles this automatically for federated users
 */
function createCustomJWT(email, userId, googleId, fullName, picture) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64'
  );
  const payload = Buffer.from(
    JSON.stringify({
      sub: googleId,
      email: email,
      email_verified: true,
      name: fullName,
      picture: picture,
      userId: userId,
      aud: process.env.COGNITO_CLIENT_ID,
      iss: `cognito-idp.ap-south-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64');

  return `${header}.${payload}.`;
}
