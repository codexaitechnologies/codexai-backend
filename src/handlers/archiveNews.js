const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for archiving a news post
 * 
 * Path Parameters:
 *   - postId: ID of the news post to archive
 * 
 * Returns:
 *   - 200: News post archived successfully
 *   - 404: Post not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const { postId } = event.pathParameters;

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

    const now = new Date().toISOString();

    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        postId: postId,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'archived',
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    console.log('News post archived:', postId);

    return formatResponse(200, {
      message: 'News post archived successfully',
      post: result.Attributes,
    });
  } catch (error) {
    console.error('Archive news post error:', error);
    return handleError(error, 'Failed to archive news post');
  }
};
