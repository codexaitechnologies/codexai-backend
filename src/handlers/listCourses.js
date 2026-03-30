const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.COURSES_TABLE;

/**
 * Lambda handler for listing all courses with pagination support
 * 
 * Query Parameters:
 *   - limit: Number of items to return (default: 10, max: 100)
 *   - lastEvaluatedKey: Base64-encoded key for pagination
 *   - flagship: boolean - filter to only flagship courses (true/false)
 * 
 * Returns:
 *   - 200: Array of courses with count and pagination token
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

    // Add filter for flagship courses if requested
    if (queryParams.flagship === 'true') {
      params.FilterExpression = 'isFlagship = :flagshipValue';
      params.ExpressionAttributeValues = {
        ':flagshipValue': true,
      };
    } else if (queryParams.flagship === 'false') {
      params.FilterExpression = 'isFlagship = :flagshipValue';
      params.ExpressionAttributeValues = {
        ':flagshipValue': false,
      };
    }

    // Perform scan operation
    const result = await dynamodb.scan(params).promise();

    // Prepare response
    const response = {
      message: 'Courses retrieved successfully',
      count: result.Items.length,
      total: result.Count,
      scannedCount: result.ScannedCount,
      courses: result.Items,
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
