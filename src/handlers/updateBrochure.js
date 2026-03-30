const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const BROCHURES_TABLE = process.env.BROCHURES_TABLE;
const COURSES_TABLE = process.env.COURSES_TABLE;

/**
 * Lambda handler for updating a brochure
 * 
 * Path parameters:
 *   - brochureId: string (required) - UUID of the brochure
 * 
 * Request body (all fields optional):
 *   - courseId: string - Must exist in courses table if provided
 *   - brochureLink: string - Must be a valid URL
 *   - description: string
 * 
 * Returns:
 *   - 200: Brochure updated successfully
 *   - 400: Missing brochureId or invalid data
 *   - 404: Brochure or course not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const brochureId = event.pathParameters?.brochureId;
    const body = JSON.parse(event.body);

    if (!brochureId) {
      return formatResponse(400, {
        error: 'Missing brochureId in path parameters',
      });
    }

    // Check if brochure exists
    const getParams = {
      TableName: BROCHURES_TABLE,
      Key: { brochureId },
    };

    const getResult = await dynamodb.get(getParams).promise();
    if (!getResult.Item) {
      return formatResponse(404, {
        error: 'Brochure not found',
      });
    }

    // If courseId is provided, verify it exists
    if (body.courseId && body.courseId !== getResult.Item.courseId) {
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
    }

    // Validate brochure link if provided
    if (body.brochureLink) {
      try {
        new URL(body.brochureLink);
      } catch (error) {
        return formatResponse(400, {
          error: 'Invalid brochureLink. Must be a valid URL.',
        });
      }
    }

    const timestamp = new Date().toISOString();
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': timestamp,
    };
    const expressionAttributeNames = {};

    // Define allowed updatable fields
    const allowedFields = ['courseId', 'brochureLink', 'description'];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateExpression += `, #${field} = :${field}`;
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    const updateParams = {
      TableName: BROCHURES_TABLE,
      Key: { brochureId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    return formatResponse(200, {
      message: 'Brochure updated successfully',
      brochure: result.Attributes,
    });
  } catch (error) {
    return handleError(error);
  }
};
