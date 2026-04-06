const AWS = require('aws-sdk');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { formatResponse, handleError, dynamodb } = require('../utils/dynamodb');
const { sendWelcomeEmail } = require('../utils/emailService');

const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || `payments-${process.env.STAGE || 'dev'}`;
const USERS_TABLE = process.env.USERS_TABLE || `users-${process.env.STAGE || 'dev'}`;
const BROCHURES_TABLE = process.env.BROCHURES_TABLE || `brochures-${process.env.STAGE || 'dev'}`;

/**
 * Razorpay Webhook Handler
 * Acts as a backup verification safety net - if frontend payment flow fails,
 * this webhook ensures enrollment still happens.
 * 
 * Razorpay sends webhooks for events like:
 * - payment.authorized: Payment successful
 * - payment.failed: Payment failed
 * - payment.captured: Payment captured (most common for subscription completion)
 * 
 * Endpoint: POST /api/razorpay/webhook
 */
exports.handler = async (event) => {
  try {
    // Razorpay sends raw body as string
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const signature = event.headers['x-razorpay-signature'];

    // Validate signature is present
    if (!signature) {
      console.warn('Missing Razorpay signature header');
      return formatResponse(400, {
        error: 'Missing X-Razorpay-Signature header',
      });
    }

    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(event.body, signature);

    if (!isValidSignature) {
      console.warn('Invalid webhook signature - possible tampering attempt');
      return formatResponse(400, {
        error: 'Invalid webhook signature',
      });
    }

    console.log('Webhook event received:', body.event);

    // Handle different webhook events
    switch (body.event) {
      case 'payment.authorized':
        return await handlePaymentAuthorized(body.payload.payment);

      case 'payment.failed':
        return await handlePaymentFailed(body.payload.payment);

      case 'order.paid':
        return await handleOrderPaid(body.payload.order);

      default:
        // Acknowledge other webhook events but don't process
        console.log('Unhandled webhook event:', body.event);
        return formatResponse(200, {
          message: 'Webhook received',
          event: body.event,
        });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Always return 200 to Razorpay to prevent retries for processing errors
    return formatResponse(200, {
      message: 'Webhook acknowledged with error',
      error: error.message,
    });
  }
};

/**
 * Verify Razorpay webhook signature
 * Razorpay signature = HMAC-SHA256(body, key_secret)
 */
function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Handle payment.authorized webhook event
 * Called when payment is successfully authorized by Razorpay
 */
async function handlePaymentAuthorized(payment) {
  try {
    const paymentId = payment.id;
    const orderId = payment.order_id;
    const email = payment.email;

    console.log('Processing payment.authorized:', { paymentId, orderId, email });

    // Get order notes which contain course and user info
    const orderNotes = payment.notes || {};

    // Validate essential data
    if (!email || !orderNotes.courseId) {
      console.warn('Missing email or courseId in payment', {
        email,
        courseId: orderNotes.courseId,
      });
      return formatResponse(200, {
        message: 'Webhook processed - missing enrollment data',
        paymentId,
      });
    }

    const courseId = orderNotes.courseId;
    const fullName = orderNotes.fullName || 'Student';
    const phoneNumber = orderNotes.phoneNumber || 'Not provided';
    const courseName = orderNotes.course || 'Course';

    // Check if payment already processed by webhook
    const existingPayment = await getPaymentByPaymentId(paymentId);
    if (existingPayment && existingPayment.webhookProcessed) {
      console.log('Payment already processed by webhook:', paymentId);
      return formatResponse(200, {
        message: 'Payment already processed',
        paymentId,
      });
    }

    // Create or update payment record with webhook confirmation
    const paymentRecord = {
      paymentId,
      orderId,
      email,
      fullName,
      phoneNumber,
      courseId,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      status: payment.status,
      method: payment.method || 'unknown',
      description: payment.description || courseName,
      createdAt: new Date(payment.created_at * 1000).toISOString(),
      webhookReceivedAt: new Date().toISOString(),
      webhookProcessed: true,
      webhookEvent: 'payment.authorized',
      source: 'webhook',
    };

    // Save payment record
    try {
      await dynamodb
        .put({
          TableName: PAYMENTS_TABLE,
          Item: paymentRecord,
        })
        .promise();
      console.log('Payment record saved via webhook:', paymentId);
    } catch (dbError) {
      console.error('Failed to save payment via webhook:', dbError);
    }

    // Enroll user in course (create user record if not exists)
    const enrollmentResult = await enrollUserInCourse({
      email,
      fullName,
      phoneNumber,
      courseId,
      courseName,
      paymentId,
    });

    return formatResponse(200, {
      message: 'Webhook processed successfully',
      paymentId,
      enrolled: enrollmentResult.enrolled,
      enrollment: enrollmentResult.enrollment,
    });
  } catch (error) {
    console.error('Payment authorized webhook error:', error);
    return formatResponse(200, {
      message: 'Webhook acknowledged with processing error',
      error: error.message,
    });
  }
}

/**
 * Handle payment.failed webhook event
 * Called when payment fails
 */
async function handlePaymentFailed(payment) {
  try {
    const paymentId = payment.id;
    const orderId = payment.order_id;
    const email = payment.email;
    const reason = payment.description || payment.reason || 'Unknown reason';

    console.log('Processing payment.failed:', { paymentId, orderId, email, reason });

    // Store failed payment record for tracking
    const failedPaymentRecord = {
      paymentId,
      orderId,
      email,
      status: 'failed',
      reason,
      createdAt: new Date(payment.created_at * 1000).toISOString(),
      webhookReceivedAt: new Date().toISOString(),
      webhookEvent: 'payment.failed',
      source: 'webhook',
    };

    try {
      await dynamodb
        .put({
          TableName: PAYMENTS_TABLE,
          Item: failedPaymentRecord,
        })
        .promise();
      console.log('Failed payment record saved:', paymentId);
    } catch (dbError) {
      console.error('Failed to save failed payment record:', dbError);
    }

    return formatResponse(200, {
      message: 'Failed payment recorded',
      paymentId,
      status: 'failed',
    });
  } catch (error) {
    console.error('Payment failed webhook error:', error);
    return formatResponse(200, {
      message: 'Webhook acknowledged',
      error: error.message,
    });
  }
}

/**
 * Handle order.paid webhook event
 * Called when order payment is confirmed
 */
async function handleOrderPaid(order) {
  try {
    const orderId = order.id;
    console.log('Processing order.paid:', orderId);

    // Get order notes
    const notes = order.notes || {};
    const email = notes.email || 'unknown';

    // Check if already processed
    const existingPayment = await getPaymentByOrderId(orderId);
    if (existingPayment && existingPayment.webhookProcessed) {
      console.log('Order already processed:', orderId);
      return formatResponse(200, {
        message: 'Order already processed',
        orderId,
      });
    }

    // Enroll user if we have necessary data
    if (email && notes.courseId) {
      const enrollmentResult = await enrollUserInCourse({
        email: notes.email,
        fullName: notes.fullName || 'Student',
        phoneNumber: notes.phoneNumber || 'Not provided',
        courseId: notes.courseId,
        courseName: notes.course || 'Course',
        orderId,
      });

      return formatResponse(200, {
        message: 'Order paid - enrollment processed',
        orderId,
        enrolled: enrollmentResult.enrolled,
      });
    }

    return formatResponse(200, {
      message: 'Order paid webhook received',
      orderId,
    });
  } catch (error) {
    console.error('Order paid webhook error:', error);
    return formatResponse(200, {
      message: 'Webhook acknowledged',
      error: error.message,
    });
  }
}

/**
 * Get payment record by payment ID
 */
async function getPaymentByPaymentId(paymentId) {
  try {
    const result = await dynamodb
      .get({
        TableName: PAYMENTS_TABLE,
        Key: { paymentId },
      })
      .promise();

    return result.Item;
  } catch (error) {
    console.warn('Failed to get payment by ID:', error.message);
    return null;
  }
}

/**
 * Get payment record by order ID
 */
async function getPaymentByOrderId(orderId) {
  try {
    const result = await dynamodb
      .query({
        TableName: PAYMENTS_TABLE,
        IndexName: 'orderId-index',
        KeyConditionExpression: 'orderId = :orderId',
        ExpressionAttributeValues: {
          ':orderId': orderId,
        },
        Limit: 1,
      })
      .promise();

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.warn('Failed to get payment by order ID:', error.message);
    return null;
  }
}

/**
 * Enroll user in course by creating user record and sending welcome email
 * Returns { enrolled: boolean, enrollment: object }
 */
async function enrollUserInCourse({ email, fullName, phoneNumber, courseId, courseName, paymentId, orderId }) {
  try {
    // Check if user with email already exists
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      console.log('User already exists:', email);
      // Send welcome email again
      try {
        const brochure = await getBrochureLink(courseId);
        await sendWelcomeEmail(
          {
            email,
            fullName: existingUser.fullName,
            course: existingUser.course,
          },
          brochure
        );
        console.log('Welcome email sent to existing user:', email);
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError.message);
      }

      return {
        enrolled: false,
        enrollment: {
          status: 'existing',
          email,
          message: 'User already enrolled',
        },
      };
    }

    // Create new user record
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const userItem = {
      userId,
      fullName,
      email,
      phoneNumber,
      course: courseName,
      courseId,
      enrollmentSource: 'webhook',
      paymentId,
      orderId,
      enrolled: true,
      enrolledAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Save user
    await dynamodb
      .put({
        TableName: USERS_TABLE,
        Item: userItem,
      })
      .promise();

    console.log('User enrolled via webhook:', userId, email);

    // Send welcome email
    try {
      const brochure = await getBrochureLink(courseId);
      await sendWelcomeEmail(
        {
          email,
          fullName,
          course: courseName,
        },
        brochure
      );
      console.log('Welcome email sent:', email);
    } catch (emailError) {
      console.warn('Failed to send welcome email after enrollment:', emailError.message);
      // Continue anyway - enrollment is still successful
    }

    return {
      enrolled: true,
      enrollment: {
        status: 'new',
        userId,
        email,
        course: courseName,
        enrolledAt: timestamp,
      },
    };
  } catch (error) {
    console.error('User enrollment error:', error);
    return {
      enrolled: false,
      enrollment: {
        status: 'error',
        error: error.message,
      },
    };
  }
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  try {
    const result = await dynamodb
      .scan({
        TableName: USERS_TABLE,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
        Limit: 1,
      })
      .promise();

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.warn('Failed to get user by email:', error.message);
    return null;
  }
}

/**
 * Get brochure link by course ID
 */
async function getBrochureLink(courseId) {
  try {
    const result = await dynamodb
      .query({
        TableName: BROCHURES_TABLE,
        IndexName: 'courseId-index',
        KeyConditionExpression: 'courseId = :courseId',
        ExpressionAttributeValues: {
          ':courseId': courseId,
        },
        Limit: 1,
      })
      .promise();

    if (result.Items && result.Items.length > 0) {
      return result.Items[0].brochureLink;
    }

    return process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';
  } catch (error) {
    console.warn('Failed to get brochure link:', error.message);
    return process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';
  }
}
