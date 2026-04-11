const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');


/**
 * Delete a legal document
 * DELETE /admin/legals/{legalId}
 */
exports.handler = async (event) => {
  try {
    const { legalId } = event.pathParameters;
    const legalsTable = process.env.LEGALS_TABLE;

    if (!legalsTable) {
      return formatResponse(500, {
        error: 'Legals table not configured',
      });
    }

    if (!legalId) {
      return formatResponse(400, {
        error: 'Legal ID is required in path parameters',
      });
    }

    // Check if legal document exists
    const getParams = {
      TableName: legalsTable,
      Key: {
        id: legalId,
      },
    };

    const existing = await dynamodb.get(getParams).promise();

    if (!existing.Item) {
      return formatResponse(404, {
        error: `Legal document not found: ${legalId}`,
      });
    }

    // Delete the legal document
    const deleteParams = {
      TableName: legalsTable,
      Key: {
        id: legalId,
      },
    };

    await dynamodb.delete(deleteParams).promise();

    return formatResponse(200, {
      message: 'Legal document deleted successfully',
      id: legalId,
    });
  } catch (error) {
    console.error('Delete legal error:', error);
    return handleError(error);
  }
};
