const { dynamodb, formatResponse, handleError } = require('../utils/dynamodb');

const BROCHURES_TABLE = process.env.BROCHURES_TABLE;

/**
 * Lambda handler for deleting a brochure
 * 
 * Path parameters:
 *   - brochureId: string (required) - UUID of the brochure
 * 
 * Returns:
 *   - 200: Brochure deleted successfully
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

    const deleteParams = {
      TableName: BROCHURES_TABLE,
      Key: { brochureId },
    };

    await dynamodb.delete(deleteParams).promise();

    return formatResponse(200, {
      message: 'Brochure deleted successfully',
      deletedBrochureId: brochureId,
    });
  } catch (error) {
    return handleError(error);
  }
};
