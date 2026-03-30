const { v4: uuidv4 } = require('uuid');
const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../utils/dynamodb');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // Validate required fields
    if (!body.fullName || !body.email || !body.phoneNumber || !body.course) {
      return formatResponse(400, {
        error: 'Missing required fields: fullName, email, phoneNumber, course',
      });
    }

    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId,
        fullName: body.fullName,
        email: body.email,
        phoneNumber: body.phoneNumber,
        course: body.course,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    await dynamodb.put(params).promise();

    return formatResponse(201, {
      message: 'User created successfully',
      user: params.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
