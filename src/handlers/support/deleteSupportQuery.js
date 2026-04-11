const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'support-tickets-dev';

/**
 * Delete support query (ticket).
 * DELETE /support/queries/{ticketId}
 */
exports.handler = async (event) => {
  try {
    const ticketId = event.pathParameters?.ticketId;
    if (!ticketId) {
      return formatResponse(400, { error: 'Missing required path parameter: ticketId' });
    }

    // Ensure ticket exists (clear 404s)
    const existing = await dynamodb
      .get({
        TableName: SUPPORT_TICKETS_TABLE,
        Key: { ticketId },
      })
      .promise();

    if (!existing.Item) {
      return formatResponse(404, { error: `Support ticket not found: ${ticketId}` });
    }

    await dynamodb
      .delete({
        TableName: SUPPORT_TICKETS_TABLE,
        Key: { ticketId },
      })
      .promise();

    return formatResponse(200, {
      message: 'Support ticket deleted successfully',
      ticketId,
    });
  } catch (error) {
    console.error('Delete support query error:', error);
    return handleError(error);
  }
};

