const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const TABLE_NAME = process.env.COURSES_TABLE;

/**
 * Lambda handler for retrieving a course by ID
 * 
 * Path parameters:
 *   - courseId: string (required) - UUID of the course
 * 
 * Returns:
 *   - 200: Course retrieved successfully
 *   - 400: Missing courseId
 *   - 404: Course not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const courseId = event.pathParameters?.courseId;

    if (!courseId) {
      return formatResponse(400, {
        error: 'Missing courseId in path parameters',
      });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        courseId,
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: 'Course not found',
      });
    }

    return formatResponse(200, {
      message: 'Course retrieved successfully',
      course: result.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
