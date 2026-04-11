const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for deleting a news post (admin only)
 * 
 * Path Parameters:
 *   - postId: ID of the news post to delete
 * 
 * Returns:
 *   - 200: News post deleted successfully
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

    const deleteParams = {
      TableName: TABLE_NAME,
      Key: {
        postId: postId,
      },
    };

    await dynamodb.delete(deleteParams).promise();

    console.log('News post deleted:', postId);

    return formatResponse(200, {
      message: 'News post deleted successfully',
      deletedPostId: postId,
    });
  } catch (error) {
    console.error('Delete news post error:', error);
    return handleError(error, 'Failed to delete news post');
  }
};
