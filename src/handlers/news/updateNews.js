const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for updating a news post (admin only)
 * 
 * Path Parameters:
 *   - postId: ID of the news post to update
 * 
 * Request body:
 *   - title: string (optional)
 *   - content: string (optional)
 *   - category: string (optional)
 *   - description: string (optional)
 *   - imageUrl: string (optional)
 *   - author: string (optional)
 *   - tags: string[] (optional)
 * 
 * Returns:
 *   - 200: News post updated successfully
 *   - 404: Post not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const { postId } = event.pathParameters;
    const body = JSON.parse(event.body);

    if (!TABLE_NAME) {
      return formatResponse(500, {
        error: 'News table not configured',
      });
    }

    if (!postId) {
      return formatResponse(400, {
        error: 'Post ID is required in path parameters',
      });
    }

    // First, check if post exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: {
        postId: postId,
      },
    };

    const getResult = await dynamodb.get(getParams).promise();

    if (!getResult.Item) {
      return formatResponse(404, {
        error: `News post not found: ${postId}`,
      });
    }

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};

    // Allow updating these fields
    const allowedFields = ['title', 'content', 'category', 'description', 'imageUrl', 'author', 'tags'];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateExpressions.push(`${field} = :${field}`);
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 0) {
      return formatResponse(400, {
        error: 'No valid fields provided to update',
      });
    }

    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        postId: postId,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    console.log('News post updated:', postId);

    return formatResponse(200, {
      message: 'News post updated successfully',
      post: result.Attributes,
    });
  } catch (error) {
    console.error('Update news post error:', error);
    return handleError(error, 'Failed to update news post');
  }
};
