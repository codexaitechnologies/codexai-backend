const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const BROCHURES_TABLE = process.env.BROCHURES_TABLE;

/**
 * Lambda handler for retrieving a brochure by ID
 * 
 * Path parameters:
 *   - brochureId: string (required) - UUID of the brochure
 * 
 * Returns:
 *   - 200: Brochure retrieved successfully
 *   - 400: Missing brochureId
 *   - 404: Brochure not found
 *   - 500: Server error
 */
exports.handler = async (event) => {
  try {
    const brochureId = event.pathParameters?.brochureId;

    if (!brochureId) {
      return formatResponse(400, {
        error: 'Missing brochureId in path parameters',
      });
    }

    const params = {
      TableName: BROCHURES_TABLE,
      Key: { brochureId },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: 'Brochure not found',
      });
    }

    return formatResponse(200, {
      message: 'Brochure retrieved successfully',
      brochure: result.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
