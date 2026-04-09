const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Get a specific legal document by ID
 * GET /admin/legals/{legalId}
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

    const params = {
      TableName: legalsTable,
      Key: {
        id: legalId,
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: `Legal document not found: ${legalId}`,
      });
    }

    return formatResponse(200, {
      message: 'Legal document retrieved successfully',
      legal: result.Item,
    });
  } catch (error) {
    console.error('Get legal error:', error);
    return handleError(error);
  }
};
