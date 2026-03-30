const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../utils/dynamodb');

exports.handler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    const body = JSON.parse(event.body);

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

    const timestamp = new Date().toISOString();
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': timestamp,
    };
    const expressionAttributeNames = {};

    // Dynamic update based on provided fields
    const allowedFields = ['fullName', 'email', 'phoneNumber', 'course'];
    
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateExpression += `, #${field} = :${field}`;
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    const updateParams = {
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    return formatResponse(200, {
      message: 'User updated successfully',
      user: result.Attributes,
    });
  } catch (error) {
    return handleError(error);
  }
};
