const Razorpay = require('razorpay');
const { dynamodb, formatResponse } = require('../../utils/dynamodb');
const { sendPaymentConfirmationEmail, sendSimpleWelcomeEmail } = require('../../utils/emailService');
const { v4: uuidv4 } = require('uuid');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EMI_TABLE = process.env.EMI_ENROLLMENTS_TABLE || 'codexai-emi-enrollments-dev';
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'codexai-payments-dev';
const COURSES_TABLE = process.env.COURSES_TABLE || 'codexai-courses-dev';
const USERS_TABLE = process.env.USERS_TABLE || 'codexai-users-dev';
const BATCHES_TABLE = process.env.BATCHES_TABLE || 'codexai-batches-dev';
const BROCHURES_TABLE = process.env.BROCHURES_TABLE || 'codexai-brochures-dev';

/**
 * POST /payments/emi/enroll
 * Admin enrolls a student in a course with EMI.
 *
 * 1. Fetch course → get price + emiInstallments
 * 2. Create EmiEnrollment record (schedule with N installments, status=active)
 * 3. Enroll student in the course (create/update user record)
 * 4. Create Razorpay Payment Link for installment 1
 * 5. Return enrollment record + first payment link
 *
 * Body:
 *   studentName   string   — required
 *   email         string   — required
 *   phoneNumber   string   — required
 *   courseId      string   — required
 *   userId        string   — required (Cognito sub of the registered user)
 *   dueDay        number?  — day of month for monthly installments (default 1)
 */

async function getBrochureLink(courseId) {
  try {
    const result = await dynamodb
      .query({
        TableName: BROCHURES_TABLE,
        IndexName: 'courseId-index',
        KeyConditionExpression: 'courseId = :courseId',
        ExpressionAttributeValues: { ':courseId': courseId },
        Limit: 1,
      })
      .promise();
    if (result.Items && result.Items.length > 0) return result.Items[0].brochureLink;
    return process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';
  } catch (err) {
    return process.env.DEFAULT_BROCHURE_LINK || 'https://codexai.com/brochure.pdf';
  }
}
exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const required = ['studentName', 'email', 'phoneNumber', 'courseId'];
    const missing = required.filter((f) => !body[f]);
    if (missing.length) {
      return formatResponse(400, { error: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return formatResponse(400, { error: 'Invalid email format' });
    }

    const { studentName, email, phoneNumber, courseId, userId, dueDay } = body;

    // 1. Fetch course details
    const courseResult = await dynamodb
      .get({ TableName: COURSES_TABLE, Key: { courseId } })
      .promise();

    if (!courseResult.Item) {
      return formatResponse(404, { error: `Course not found: ${courseId}` });
    }

    const course = courseResult.Item;
    const totalAmount = parseFloat(course.price);
    const totalInstallments = course.emiInstallments;

    if (!totalInstallments || totalInstallments < 2) {
      return formatResponse(400, {
        error: `Course "${course.title}" does not have EMI installments configured. Please set emiInstallments on the course first.`,
      });
    }

    const installmentAmount = Math.ceil(totalAmount / totalInstallments);

    // 2. Build installment schedule (monthly, starting next month)
    const now = new Date();
    const dayOfMonth = dueDay && dueDay > 0 && dueDay <= 28 ? dueDay : 1;

    const schedule = Array.from({ length: totalInstallments }, (_, i) => {
      const due = new Date(now.getFullYear(), now.getMonth() + i, dayOfMonth);
      // Last installment absorbs rounding diff
      const amount = i === totalInstallments - 1
        ? totalAmount - installmentAmount * (totalInstallments - 1)
        : installmentAmount;
      return {
        installmentNumber: i + 1,
        amount: Math.round(amount),
        dueDate: due.toISOString().slice(0, 10),
        status: i === 0 ? 'pending_payment' : 'scheduled',
      };
    });

    const enrollmentId = `emi_${uuidv4()}`;
    const timestamp = new Date().toISOString();

    const enrollmentRecord = {
      enrollmentId,
      studentName,
      email,
      phoneNumber,
      courseId,
      courseName: course.title,
      userId: userId || null,
      totalAmount,
      installmentAmount,
      totalInstallments,
      paidInstallments: 0,
      enrollmentStatus: 'active',
      schedule,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 3. Save enrollment record FIRST (so webhook can find it)
    await dynamodb.put({ TableName: EMI_TABLE, Item: enrollmentRecord }).promise();

    // 4. Create Razorpay Payment Link for installment 1
    const inst1 = schedule[0];
    const expireBy = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

    const linkPayload = {
      amount: inst1.amount * 100, // paise
      currency: 'INR',
      description: `${course.title} — Installment 1 of ${totalInstallments}`,
      customer: { name: studentName, email, contact: phoneNumber },
      notify: { sms: true, email: true },
      reminder_enable: true,
      expire_by: expireBy,
      callback_url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/payment-success` : undefined,
      callback_method: 'get',
      notes: {
        enrollmentId,
        courseId,
        installmentNumber: '1',
        totalInstallments: String(totalInstallments),
        studentName,
        email,
      },
    };

    let paymentLink;
    try {
      paymentLink = await razorpay.paymentLink.create(linkPayload);
    } catch (rzpErr) {
      // If Razorpay fails, still return the enrollment — admin can retry link later
      console.error('Razorpay payment link creation failed:', rzpErr.message);
      return formatResponse(201, {
        message: 'Enrollment created but payment link generation failed. Use /payments/emi/generate-link to retry.',
        data: { enrollmentId, enrollment: enrollmentRecord, paymentLinkUrl: null },
      });
    }

    // Update schedule[0] with link details
    enrollmentRecord.schedule[0] = {
      ...enrollmentRecord.schedule[0],
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.short_url,
      paymentLinkCreatedAt: timestamp,
    };
    await dynamodb.put({ TableName: EMI_TABLE, Item: enrollmentRecord }).promise();

    // 5. Create/update a payment record as 'emi_partial'
    const paymentRecord = {
      paymentId: `emi_pending_${enrollmentId}_1`,
      orderId: enrollmentId,
      email,
      fullName: studentName,
      phoneNumber,
      courseId,
      userId: userId || 'guest',
      amount: totalAmount,
      paidAmount: 0,
      pendingAmount: totalAmount,
      currency: 'INR',
      status: 'emi_partial',
      method: 'emi',
      description: `${course.title} — EMI (${totalInstallments} installments)`,
      enrollmentId,
      totalInstallments,
      paidInstallments: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      source: 'emi_enrollment',
    };

    try {
      await dynamodb.put({ TableName: PAYMENTS_TABLE, Item: paymentRecord }).promise();
    } catch (dbErr) {
      console.warn('Failed to write initial payment record:', dbErr.message);
    }

    // 6. Write initial BATCHES record for master enrollment tracking
    const batchRecord = {
      batchId: enrollmentId,
      userId: userId || 'guest',
      paymentId: `emi_pending_${enrollmentId}_1`,
      amountPaid: 0,
      pendingAmount: totalAmount,
      courseId,
      courseName: course.title,
      enrollmentDate: timestamp,
      paymentStatus: 'emi_pending',
      paymentType: 'emi',
      totalInstallments,
      paidInstallments: 0,
      studentName,
      email,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      await dynamodb.put({ TableName: BATCHES_TABLE, Item: batchRecord }).promise();
    } catch (dbErr) {
      console.warn('Failed to write BATCHES record:', dbErr.message);
    }

    // 7. Send Welcome email (same as Flow A)
    
    try {
      const brochureLink = await getBrochureLink(courseId);
      await sendSimpleWelcomeEmail({ email, fullName: studentName, course: course.title }, brochureLink);
    } catch (emailErr) {
      console.warn('Failed to send welcome email:', emailErr.message);
    }

    return formatResponse(201, {
      message: `EMI enrollment created. Payment link for installment 1 generated.`,
      data: {
        enrollmentId,
        paymentLinkUrl: paymentLink.short_url,
        installmentAmount: inst1.amount,
        totalInstallments,
        courseName: course.title,
        enrollment: enrollmentRecord,
      },
    });
  } catch (error) {
    console.error('createEmiEnrollment error:', error);
    return formatResponse(500, { error: 'Failed to create EMI enrollment', details: error.message });
  }
};
