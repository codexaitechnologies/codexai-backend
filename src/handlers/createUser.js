const { v4: uuidv4 } = require('uuid');
const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../utils/dynamodb');
const { sendWelcomeEmail } = require('../utils/emailService');

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
    if (!body.fullName || !body.email || !body.phoneNumber || !body.course) {
      return formatResponse(400, {
        error: 'Missing required fields: fullName, email, phoneNumber, course',
      });
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Get brochure link from request body or use default
    const brochureLink = body.brochureLink || process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';

    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const userItem = {
      userId,
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      course: body.course,
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
        emailStatus: 'sent',
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the entire operation if email sending fails
      return formatResponse(201, {
        message: 'User created successfully (welcome email failed to send)',
        user: userItem,
        emailStatus: 'failed',
        emailError: emailError.message,
      });
    }
  } catch (error) {
    return handleError(error);
  }
};
