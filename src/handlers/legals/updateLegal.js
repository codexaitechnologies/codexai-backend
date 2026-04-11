const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');


/**
 * Update an existing legal document
 * PUT /admin/legals/{legalId}
 * Body: { documentName?, documentLink? }
 */
exports.handler = async (event) => {
  try {
    const { legalId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const legalsTable = process.env.LEGALS_TABLE;

    if (!legalsTable) {
      return formatResponse(500, {
        error: 'Legals table not configured',
      });
    }

    if (!legalId) {
      return formatResponse(400, {
        error: 'Legal ID is required in path parameters',
      });
    }

    // Get existing legal document
    const getParams = {
      TableName: legalsTable,
      Key: {
        id: legalId,
      },
    };

    const existing = await dynamodb.get(getParams).promise();

    if (!existing.Item) {
      return formatResponse(404, {
        error: `Legal document not found: ${legalId}`,
      });
    }

    // Build update expression
    const updateFields = {};
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    let updateExpression = 'SET ';

    // Allowed fields to update
    const allowedFields = ['documentName', 'documentLink'];

    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== null) {
        if (typeof body[field] === 'string' && body[field].trim() !== '') {
          updateFields[field] = body[field].trim();
          expressionAttributeNames[`#${field}`] = field;
          expressionAttributeValues[`:${field}`] = body[field].trim();
          updateExpression += `#${field} = :${field}, `;
        }
      }
    }

    // Add updatedAt
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    updateExpression += '#updatedAt = :updatedAt';

    if (!Object.keys(updateFields).length) {
      return formatResponse(400, {
        error: 'At least one valid field must be provided for update (documentName or documentLink)',
      });
    }

    const updateParams = {
      TableName: legalsTable,
      Key: {
        id: legalId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    return formatResponse(200, {
      message: 'Legal document updated successfully',
      legal: result.Attributes,
    });
  } catch (error) {
    console.error('Update legal error:', error);
    return handleError(error);
  }
};
