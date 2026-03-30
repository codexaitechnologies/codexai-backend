const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.COURSES_TABLE;

/**
 * Lambda handler for updating a course
 * 
 * Path parameters:
 *   - courseId: string (required) - UUID of the course
 * 
 * Request body (all fields optional):
 *   - title: string
 *   - duration: string
 *   - iconName: string
 *   - description: string
 *   - features: string[]
 *   - projectCount: string
 *   - link: string
 *   - colorClass: object - {from, to, icon, badge, border, hoverBorder, hoverShadow}
 *   - isFlagship: boolean
 * 
 * Returns:
 *   - 200: Course updated successfully
 *   - 400: Missing courseId
 *   - 404: Course not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const courseId = event.pathParameters?.courseId;
    const body = JSON.parse(event.body);

    if (!courseId) {
      return formatResponse(400, {
        error: 'Missing courseId in path parameters',
      });
    }

    // Check if course exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: { courseId },
    };

    const getResult = await dynamodb.get(getParams).promise();
    if (!getResult.Item) {
      return formatResponse(404, {
        error: 'Course not found',
      });
    }

    const timestamp = new Date().toISOString();
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': timestamp,
    };
    const expressionAttributeNames = {};

    // Define allowed updatable fields
    const allowedFields = ['title', 'duration', 'iconName', 'description', 'features', 'projectCount', 'link', 'colorClass', 'isFlagship'];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateExpression += `, #${field} = :${field}`;
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    const updateParams = {
      TableName: TABLE_NAME,
      Key: { courseId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    return formatResponse(200, {
      message: 'Course updated successfully',
      course: result.Attributes,
    });
  } catch (error) {
    return handleError(error);
  }
};
