const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');


/**
 * Delete a coupon
 * DELETE /coupons/delete/{couponCode}
 */
exports.handler = async (event) => {
  try {
    const { couponCode } = event.pathParameters;
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

    // Get existing coupon to verify it exists
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

    // Delete coupon
    const deleteParams = {
      TableName: couponsTable,
      Key: {
        couponCode: couponCode.toUpperCase(),
      },
    };

    await dynamodb.delete(deleteParams).promise();

    return formatResponse(200, {
      message: 'Coupon deleted successfully',
      deletedCoupon: {
        code: existing.Item.couponCode,
        description: existing.Item.description,
      },
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return handleError(error, 'Failed to delete coupon');
  }
};
