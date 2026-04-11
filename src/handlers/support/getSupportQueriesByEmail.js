const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'support-tickets-dev';

/**
 * Fetch support queries by email with pagination.
 * GET /support/queries/by-email?email=...&limit=20&lastEvaluatedKey=...
 */
exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const email = queryParams.email ? String(queryParams.email).trim().toLowerCase() : '';

    if (!email) {
      return formatResponse(400, {
        error: 'Missing required query parameter: email',
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return formatResponse(400, { error: 'Invalid email format' });
    }

    let limit = parseInt(queryParams.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    let exclusiveStartKey = undefined;
    if (queryParams.lastEvaluatedKey) {
      try {
        const decodedKey = Buffer.from(queryParams.lastEvaluatedKey, 'base64').toString('utf-8');
        exclusiveStartKey = JSON.parse(decodedKey);
      } catch (e) {
        return formatResponse(400, {
          error: 'Invalid lastEvaluatedKey format. Must be base64-encoded JSON.',
        });
      }
    }

    const params = {
      TableName: SUPPORT_TICKETS_TABLE,
      IndexName: 'email-createdAt-index',
      KeyConditionExpression: '#email = :email',
      ExpressionAttributeNames: { '#email': 'email' },
      ExpressionAttributeValues: { ':email': email },
      Limit: limit,
      ScanIndexForward: false,
    };
    if (exclusiveStartKey) params.ExclusiveStartKey = exclusiveStartKey;

    const result = await dynamodb.query(params).promise();

    const response = {
      message: 'Support queries retrieved successfully',
      count: result.Items ? result.Items.length : 0,
      total: result.Count || 0,
      scannedCount: result.ScannedCount || 0,
      tickets: result.Items || [],
    };

    if (result.LastEvaluatedKey) {
      response.lastEvaluatedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return formatResponse(200, response);
  } catch (error) {
    console.error('Get support queries by email error:', error);
    return handleError(error);
  }
};

