const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');
const { sendEmail, sendWelcomeEmail } = require('../utils/emailService');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const BROCHURE_ENQUIRIES_TABLE = process.env.BROCHURE_ENQUIRIES_TABLE || 'brochure-enquiries-dev';
const BROCHURES_TABLE = process.env.BROCHURES_TABLE;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'support@codexai.com';

/**
 * Submit a brochure enquiry
 * Required fields: fullName, email, phoneNumber, course, courseId
 * Returns: enquiryId, status, createdAt
 */
exports.handler = async (event) => {
  try {
    // Parse request body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      return formatResponse(400, {
        error: 'Invalid JSON in request body',
      });
    }

    // Validate required fields
    const { fullName, email, phoneNumber, course, courseId } = body;

    if (!fullName || fullName.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: fullName',
      });
    }

    if (!email || email.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: email',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: phoneNumber',
      });
    }

    if (!course || course.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: course',
      });
    }

    if (!courseId || courseId.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: courseId',
      });
    }

    // Generate enquiry ID
    const enquiryId = `ENQ-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const createdAt = new Date().toISOString();

    // Create enquiry record
    const enquiryRecord = {
      enquiryId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      course: course.trim(),
      courseId: courseId.trim(),
      status: 'pending', // pending, brochure-sent, contacted
      createdAt,
      updatedAt: createdAt,
    };

    // Store enquiry in DynamoDB
    const params = {
      TableName: BROCHURE_ENQUIRIES_TABLE,
      Item: enquiryRecord,
    };

    await dynamodb.put(params).promise();
    console.log('✅ Enquiry stored in DynamoDB:', enquiryId);

    // Fetch brochure link from brochures table using GSI
    let brochureLink = process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';

    try {
      const brochureParams = {
        TableName: BROCHURES_TABLE,
        IndexName: 'courseId-index',
        KeyConditionExpression: 'courseId = :courseId',
        ExpressionAttributeValues: {
          ':courseId': courseId,
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

    // Send welcome email with brochure to user
    try {
      await sendWelcomeEmail(
        {
          email: email,
          fullName: fullName,
          course: course,
        },
        brochureLink
      );
      console.log('✅ Welcome email with brochure sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Failed to send welcome email:', emailError.message);
      // Don't fail the request if email fails
    }

    // Send notification email to admin
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Brochure Enquiry - ${course}`,
        html: `
          <h2>New Brochure Enquiry Received</h2>
          <p><strong>Enquiry ID:</strong> ${enquiryId}</p>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phoneNumber}</p>
          <p><strong>Course:</strong> ${course}</p>
          <p><strong>Submitted At:</strong> ${createdAt}</p>
          <hr/>
          <p><a href="https://admin.codexai.co.in/brochure-enquiries/${enquiryId}">View in Admin Dashboard</a></p>
        `,
      });
      console.log('✅ Admin notification email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send admin notification:', emailError.message);
      // Don't fail the request if email fails
    }

    return formatResponse(200, {
      message: 'Brochure enquiry submitted successfully',
      enquiryId,
      status: 'pending',
      createdAt,
    });
  } catch (error) {
    console.error('❌ Error submitting brochure enquiry:', error);
    return handleError(error);
  }
};
