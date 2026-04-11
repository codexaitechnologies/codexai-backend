const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');


/**
 * Fetch all available active coupons
 * GET /coupons
 */
exports.handler = async (event) => {
  try {
    const couponsTable = process.env.COUPONS_TABLE;

    if (!couponsTable) {
      return formatResponse(500, {
        error: 'Coupons table not configured',
      });
    }

    // Get all active coupons
    const params = {
      TableName: couponsTable,
      FilterExpression: 'isActive = :active AND (attribute_not_exists(expiresAt) OR expiresAt > :now)',
      ExpressionAttributeValues: {
        ':active': 1,
        ':now': new Date().toISOString(),
      },
      ProjectionExpression: 'couponCode, #type, #value, description, minAmount, maxDiscount, maxUses, expiresAt, createdAt, usedCount',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#value': 'value',
      },
    };

    const result = await dynamodb.scan(params).promise();

    // Format coupons response
    const coupons = result.Items.map((coupon) => ({
      code: coupon.couponCode,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      minAmount: coupon.minAmount,
      maxDiscount: coupon.maxDiscount,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount || 0,
      expiresAt: coupon.expiresAt,
      createdAt: coupon.createdAt,
    }));

    // Sort by expiration date (ascending) and then by creation date (descending)
    coupons.sort((a, b) => {
      if (a.expiresAt && b.expiresAt) {
        return new Date(a.expiresAt) - new Date(b.expiresAt);
      }
      if (a.expiresAt) return -1;
      if (b.expiresAt) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return formatResponse(200, {
      message: 'Active coupons fetched successfully',
      count: coupons.length,
      coupons: coupons,
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    return handleError(error, 'Failed to fetch coupons');
  }
};
