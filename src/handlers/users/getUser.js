const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../../utils/dynamodb');

exports.handler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return formatResponse(400, {
        error: 'Missing userId in path parameters',
      });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        userId,
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: 'User not found',
      });
    }

    return formatResponse(200, {
      message: 'User retrieved successfully',
      user: result.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
