const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for publishing a news post (change status from draft to published)
 * 
 * Path Parameters:
 *   - postId: ID of the news post to publish
 * 
 * Returns:
 *   - 200: News post published successfully
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
      UpdateExpression: 'SET #status = :status, publishedAt = :publishedAt, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'published',
        ':publishedAt': now,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    console.log('News post published:', postId);

    return formatResponse(200, {
      message: 'News post published successfully',
      post: result.Attributes,
    });
  } catch (error) {
    console.error('Publish news post error:', error);
    return handleError(error, 'Failed to publish news post');
  }
};
