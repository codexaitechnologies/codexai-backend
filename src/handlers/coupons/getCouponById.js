const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');


/**
 * Get a specific coupon by code
 * GET /coupons/{couponCode}
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

    const params = {
      TableName: couponsTable,
      Key: {
        couponCode: couponCode.toUpperCase(),
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: `Coupon not found: ${couponCode}`,
      });
    }

    return formatResponse(200, {
      message: 'Coupon retrieved successfully',
      coupon: result.Item,
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    return handleError(error, 'Failed to retrieve coupon');
  }
};
