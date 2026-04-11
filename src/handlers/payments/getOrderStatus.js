const Razorpay = require('razorpay');
const { formatResponse, handleError } = require('../../utils/dynamodb');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Get order status from Razorpay
 * Required fields: orderId
 */
exports.handler = async (event) => {
  try {
    const orderId = event.pathParameters?.orderId;

    if (!orderId) {
      return formatResponse(400, {
        error: 'Missing required parameter: orderId',
      });
    }

    // Validate order ID format
    if (!orderId.startsWith('order_')) {
      return formatResponse(400, {
        error: 'Invalid order ID format',
      });
    }

    // Fetch order from Razorpay
    const order = await razorpay.orders.fetch(orderId);

    return formatResponse(200, {
      message: 'Order details retrieved successfully',
      order: {
        id: order.id,
        entity: order.entity,
        amount: order.amount / 100,
        amountPaid: order.amount_paid / 100,
        amountDue: order.amount_due / 100,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        attempts: order.attempts,
        notes: order.notes,
        createdAt: new Date(order.created_at * 1000).toISOString(),
        paymentId: order.payment_id || null,
        shortUrl: order.short_url,
      },
    });
  } catch (error) {
    console.error('Order fetch error:', error);

    if (error.statusCode === 400) {
      return formatResponse(404, {
        error: 'Order not found',
      });
    }

    if (error.statusCode === 401) {
      return formatResponse(401, {
        error: 'Razorpay authentication failed',
      });
    }

    return handleError(error);
  }
};
