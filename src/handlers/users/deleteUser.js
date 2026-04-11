const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../../utils/dynamodb');

exports.handler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return formatResponse(400, {
        error: 'Missing userId in path parameters',
      });
    }

    // Check if user exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: { userId },
    };

    const getResult = await dynamodb.get(getParams).promise();
    if (!getResult.Item) {
      return formatResponse(404, {
        error: 'User not found',
      });
    }

    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { userId },
    };

    await dynamodb.delete(deleteParams).promise();

    return formatResponse(200, {
      message: 'User deleted successfully',
      deletedUserId: userId,
    });
  } catch (error) {
    return handleError(error);
  }
};
