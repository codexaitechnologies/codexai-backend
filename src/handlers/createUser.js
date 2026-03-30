const { v4: uuidv4 } = require('uuid');
const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../utils/dynamodb');
const { sendWelcomeEmail } = require('../utils/emailService');

const BROCHURES_TABLE = process.env.BROCHURES_TABLE;

/**
 * Email validation regex
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // Validate required fields
    if (!body.fullName || !body.email || !body.phoneNumber || !body.course || !body.courseId) {
      return formatResponse(400, {
        error: 'Missing required fields: fullName, email, phoneNumber, course, courseId',
      });
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Check if user with same email already exists
    const scanByEmailParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': body.email,
      },
      Limit: 1,
    };

    const emailCheckResult = await dynamodb.scan(scanByEmailParams).promise();
    let existingUser = emailCheckResult.Items && emailCheckResult.Items.length > 0 ? emailCheckResult.Items[0] : null;

    // If email exists, send welcome email and return 200
    if (existingUser) {
      // Fetch brochure link from brochures table
      let brochureLink = process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';

      try {
        const brochureParams = {
          TableName: BROCHURES_TABLE,
          IndexName: 'courseId-index',
          KeyConditionExpression: 'courseId = :courseId',
          ExpressionAttributeValues: {
            ':courseId': body.courseId,
          },
          Limit: 1,
        };

        const brochureResult = await dynamodb.query(brochureParams).promise();
        if (brochureResult.Items && brochureResult.Items.length > 0) {
          brochureLink = brochureResult.Items[0].brochureLink;
        }
      } catch (brochureError) {
        console.warn('Warning: Could not fetch brochure link, using default:', brochureError.message);
      }

      // Send email for existing user
      try {
        await sendWelcomeEmail(
          {
            email: existingUser.email,
            fullName: existingUser.fullName,
            course: existingUser.course,
          },
          brochureLink
        );

        return formatResponse(200, {
          message: 'User already exists. Welcome email sent successfully.',
          userExists: true,
          emailStatus: 'sent',
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        return formatResponse(200, {
          message: 'User already exists. Welcome email failed to send.',
          userExists: true,
          emailStatus: 'failed',
          emailError: emailError.message,
        });
      }
    }

    // Check if user with same phone number already exists
    const scanByPhoneParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'phoneNumber = :phoneNumber',
      ExpressionAttributeValues: {
        ':phoneNumber': body.phoneNumber,
      },
      Limit: 1,
    };

    const phoneCheckResult = await dynamodb.scan(scanByPhoneParams).promise();
    existingUser = phoneCheckResult.Items && phoneCheckResult.Items.length > 0 ? phoneCheckResult.Items[0] : null;

    // If phone exists, send welcome email and return 200
    if (existingUser) {
      // Fetch brochure link from brochures table
      let brochureLink = process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';

      try {
        const brochureParams = {
          TableName: BROCHURES_TABLE,
          IndexName: 'courseId-index',
          KeyConditionExpression: 'courseId = :courseId',
          ExpressionAttributeValues: {
            ':courseId': body.courseId,
          },
          Limit: 1,
        };

        const brochureResult = await dynamodb.query(brochureParams).promise();
        if (brochureResult.Items && brochureResult.Items.length > 0) {
          brochureLink = brochureResult.Items[0].brochureLink;
        }
      } catch (brochureError) {
        console.warn('Warning: Could not fetch brochure link, using default:', brochureError.message);
      }

      // Send email for existing user
      try {
        await sendWelcomeEmail(
          {
            email: existingUser.email,
            fullName: existingUser.fullName,
            course: existingUser.course,
          },
          brochureLink
        );

        return formatResponse(200, {
          message: 'User already exists. Welcome email sent successfully.',
          userExists: true,
          emailStatus: 'sent',
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        return formatResponse(200, {
          message: 'User already exists. Welcome email failed to send.',
          userExists: true,
          emailStatus: 'failed',
          emailError: emailError.message,
        });
      }
    }

    // Fetch brochure link from brochures table using GSI
    let brochureLink = process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';

    try {
      const brochureParams = {
        TableName: BROCHURES_TABLE,
        IndexName: 'courseId-index',
        KeyConditionExpression: 'courseId = :courseId',
        ExpressionAttributeValues: {
          ':courseId': body.courseId,
        },
        Limit: 1,
      };

      const brochureResult = await dynamodb.query(brochureParams).promise();
      if (brochureResult.Items && brochureResult.Items.length > 0) {
        brochureLink = brochureResult.Items[0].brochureLink;
      }
    } catch (brochureError) {
      console.warn('Warning: Could not fetch brochure link, using default:', brochureError.message);
      // Continue with default brochure link
    }

    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const userItem = {
      userId,
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      course: body.course,
      courseId: body.courseId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const params = {
      TableName: TABLE_NAME,
      Item: userItem,
    };

    // Save user to database
    await dynamodb.put(params).promise();

    // Send welcome email asynchronously (non-blocking)
    // If email fails, user is still created successfully
    try {
      await sendWelcomeEmail(
        {
          email: body.email,
          fullName: body.fullName,
          course: body.course,
        },
        brochureLink
      );
      
      return formatResponse(201, {
        message: 'User created successfully and welcome email sent',
        user: userItem,
        userExists: false,
        emailStatus: 'sent',
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the entire operation if email sending fails
      return formatResponse(201, {
        message: 'User created successfully (welcome email failed to send)',
        user: userItem,
        userExists: false,
        emailStatus: 'failed',
        emailError: emailError.message,
      });
    }
  } catch (error) {
    return handleError(error);
  }
};
