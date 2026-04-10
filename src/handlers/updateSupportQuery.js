const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');
const { sendEmail } = require('../utils/emailService');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'support-tickets-dev';

const VALID_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Update support query (ticket).
 * PUT /support/queries/{ticketId}
 *
 * Body (any of):
 *  - status: open|in-progress|resolved|closed
 *  - priority: low|medium|high|urgent
 *  - responses: array (support team responses)
 *  - viewedAt: ISO string or null
 */
exports.handler = async (event) => {
  try {
    const ticketId = event.pathParameters?.ticketId;
    if (!ticketId) {
      return formatResponse(400, { error: 'Missing required path parameter: ticketId' });
    }

    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    } catch (e) {
      return formatResponse(400, { error: 'Invalid JSON in request body' });
    }

    // Ensure ticket exists
    const existing = await dynamodb
      .get({
        TableName: SUPPORT_TICKETS_TABLE,
        Key: { ticketId },
      })
      .promise();

    if (!existing.Item) {
      return formatResponse(404, { error: `Support ticket not found: ${ticketId}` });
    }

    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const sets = [];

    if (body.status !== undefined && body.status !== null) {
      const status = String(body.status).toLowerCase();
      if (!VALID_STATUSES.includes(status)) {
        return formatResponse(400, {
          error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
        });
      }
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
      sets.push('#status = :status');
    }

    if (body.priority !== undefined && body.priority !== null) {
      const priority = String(body.priority).toLowerCase();
      if (!VALID_PRIORITIES.includes(priority)) {
        return formatResponse(400, {
          error: `Invalid priority. Allowed: ${VALID_PRIORITIES.join(', ')}`,
        });
      }
      expressionAttributeNames['#priority'] = 'priority';
      expressionAttributeValues[':priority'] = priority;
      sets.push('#priority = :priority');
    }

    if (body.viewedAt !== undefined) {
      if (body.viewedAt !== null && typeof body.viewedAt !== 'string') {
        return formatResponse(400, { error: 'viewedAt must be an ISO string or null' });
      }
      expressionAttributeNames['#viewedAt'] = 'viewedAt';
      expressionAttributeValues[':viewedAt'] = body.viewedAt;
      sets.push('#viewedAt = :viewedAt');
    }

    if (body.comment !== undefined && body.comment !== null && String(body.comment).trim() !== '') {
      expressionAttributeNames['#comments'] = 'comments';
      expressionAttributeValues[':newComment'] = [String(body.comment).trim()];
      expressionAttributeValues[':emptyList'] = [];
      sets.push('#comments = list_append(if_not_exists(#comments, :emptyList), :newComment)');
    }

    if (sets.length === 0) {
      return formatResponse(400, {
        error: 'At least one valid field must be provided (status, priority, responses, viewedAt)',
      });
    }

    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    sets.push('#updatedAt = :updatedAt');

    const result = await dynamodb
      .update({
        TableName: SUPPORT_TICKETS_TABLE,
        Key: { ticketId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    // Send email to user when status changes
    if (body.status !== undefined && body.status !== null) {
      try {
        const comment = body.comment ? String(body.comment).trim() : '';
        await sendEmail({
          to: existing.Item.email,
          subject: `Support Ticket Update [${ticketId}] - Status: ${body.status}`,
          html: `
            <h2>Your Support Ticket Has Been Updated</h2>
            <p>Hi <strong>${existing.Item.name}</strong>,</p>
            <p>Your support ticket <strong>${ticketId}</strong> has been updated.</p>
            <table style="border-collapse:collapse;width:100%;">
              <tr><td style="padding:6px 12px;font-weight:bold;">New Status</td><td style="padding:6px 12px;">${body.status}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;">Category</td><td style="padding:6px 12px;">${existing.Item.category}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;">Updated At</td><td style="padding:6px 12px;">${new Date().toISOString()}</td></tr>
            </table>
            ${comment ? `<p><strong>Comment from support team:</strong></p><blockquote style="border-left:4px solid #667eea;padding:8px 16px;color:#555;">${comment}</blockquote>` : ''}
            <hr/>
            <p>For any follow-up, reference your ticket ID: <strong>${ticketId}</strong></p>
            <p>Regards,<br/><strong>CodexAI Support Team</strong></p>
          `,
        });
        console.log('✅ Status update email sent to:', existing.Item.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send status update email:', emailError.message);
      }
    }


    return formatResponse(200, {
      message: 'Support ticket updated successfully',
      ticket: result.Attributes,
    });

  } catch (error) {
    console.error('Update support query error:', error);
    return handleError(error);
  }
};

