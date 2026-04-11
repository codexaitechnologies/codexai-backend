const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'payments-dev';

/**
 * Get all payments with pagination
 * Optional query parameters: limit, lastEvaluatedKey (for pagination)
 */
exports.handler = async (event) => {
  try {
    // Parse query parameters
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20'), 100); // Max 100 per page
    const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastEvaluatedKey))
      : undefined;

    const params = {
      TableName: PAYMENTS_TABLE,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    // Scan all payments
    const result = await dynamodb.scan(params).promise();

    return formatResponse(200, {
      message: 'Payments retrieved successfully',
      data: {
        payments: result.Items || [],
        count: result.Items?.length || 0,
        scannedCount: result.ScannedCount,
        // For pagination
        ...(result.LastEvaluatedKey && {
          lastEvaluatedKey: encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)),
          hasMore: true,
        }),
      },
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    return handleError(error);
  }
};
