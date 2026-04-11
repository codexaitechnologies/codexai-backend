const Razorpay = require('razorpay');
const { formatResponse, handleError, dynamodb } = require('../../utils/dynamodb');
const { sendPaymentConfirmationEmail } = require('../../utils/emailService');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || `payments-${process.env.STAGE || 'dev'}`;
const COURSES_TABLE = process.env.COURSES_TABLE;

/**
 * Verify Razorpay payment signature and confirm payment
 * Required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return formatResponse(400, {
        error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
      });
    }

    // Verify signature
    const shaSum = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest('hex');

    const isValidSignature = shaSum === body.razorpay_signature;

    if (!isValidSignature) {
      console.warn('Invalid payment signature:', {
        orderId: body.razorpay_order_id,
        paymentId: body.razorpay_payment_id,
      });

      return formatResponse(401, {
        error: 'Payment signature verification failed. Payment might be compromised.',
        valid: false,
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(body.razorpay_payment_id);

    // Verify payment status
    if (payment.status !== 'captured') {
      return formatResponse(400, {
        error: `Payment status is ${payment.status}. Expected: captured`,
        paymentId: body.razorpay_payment_id,
        valid: false,
      });
    }

    // Get order details from Razorpay
    const order = await razorpay.orders.fetch(body.razorpay_order_id);

    // Create payment record in DynamoDB
    const paymentRecord = {
      paymentId: body.razorpay_payment_id,
      orderId: body.razorpay_order_id,
      email: payment.email || order.notes?.email || 'unknown',
      fullName: order.notes?.fullName || 'Unknown',
      phoneNumber: order.notes?.phoneNumber || 'Unknown',
      courseId: order.notes?.courseId,
      userId: order.notes?.userId || 'guest',
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      description: order.description,
      invoiceId: payment.invoice_id,
      createdAt: new Date(payment.created_at * 1000).toISOString(),
      verifiedAt: new Date().toISOString(),
      metadata: order.notes,
    };

    // Try to save to DynamoDB (optional - for tracking payments)
    try {
      await dynamodb
        .put({
          TableName: PAYMENTS_TABLE,
          Item: paymentRecord,
        })
        .promise();
      console.log('Payment record saved to DynamoDB');
    } catch (dbError) {
      console.warn('Failed to save payment to DynamoDB:', dbError);
      // Continue anyway - payment verification is still successful
    }

    // Resolve course name from DynamoDB if courseId available
    let courseName = order.notes?.courseName || order.description || 'CodexAI Course';
    if (!order.notes?.courseName && paymentRecord.courseId && COURSES_TABLE) {
      try {
        const courseResult = await dynamodb
          .get({ TableName: COURSES_TABLE, Key: { courseId: paymentRecord.courseId } })
          .promise();
        if (courseResult.Item?.title) {
          courseName = courseResult.Item.title;
        }
      } catch (courseErr) {
        console.warn('Could not fetch course name:', courseErr.message);
      }
    }

    // Send payment confirmation email to the user
    try {
      await sendPaymentConfirmationEmail({
        email: paymentRecord.email,
        fullName: paymentRecord.fullName,
        courseName,
        paymentId: body.razorpay_payment_id,
        orderId: body.razorpay_order_id,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        method: payment.method,
        paidAt: paymentRecord.createdAt,
      });
      console.log('Payment confirmation email sent to:', paymentRecord.email);
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError.message);
      // Non-blocking — payment is already verified
    }

    return formatResponse(200, {
      message: 'Payment verified successfully',
      valid: true,
      payment: {
        paymentId: body.razorpay_payment_id,
        orderId: body.razorpay_order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        description: order.description,
        courseId: order.notes?.courseId,
        userId: order.notes?.userId,
        createdAt: new Date(payment.created_at * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);

    if (error.statusCode === 400) {
      return formatResponse(400, {
        error: error.message || 'Invalid payment or order ID',
        valid: false,
      });
    }

    if (error.statusCode === 401) {
      return formatResponse(401, {
        error: 'Razorpay authentication failed',
        valid: false,
      });
    }

    return handleError(error);
  }
};
