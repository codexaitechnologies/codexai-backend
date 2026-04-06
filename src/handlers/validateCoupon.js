const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Validate a specific coupon code
 * POST /coupons/validate
 * Body: { couponCode: string, amount: number }
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { couponCode, amount } = body;

    // Validate input
    if (!couponCode || !amount) {
      return formatResponse(400, {
        error: 'Missing required fields: couponCode, amount',
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return formatResponse(400, {
        error: 'Amount must be a positive number',
      });
    }

    const couponsTable = process.env.COUPONS_TABLE;

    if (!couponsTable) {
      return formatResponse(500, {
        error: 'Coupons table not configured',
      });
    }

    // Get coupon from database
    const params = {
      TableName: couponsTable,
      Key: {
        couponCode: couponCode.toUpperCase(),
      },
    };

    const result = await dynamodb.get(params).promise();
    const coupon = result.Item;

    // Check if coupon exists
    if (!coupon) {
      return formatResponse(400, {
        error: `Invalid coupon code: ${couponCode}`,
        valid: false,
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return formatResponse(400, {
        error: `Coupon code is inactive: ${couponCode}`,
        valid: false,
      });
    }

    // Check if coupon has expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return formatResponse(400, {
        error: `Coupon code expired: ${couponCode}`,
        valid: false,
      });
    }

    // Check maximum uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return formatResponse(400, {
        error: `Coupon usage limit exceeded: ${couponCode}`,
        valid: false,
      });
    }

    // Check minimum amount requirement
    if (coupon.minAmount && amount < coupon.minAmount) {
      return formatResponse(400, {
        error: `Minimum order amount for this coupon is ₹${coupon.minAmount}`,
        valid: false,
        minAmount: coupon.minAmount,
      });
    }

    // Calculate discount based on type
    let discount = 0;

    if (coupon.type === 'flat') {
      discount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discount = Math.floor((amount * coupon.value) / 100);

      // Apply max discount cap if specified
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    }

    // Ensure discount doesn't exceed amount
    discount = Math.min(discount, amount);

    const finalAmount = amount - discount;

    return formatResponse(200, {
      message: 'Coupon validated successfully',
      valid: true,
      coupon: {
        code: coupon.couponCode,
        type: coupon.type,
        description: coupon.description,
        value: coupon.value,
      },
      originalAmount: amount,
      discount: discount,
      finalAmount: finalAmount,
      savings: `₹${discount}`,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return handleError(error, 'Failed to validate coupon');
  }
};
