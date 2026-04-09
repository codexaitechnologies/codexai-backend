const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for listing all news posts with pagination and filtering
 * 
 * Query Parameters:
 *   - limit: Number of items to return (default: 20, max: 100)
 *   - offset: Pagination offset (default: 0)
 *   - category: Filter by category
 *   - status: Filter by status (draft, published, archived)
 *   - search: Search query for title/content
 * 
 * Returns:
 *   - 200: Array of news posts with count and total
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};

    // Parse and validate limit
    let limit = parseInt(queryParams.limit) || 20;
    limit = Math.min(limit, 100); // Cap at 100
    limit = Math.max(limit, 1);   // Minimum 1

    // Parse offset
    const offset = parseInt(queryParams.offset) || 0;

    // Build scan parameters
    const params = {
      TableName: TABLE_NAME,
      Limit: limit,
    };

    // Build filter expressions
    const filterExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // Filter by status
    if (queryParams.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = queryParams.status;
      expressionAttributeNames['#status'] = 'status';
    }

    // Filter by category
    if (queryParams.category) {
      filterExpressions.push('category = :category');
      expressionAttributeValues[':category'] = queryParams.category;
    }

    // Search filter
    if (queryParams.search) {
      filterExpressions.push('contains(#title, :search) OR contains(#content, :search)');
      expressionAttributeValues[':search'] = queryParams.search;
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeNames['#content'] = 'content';
    }

    // Apply filters if any
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    // Perform scan operation
    const result = await dynamodb.scan(params).promise();

    // Apply offset manually (DynamoDB scan doesn't support offset directly)
    const paginatedItems = result.Items.slice(offset, offset + limit);

    return formatResponse(200, {
      message: 'News posts retrieved successfully',
      count: paginatedItems.length,
      total: result.Items.length,
      posts: paginatedItems,
    });
  } catch (error) {
    console.error('List news error:', error);
    return handleError(error, 'Failed to retrieve news posts');
  }
};
