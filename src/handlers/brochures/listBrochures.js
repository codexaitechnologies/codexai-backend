const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const BROCHURES_TABLE = process.env.BROCHURES_TABLE;

/**
 * Lambda handler for listing brochures with pagination and optional filtering
 * 
 * Query parameters:
 *   - limit: number (optional) - Number of results to return (default: 10, max: 100)
 *   - cursor: string (optional) - Base64-encoded LastEvaluatedKey for pagination
 *   - courseId: string (optional) - Filter brochures by courseId
 * 
 * Returns:
 *   - 200: List of brochures with pagination token if more results exist
 *   - 400: Invalid limit or cursor
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    let limit = parseInt(queryParams.limit) || 10;
    const cursor = queryParams.cursor;
    const courseIdFilter = queryParams.courseId;

    // Validate limit
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // Decode cursor if provided
    let ExclusiveStartKey;
    if (cursor) {
      try {
        ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      } catch (err) {
        return formatResponse(400, {
          error: 'Invalid cursor format',
        });
      }
    }

    // If filtering by courseId, use Query; otherwise, use Scan
    let params;

    if (courseIdFilter) {
      // Query by courseId (GSI required in serverless.yml)
      params = {
        TableName: BROCHURES_TABLE,
        IndexName: 'courseId-index', // Global Secondary Index
        KeyConditionExpression: 'courseId = :courseId',
        ExpressionAttributeValues: {
          ':courseId': courseIdFilter,
        },
        Limit: limit,
      };

      if (ExclusiveStartKey) {
        params.ExclusiveStartKey = ExclusiveStartKey;
      }

      const result = await dynamodb.query(params).promise();

      const nextCursor = result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null;

      return formatResponse(200, {
        brochures: result.Items,
        count: result.Items.length,
        hasMore: !!result.LastEvaluatedKey,
        nextCursor,
      });
    } else {
      // Scan all brochures
      params = {
        TableName: BROCHURES_TABLE,
        Limit: limit,
      };

      if (ExclusiveStartKey) {
        params.ExclusiveStartKey = ExclusiveStartKey;
      }

      const result = await dynamodb.scan(params).promise();

      const nextCursor = result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null;

      return formatResponse(200, {
        brochures: result.Items,
        count: result.Items.length,
        hasMore: !!result.LastEvaluatedKey,
        nextCursor,
      });
    }
  } catch (error) {
    return handleError(error);
  }
};
