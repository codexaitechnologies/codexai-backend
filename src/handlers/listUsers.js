const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../utils/dynamodb');

/**
 * Lambda handler for listing all users with pagination support
 * 
 * Query Parameters:
 *   - limit: Number of items to return (default: 10, max: 100)
 *   - lastEvaluatedKey: Base64-encoded key for pagination
 * 
 * Returns:
 *   - 200: Array of users with count and pagination token
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    
    // Parse and validate limit
    let limit = parseInt(queryParams.limit) || 10;
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
      TableName: TABLE_NAME,
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
      message: 'Users retrieved successfully',
      count: result.Items.length,
      total: result.Count,
      scannedCount: result.ScannedCount,
      users: result.Items,
    };

    // Add pagination token if more items exist
    if (result.LastEvaluatedKey) {
      // Encode the LastEvaluatedKey as base64 for safe transmission
      const encodedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      response.lastEvaluatedKey = encodedKey;
      response.hasMore = true;
    } else {
      response.hasMore = false;
    }

    return formatResponse(200, response);
  } catch (error) {
    return handleError(error);
  }
};
