const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const TABLE_NAME = process.env.COURSES_TABLE;

/**
 * Lambda handler for deleting a course
 * 
 * Path parameters:
 *   - courseId: string (required) - UUID of the course
 * 
 * Returns:
 *   - 200: Course deleted successfully
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

    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { courseId },
    };

    await dynamodb.delete(deleteParams).promise();

    return formatResponse(200, {
      message: 'Course deleted successfully',
      deletedCourseId: courseId,
    });
  } catch (error) {
    return handleError(error);
  }
};
