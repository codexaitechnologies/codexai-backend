const Razorpay = require('razorpay');
const { dynamodb, formatResponse } = require('../../utils/dynamodb');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EMI_TABLE = process.env.EMI_ENROLLMENTS_TABLE || 'codexai-emi-enrollments-dev';

/**
 * POST /payments/emi/generate-link
 * Admin generates a Razorpay Payment Link for a specific pending/scheduled installment.
 *
 * Body:
 *   enrollmentId      string  — required
 *   installmentNumber number  — required (1, 2, 3 …)
 */
exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const { enrollmentId, installmentNumber } = body || {};

    if (!enrollmentId || !installmentNumber) {
      return formatResponse(400, { error: 'Missing required fields: enrollmentId, installmentNumber' });
    }

    // Fetch the enrollment record
    const result = await dynamodb
      .get({ TableName: EMI_TABLE, Key: { enrollmentId } })
      .promise();

    if (!result.Item) {
      return formatResponse(404, { error: `Enrollment not found: ${enrollmentId}` });
    }

    const enrollment = result.Item;

    if (enrollment.enrollmentStatus === 'completed') {
      return formatResponse(400, { error: 'All installments for this enrollment have been paid.' });
    }

    const idx = installmentNumber - 1;
    const installment = enrollment.schedule[idx];

    if (!installment) {
      return formatResponse(400, {
        error: `Installment ${installmentNumber} does not exist. Total installments: ${enrollment.totalInstallments}`,
      });
    }

    if (installment.status === 'paid') {
      return formatResponse(400, { error: `Installment ${installmentNumber} is already paid.` });
    }

    // Check previous installments are paid (enforce order)
    if (installmentNumber > 1) {
      const prevInstallment = enrollment.schedule[idx - 1];
      if (prevInstallment.status !== 'paid') {
        return formatResponse(400, {
          error: `Installment ${installmentNumber - 1} must be paid before generating link for installment ${installmentNumber}.`,
        });
      }
    }

    const expireBy = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
    const now = new Date().toISOString();

    const linkPayload = {
      amount: installment.amount * 100, // paise
      currency: 'INR',
      description: `${enrollment.courseName} — Installment ${installmentNumber} of ${enrollment.totalInstallments}`,
      customer: {
        name: enrollment.studentName,
        email: enrollment.email,
        contact: enrollment.phoneNumber,
      },
      notify: { sms: true, email: true },
      reminder_enable: true,
      expire_by: expireBy,
      callback_url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/payment-success` : undefined,
      callback_method: 'get',
      notes: {
        enrollmentId,
        courseId: enrollment.courseId,
        installmentNumber: String(installmentNumber),
        totalInstallments: String(enrollment.totalInstallments),
        studentName: enrollment.studentName,
        email: enrollment.email,
      },
    };

    const paymentLink = await razorpay.paymentLink.create(linkPayload);

    // Save payment link details back to schedule
    enrollment.schedule[idx] = {
      ...installment,
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.short_url,
      paymentLinkCreatedAt: now,
      status: 'pending_payment',
    };
    enrollment.updatedAt = now;

    await dynamodb.put({ TableName: EMI_TABLE, Item: enrollment }).promise();

    return formatResponse(200, {
      message: `Payment link for installment ${installmentNumber} generated successfully.`,
      data: {
        enrollmentId,
        installmentNumber,
        paymentLinkUrl: paymentLink.short_url,
        paymentLinkId: paymentLink.id,
        amount: installment.amount,
        dueDate: installment.dueDate,
      },
    });
  } catch (error) {
    console.error('generateInstallmentLink error:', error);
    return formatResponse(500, { error: 'Failed to generate payment link', details: error.message });
  }
};
