const Razorpay = require('razorpay');
const { formatResponse } = require('../../utils/dynamodb');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /payments/create-link
 * Creates a Razorpay Payment Link with dynamic amount and customer details.
 *
 * Body:
 *   amount       number  — amount in rupees (required)
 *   description  string  — what the payment is for (required)
 *   email        string  — customer email (required)
 *   phoneNumber  string  — customer phone, e.g. +91XXXXXXXXXX (required)
 *   name         string  — customer name (optional)
 *   expireInDays number  — link expiry in days from now, default 7 (optional)
 *   callbackUrl  string  — redirect URL after payment (optional)
 *   notes        object  — any extra key-value metadata (optional)
 */
exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    // Validate required fields
    const required = ['amount', 'description', 'email', 'phoneNumber'];
    const missing = required.filter((f) => !body[f]);
    if (missing.length) {
      return formatResponse(400, { error: `Missing required fields: ${missing.join(', ')}` });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return formatResponse(400, { error: 'Invalid email format' });
    }

    const { amount, description, email, phoneNumber, name, expireInDays, callbackUrl, notes } = body;

    if (amount <= 0) {
      return formatResponse(400, { error: 'Amount must be greater than 0' });
    }

    // Link expires in `expireInDays` days (default 7)
    const expireDays = expireInDays && expireInDays > 0 ? expireInDays : 7;
    const expireBy = Math.floor(Date.now() / 1000) + expireDays * 24 * 60 * 60;

    const linkPayload = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      description,
      customer: {
        name: name || '',
        email,
        contact: phoneNumber,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      expire_by: expireBy,
      notes: notes && typeof notes === 'object' ? notes : {},
    };

    if (callbackUrl) {
      linkPayload.callback_url = callbackUrl;
      linkPayload.callback_method = 'get';
    }

    const paymentLink = await razorpay.paymentLink.create(linkPayload);

    return formatResponse(201, {
      message: 'Payment link created successfully',
      data: {
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url,
        amount,
        description,
        expiresAt: new Date(expireBy * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('createPaymentLink error:', error);
    return formatResponse(500, {
      error: 'Failed to create payment link',
      details: error.message,
    });
  }
};
