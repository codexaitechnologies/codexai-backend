const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');
const { sendEmail } = require('../utils/emailService');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'support-tickets-dev';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@codexai.com';

/**
 * Submit a support query
 * Required fields: name, email, phoneNumber, category, description
 * Optional fields: documents (array of S3 URLs)
 * Returns: ticketId, status, createdAt
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
    const { name, email, phoneNumber, category, description, documents } = body;

    if (!name || name.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: name',
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

    if (!category || category.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: category',
      });
    }

    // Validate category
    const validCategories = ['technical', 'billing', 'account', 'course', 'general'];
    if (!validCategories.includes(category.toLowerCase())) {
      return formatResponse(400, {
        error: `Invalid category. Allowed: ${validCategories.join(', ')}`,
      });
    }

    if (!description || description.trim() === '') {
      return formatResponse(400, {
        error: 'Missing or empty required field: description',
      });
    }

    // Validate description length (max 5000 characters)
    if (description.length > 5000) {
      return formatResponse(400, {
        error: 'Description exceeds maximum length of 5000 characters',
      });
    }

    // Store documents (if provided)
    let documentsList = [];
    if (documents && Array.isArray(documents)) {
      // Accept all valid URLs - documents come from our own upload handler
      documentsList = documents.filter((doc) => typeof doc === 'string' && doc.trim() !== '');
    }

    // Generate ticket ID
    const ticketId = `TKT-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const createdAt = new Date().toISOString();

    // Create ticket record
    const ticketRecord = {
      ticketId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      category: category.toLowerCase(),
      description: description.trim(),
      documents: documentsList,
      status: 'open', // open, in-progress, resolved, closed
      priority: 'medium', // low, medium, high, urgent
      createdAt,
      updatedAt: createdAt,
      responses: [], // Array of support team responses
      viewedAt: null,
    };

    // Store in DynamoDB
    try {
      await dynamodb
        .put({
          TableName: SUPPORT_TICKETS_TABLE,
          Item: ticketRecord,
        })
        .promise();

      console.log(`Support ticket created: ${ticketId}`);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return formatResponse(500, {
        error: 'Failed to create support ticket in database',
      });
    }

    // Send confirmation email to user
    try {
      const userEmailContent = `
Hello ${name},

Thank you for contacting CodexAI Support. Your support ticket has been received and assigned reference number: ${ticketId}

**Ticket Details:**
- Reference ID: ${ticketId}
- Category: ${category}
- Status: Open
- Submitted: ${createdAt}

**Your Query:**
${description}

We will review your query and respond within 24-48 hours. You can track your ticket status using the reference ID above.

If you have any additional information to add, please reply to this email with your ticket reference ID.

Best regards,
CodexAI Support Team
support@codexai.com
      `;

      await sendEmail({
        to: email,
        subject: `Support Ticket Created - ${ticketId}`,
        html: userEmailContent,
      });

      console.log(`Confirmation email sent to ${email}`);
    } catch (emailError) {
      console.warn('Warning: Could not send confirmation email:', emailError.message);
      // Continue - email failure should not block ticket creation
    }

    // Send notification email to support team
    try {
      const supportEmailContent = `
New Support Ticket Submitted

**Ticket ID:** ${ticketId}
**Name:** ${name}
**Email:** ${email}
**Phone:** ${phoneNumber}
**Category:** ${category}
**Priority:** ${ticketRecord.priority}
**Status:** ${ticketRecord.status}
**Submitted:** ${createdAt}

**Description:**
${description}

**Documents Attached:** ${documentsList.length > 0 ? 'Yes' : 'No'}
${documentsList.length > 0 ? documentsList.map((doc) => `- ${doc}`).join('\n') : ''}

---
Please log in to the support dashboard to view and respond to this ticket.
      `;

      await sendEmail({
        to: SUPPORT_EMAIL,
        subject: `[NEW] Support Ticket: ${ticketId} - ${category} (${ticketRecord.priority})`,
        html: supportEmailContent,
      });

      console.log(`Support team notification sent to ${SUPPORT_EMAIL}`);
    } catch (emailError) {
      console.warn('Warning: Could not send support notification email:', emailError.message);
      // Continue - email failure should not block ticket creation
    }

    return formatResponse(201, {
      message: 'Support ticket created successfully',
      ticket: {
        ticketId,
        status: ticketRecord.status,
        priority: ticketRecord.priority,
        createdAt,
        category,
        name,
        email,
      },
      nextSteps: 'We will review your query and respond within 24-48 hours.',
    });
  } catch (error) {
    console.error('Submit support query error:', error);
    return handleError(error);
  }
};
