const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * List all legal documents with pagination support
 * GET /admin/legals
 * 
 * Query Parameters:
 *   - limit: Number of items to return (default: 20, max: 100)
 *   - lastEvaluatedKey: Base64-encoded key for pagination
 */
exports.handler = async (event) => {
  try {
    const legalsTable = process.env.LEGALS_TABLE;

    if (!legalsTable) {
      return formatResponse(500, {
        error: 'Legals table not configured',
      });
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};

    // Parse and validate limit
    let limit = parseInt(queryParams.limit) || 20;
    limit = Math.min(limit, 100); // Cap at 100
    limit = Math.max(limit, 1);   // Minimum 1

    // Parse lastEvaluatedKey if provided
    let exclusiveStartKey = null;
    if (queryParams.lastEvaluatedKey) {
      try {
        const decodedKey = Buffer.from(queryParams.lastEvaluatedKey, 'base64').toString('utf-8');
        exclusiveStartKey = JSON.parse(decodedKey);
      } catch (error) {
        console.warn('Invalid lastEvaluatedKey format:', error.message);
        return formatResponse(400, {
          error: 'Invalid lastEvaluatedKey format. Must be a valid base64-encoded JSON object.',
        });
      }
    }

    // Build scan parameters
    const params = {
      TableName: legalsTable,
      Limit: limit,
    };

    // Add exclusive start key if provided (for pagination)
    if (exclusiveStartKey) {
      params.ExclusiveStartKey = exclusiveStartKey;
    }

    // Perform scan operation
    const result = await dynamodb.scan(params).promise();

    // Prepare response
    const response = {
      message: 'Legal documents retrieved successfully',
      count: result.Items.length,
      total: result.Count,
      scannedCount: result.ScannedCount,
      legals: result.Items,
    };

    // Add pagination token if more items exist
    if (result.LastEvaluatedKey) {
      const encodedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      response.lastEvaluatedKey = encodedKey;
    }

    return formatResponse(200, response);
  } catch (error) {
    console.error('List legals error:', error);
    return handleError(error);
  }
};
