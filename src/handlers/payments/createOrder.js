const Razorpay = require('razorpay');
const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');
const { validateAndApplyCoupon } = require('../../utils/coupon');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order for payment
 * Required fields: amount, currency, email, fullName, phoneNumber, description, courseId
 * Optional fields: couponCode (applies discount if valid)
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    const required = ['amount', 'currency', 'email', 'fullName', 'phoneNumber', 'description', 'courseId'];
    const missing = required.filter((field) => !body[field]);

    if (missing.length > 0) {
      return formatResponse(400, {
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return formatResponse(400, {
        error: 'Invalid email format',
      });
    }

    // Validate amount (must be in paise, minimum 1 INR = 100 paise)
    const amount = Math.floor(body.amount * 100); // Convert to paise
    if (amount < 100) {
      return formatResponse(400, {
        error: 'Minimum order amount is ₹1',
      });
    }

    // Validate and apply coupon if provided (optional)
    let couponApplied = null;
    let finalAmount = body.amount;

    if (body.couponCode) {
      const couponsTable = process.env.COUPONS_TABLE;

      try {
        // Fetch coupon from database
        const couponParams = {
          TableName: couponsTable,
          Key: {
            couponCode: body.couponCode.toUpperCase(),
          },
        };

        const couponResult = await dynamodb.get(couponParams).promise();

        if (!couponResult.Item) {
          return formatResponse(400, {
            error: `Invalid coupon code: ${body.couponCode}`,
          });
        }

        // Validate coupon
        const couponValidation = validateAndApplyCoupon(couponResult.Item, body.amount);

        if (!couponValidation.isValid) {
          return formatResponse(400, {
            error: couponValidation.message,
          });
        }

        finalAmount = couponValidation.finalAmount;
        couponApplied = couponValidation.couponDetails;
      } catch (error) {
        console.error('Coupon lookup error:', error);
        return formatResponse(500, {
          error: 'Error validating coupon. Please try without coupon.',
        });
      }
    }

    // Convert final amount to paise for Razorpay
    const finalAmountInPaise = Math.floor(finalAmount * 100);

    // Validate currency
    const allowedCurrencies = ['INR', 'USD', 'GBP', 'EUR'];
    if (!allowedCurrencies.includes(body.currency)) {
      return formatResponse(400, {
        error: `Currency must be one of: ${allowedCurrencies.join(', ')}`,
      });
    }

    // Generate unique receipt ID (max 40 characters for Razorpay)
    const receiptId = `rec_${uuidv4().replace(/-/g, '').substring(0, 32)}`;

    // Create order in Razorpay
    const orderData = {
      amount: finalAmountInPaise, // Amount in paise after discount
      currency: body.currency,
      receipt: receiptId,
      description: body.description,
      notes: {
        courseId: body.courseId,
        email: body.email,
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        userId: body.userId || 'guest',
        originalAmount: body.amount,
        finalAmount: finalAmount,
        couponCode: body.couponCode || null,
        discount: body.amount - finalAmount,
      },
    };

    const order = await razorpay.orders.create(orderData);

    // Add order to frontend data
    const orderResponse = {
      id: order.id,
      entity: order.entity,
      amount: order.amount / 100, // Convert back to rupees for frontend
      originalAmount: body.amount,
      discount: body.amount - finalAmount,
      amountPaid: order.amount_paid / 100,
      amountDue: order.amount_due / 100,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      attempts: order.attempts,
      notes: order.notes,
      coupon: couponApplied,
      createdAt: new Date(order.created_at * 1000).toISOString(),
      expiresAt: new Date((order.created_at + 1800) * 1000).toISOString(), // 30 min expiry
      shortUrl: order.short_url,
      // Additional metadata for frontend
      paymentDetails: {
        email: body.email,
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        courseId: body.courseId,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    };

    return formatResponse(200, {
      message: 'Order created successfully',
      order: orderResponse,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);

    if (error.statusCode === 400) {
      return formatResponse(400, {
        error: error.message || 'Invalid request parameters',
      });
    }

    if (error.statusCode === 401) {
      return formatResponse(401, {
        error: 'Razorpay authentication failed. Check API credentials.',
      });
    }

    if (error.statusCode === 429) {
      return formatResponse(429, {
        error: 'Too many requests. Please try again later.',
      });
    }

    return handleError(error);
  }
};
