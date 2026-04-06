const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Update an existing coupon
 * PUT /coupons/update/{couponCode}
 * Body: { type?, value?, description?, minAmount?, maxDiscount?, maxUses?, expiresAt?, isActive? }
 */
exports.handler = async (event) => {
  try {
    const { couponCode } = event.pathParameters;
    const body = JSON.parse(event.body);
    const couponsTable = process.env.COUPONS_TABLE;

    if (!couponsTable) {
      return formatResponse(500, {
        error: 'Coupons table not configured',
      });
    }

    if (!couponCode) {
      return formatResponse(400, {
        error: 'Coupon code is required in path parameters',
      });
    }

    // Get existing coupon
    const getParams = {
      TableName: couponsTable,
      Key: {
        couponCode: couponCode.toUpperCase(),
      },
    };

    const existing = await dynamodb.get(getParams).promise();

    if (!existing.Item) {
      return formatResponse(404, {
        error: `Coupon not found: ${couponCode}`,
      });
    }

    // Build update expression
    const updateFields = {};
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Allowed fields to update
    const allowedFields = ['type', 'value', 'description', 'minAmount', 'maxDiscount', 'maxUses', 'expiresAt', 'isActive'];

    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== null) {
        // Validate type if updating
        if (field === 'type' && !['flat', 'percentage'].includes(body[field])) {
          return formatResponse(400, {
            error: 'Type must be "flat" or "percentage"',
          });
        }

        // Validate value if updating
        if (field === 'value' && (typeof body[field] !== 'number' || body[field] <= 0)) {
          return formatResponse(400, {
            error: 'Value must be a positive number',
          });
        }

        // Validate minAmount if updating
        if (field === 'minAmount' && (typeof body[field] !== 'number' || body[field] < 0)) {
          return formatResponse(400, {
            error: 'minAmount must be a non-negative number',
          });
        }

        // Convert boolean isActive to number (1 or 0)
        let fieldValue = body[field];
        if (field === 'isActive' && typeof fieldValue === 'boolean') {
          fieldValue = fieldValue ? 1 : 0;
        }

        updateFields[field] = fieldValue;
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = fieldValue;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return formatResponse(400, {
        error: 'No valid fields to update',
      });
    }

    // Add updatedAt timestamp
    updateFields.updatedAt = new Date().toISOString();
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = updateFields.updatedAt;

    // Build update expression
    const updateExpression = `SET ${Object.keys(expressionAttributeNames)
      .map((name) => `${name} = :${name.substring(1)}`)
      .join(', ')}`;

    const updateParams = {
      TableName: couponsTable,
      Key: {
        couponCode: couponCode.toUpperCase(),
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamodb.update(updateParams).promise();

    return formatResponse(200, {
      message: 'Coupon updated successfully',
      coupon: result.Attributes,
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    return handleError(error, 'Failed to update coupon');
  }
};
