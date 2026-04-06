const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'payments-dev';

/**
 * Get payments by userId with pagination
 * Path parameter: userId (User ID or email)
 * Optional query parameters: limit, lastEvaluatedKey (for pagination)
 * 
 * Note: Since userId doesn't have a GSI, this uses scan with filter.
 * Consider adding a userId-createdAt GSI for better performance in high-volume scenarios.
 */
exports.handler = async (event) => {
  try {
    // Get userId from path parameter
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return formatResponse(400, {
        error: 'Missing required path parameter: userId',
      });
    }

    // Parse query parameters
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20'), 100); // Max 100 per page
    const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastEvaluatedKey))
      : undefined;

    const params = {
      TableName: PAYMENTS_TABLE,
      FilterExpression: 'userId = :userId OR email = :email',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':email': userId, // Allow searching by email as well
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    // Scan payments with filter
    const result = await dynamodb.scan(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return formatResponse(200, {
        message: 'No payments found for this user',
        data: {
          payments: [],
          count: 0,
          scannedCount: result.ScannedCount,
        },
      });
    }

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
    console.error('Get payments by userId error:', error);
    return handleError(error);
  }
};
