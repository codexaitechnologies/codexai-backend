const Razorpay = require('razorpay');
const { dynamodb, formatResponse } = require('../../utils/dynamodb');
const { sendPaymentConfirmationEmail } = require('../../utils/emailService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EMI_TABLE = process.env.EMI_ENROLLMENTS_TABLE || 'codexai-emi-enrollments-dev';
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'codexai-payments-dev';
const BATCHES_TABLE = process.env.BATCHES_TABLE || 'codexai-batches-dev';

/**
 * POST /payments/emi/sync
 * Manually poll Razorpay for payment status of all pending installments
 * in an enrollment. Updates DynamoDB without relying on webhooks.
 *
 * Body:
 *   enrollmentId  string  — required
 */
exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { enrollmentId } = body || {};

    if (!enrollmentId) {
      return formatResponse(400, { error: 'Missing required field: enrollmentId' });
    }

    // Fetch enrollment
    const result = await dynamodb
      .get({ TableName: EMI_TABLE, Key: { enrollmentId } })
      .promise();

    if (!result.Item) {
      return formatResponse(404, { error: `Enrollment not found: ${enrollmentId}` });
    }

    const enrollment = { ...result.Item };
    const now = new Date().toISOString();
    let changed = false;
    const syncLog = [];

    for (let i = 0; i < enrollment.schedule.length; i++) {
      const inst = enrollment.schedule[i];

      // Skip already paid or ones without a payment link
      if (inst.status === 'paid' || !inst.paymentLinkId) {
        syncLog.push({
          installmentNumber: inst.installmentNumber,
          skipped: true,
          reason: inst.status === 'paid' ? 'already_paid' : 'no_payment_link',
        });
        continue;
      }

      try {
        // Fetch payment link status from Razorpay
        const link = await razorpay.paymentLink.fetch(inst.paymentLinkId);

        syncLog.push({
          installmentNumber: inst.installmentNumber,
          razorpayStatus: link.status,
          amount: link.amount / 100,
        });

        if (link.status === 'paid') {
          // Try to get the payment ID from the payments sub-entity
          let paymentId = null;
          let paidAt = now;

          try {
            const paymentsResp = await razorpay.paymentLink.fetchPayments(inst.paymentLinkId);
            const payments = paymentsResp?.items || [];
            // Pick the captured/authorized payment
            const captured = payments.find(
              (p) => p.status === 'captured' || p.status === 'authorized'
            );
            if (captured) {
              paymentId = captured.id;
              paidAt = captured.created_at
                ? new Date(captured.created_at * 1000).toISOString()
                : now;
            }
          } catch (payErr) {
            console.warn(`Could not fetch payments for link ${inst.paymentLinkId}:`, payErr.message);
          }

          enrollment.schedule[i] = {
            ...inst,
            status: 'paid',
            paymentId,
            paidAt,
            syncedAt: now,
          };
          changed = true;

          // Send payment confirmation email for this installment
          try {
            await sendPaymentConfirmationEmail({
              email: enrollment.email,
              fullName: enrollment.studentName,
              courseName: enrollment.courseName,
              paymentId: paymentId || `emi_sync_${enrollmentId}_${inst.installmentNumber}`,
              orderId: enrollmentId,
              amount: inst.amount,
              currency: 'INR',
              method: 'EMI',
              paidAt,
            });
          } catch (emailErr) {
            console.warn(
              `Failed to send payment confirmation email for installment ${inst.installmentNumber}:`,
              emailErr.message
            );
          }
        }
      } catch (rzpErr) {
        console.error(`Failed to fetch link ${inst.paymentLinkId}:`, rzpErr.message);
        syncLog.push({
          installmentNumber: inst.installmentNumber,
          error: rzpErr.message,
        });
      }
    }

    if (changed) {
      const paidCount = enrollment.schedule.filter((s) => s.status === 'paid').length;
      const allPaid = paidCount >= enrollment.totalInstallments;

      enrollment.paidInstallments = paidCount;
      enrollment.enrollmentStatus = allPaid ? 'completed' : 'active';
      enrollment.updatedAt = now;

      await dynamodb.put({ TableName: EMI_TABLE, Item: enrollment }).promise();

      // Update PAYMENTS_TABLE record
      const paidAmount = enrollment.schedule
        .filter((s) => s.status === 'paid')
        .reduce((acc, s) => acc + s.amount, 0);

      try {
        await dynamodb
          .update({
            TableName: PAYMENTS_TABLE,
            Key: { paymentId: `emi_pending_${enrollmentId}_1` },
            UpdateExpression:
              'SET #status = :status, paidInstallments = :paid, paidAmount = :paidAmt, pendingAmount = :pendingAmt, updatedAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': allPaid ? 'completed' : 'emi_partial',
              ':paid': paidCount,
              ':paidAmt': paidAmount,
              ':pendingAmt': enrollment.totalAmount - paidAmount,
              ':now': now,
            },
          })
          .promise();
      } catch (dbErr) {
        console.warn('Failed to update payment record:', dbErr.message);
      }

      // Update BATCHES master enrollment table
      try {
        const paidAmountBatch = enrollment.schedule
          .filter((s) => s.status === 'paid')
          .reduce((acc, s) => acc + s.amount, 0);
        await dynamodb.update({
          TableName: BATCHES_TABLE,
          Key: { batchId: enrollmentId },
          UpdateExpression:
            'SET amountPaid = :paidAmt, pendingAmount = :pendingAmt, paymentStatus = :status, paidInstallments = :paid, updatedAt = :now',
          ExpressionAttributeValues: {
            ':paidAmt': paidAmountBatch,
            ':pendingAmt': enrollment.totalAmount - paidAmountBatch,
            ':status': allPaid ? 'completed' : 'emi_partial',
            ':paid': paidCount,
            ':now': now,
          },
        }).promise();
      } catch (batchErr) {
        console.warn('Failed to update BATCHES record during sync:', batchErr.message);
      }

      return formatResponse(200, {
        message: `Sync complete. ${paidCount}/${enrollment.totalInstallments} installments paid.`,
        data: {
          enrollmentId,
          paidInstallments: paidCount,
          totalInstallments: enrollment.totalInstallments,
          enrollmentStatus: enrollment.enrollmentStatus,
          newlyMarkedPaid: enrollment.schedule
            .filter((s) => s.status === 'paid' && s.syncedAt === now)
            .map((s) => s.installmentNumber),
          enrollment,
          syncLog,
        },
      });
    }

    return formatResponse(200, {
      message: 'Sync complete. No changes — all pending installments are still unpaid on Razorpay.',
      data: {
        enrollmentId,
        paidInstallments: enrollment.paidInstallments,
        totalInstallments: enrollment.totalInstallments,
        enrollmentStatus: enrollment.enrollmentStatus,
        enrollment,
        syncLog,
      },
    });
  } catch (error) {
    console.error('syncEmiInstallments error:', error);
    return formatResponse(500, { error: 'Sync failed', details: error.message });
  }
};
