const { v4: uuidv4 } = require('uuid');
const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const BROCHURES_TABLE = process.env.BROCHURES_TABLE;
const COURSES_TABLE = process.env.COURSES_TABLE;

/**
 * Lambda handler for creating a new brochure
 * 
 * Request body:
 *   - courseId: string (required) - Must exist in courses table
 *   - brochureLink: string (required) - URL to the brochure PDF
 *   - description: string (optional) - Brochure description
 * 
 * Returns:
 *   - 201: Brochure created successfully
 *   - 400: Missing or invalid required fields
 *   - 404: Course not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.courseId || !body.brochureLink) {
      return formatResponse(400, {
        error: 'Missing required fields: courseId, brochureLink',
      });
    }

    // Validate brochure link is a valid URL
    try {
      new URL(body.brochureLink);
    } catch (error) {
      return formatResponse(400, {
        error: 'Invalid brochureLink. Must be a valid URL.',
      });
    }

    // Check if course exists
    const courseParams = {
      TableName: COURSES_TABLE,
      Key: { courseId: body.courseId },
    };

    const courseResult = await dynamodb.get(courseParams).promise();
    if (!courseResult.Item) {
      return formatResponse(404, {
        error: `Course with ID ${body.courseId} not found`,
      });
    }

    const brochureId = uuidv4();
    const timestamp = new Date().toISOString();

    const params = {
      TableName: BROCHURES_TABLE,
      Item: {
        brochureId,
        courseId: body.courseId,
        brochureLink: body.brochureLink,
        description: body.description || '',
        courseName: courseResult.Item.title || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    await dynamodb.put(params).promise();

    return formatResponse(201, {
      message: 'Brochure created successfully',
      brochure: params.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
