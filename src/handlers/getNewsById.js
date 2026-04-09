const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.NEWS_TABLE;

/**
 * Lambda handler for getting a single news post by ID
 * 
 * Path Parameters:
 *   - postId: ID of the news post
 * 
 * Returns:
 *   - 200: News post details
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

    const params = {
      TableName: TABLE_NAME,
      Key: {
        postId: postId,
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: `News post not found: ${postId}`,
      });
    }

    return formatResponse(200, {
      message: 'News post retrieved successfully',
      post: result.Item,
    });
  } catch (error) {
    console.error('Get news post error:', error);
    return handleError(error, 'Failed to retrieve news post');
  }
};
