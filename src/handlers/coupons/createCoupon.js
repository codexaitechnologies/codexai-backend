const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');


/**
 * Create a new coupon
 * POST /coupons/create
 * Body: { couponCode, type, value, description, minAmount, maxDiscount?, maxUses?, expiresAt? }
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const couponsTable = process.env.COUPONS_TABLE;

    if (!couponsTable) {
      return formatResponse(500, {
        error: 'Coupons table not configured',
      });
    }

    // Validate required fields
    const required = ['couponCode', 'type', 'value', 'description', 'minAmount'];
    const missing = required.filter((field) => !body[field]);

    if (missing.length > 0) {
      return formatResponse(400, {
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // Validate type
    if (!['flat', 'percentage'].includes(body.type)) {
      return formatResponse(400, {
        error: 'Type must be "flat" or "percentage"',
      });
    }

    // Validate value
    if (typeof body.value !== 'number' || body.value <= 0) {
      return formatResponse(400, {
        error: 'Value must be a positive number',
      });
    }

    // Validate minAmount
    if (typeof body.minAmount !== 'number' || body.minAmount < 0) {
      return formatResponse(400, {
        error: 'minAmount must be a non-negative number',
      });
    }

    // Check if coupon code already exists
    const existingParams = {
      TableName: couponsTable,
      Key: {
        couponCode: body.couponCode.toUpperCase(),
      },
    };

    const existing = await dynamodb.get(existingParams).promise();

    if (existing.Item) {
      return formatResponse(400, {
        error: `Coupon code already exists: ${body.couponCode}`,
      });
    }

    const timestamp = new Date().toISOString();
    const newCoupon = {
      couponCode: body.couponCode.toUpperCase(),
      type: body.type,
      value: body.value,
      description: body.description,
      minAmount: body.minAmount,
      maxDiscount: body.maxDiscount || null,
      maxUses: body.maxUses || null,
      expiresAt: body.expiresAt || null,
      isActive: 1,
      usedCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const params = {
      TableName: couponsTable,
      Item: newCoupon,
    };

    await dynamodb.put(params).promise();

    return formatResponse(201, {
      message: 'Coupon created successfully',
      coupon: newCoupon,
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    return handleError(error, 'Failed to create coupon');
  }
};
