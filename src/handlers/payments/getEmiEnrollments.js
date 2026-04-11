const { dynamodb, formatResponse } = require('../../utils/dynamodb');

const EMI_TABLE = process.env.EMI_ENROLLMENTS_TABLE || 'codexai-emi-enrollments-dev';

/**
 * GET /payments/emi/enrollments
 * Admin fetches EMI enrollments, optionally filtered by email or status.
 *
 * Query params:
 *   email   string?  — filter by student email
 *   status  string?  — filter by enrollmentStatus (active | completed)
 */
exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const { email, status } = qs;

    let items = [];

    if (email) {
      // Use GSI email-createdAt-index
      const result = await dynamodb
        .query({
          TableName: EMI_TABLE,
          IndexName: 'email-createdAt-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': email },
          ScanIndexForward: false, // newest first
        })
        .promise();
      items = result.Items || [];
    } else {
      // Full scan — admin view
      const result = await dynamodb.scan({ TableName: EMI_TABLE }).promise();
      items = result.Items || [];
    }

    // Optional status filter
    if (status) {
      items = items.filter((r) => r.enrollmentStatus === status);
    }

    // Annotate each record with computed summary fields
    const annotated = items.map((record) => {
      const paid = record.schedule.filter((s) => s.status === 'paid').length;
      const pending = record.schedule.filter(
        (s) => s.status !== 'paid'
      );
      const pendingAmount = pending.reduce((acc, s) => acc + s.amount, 0);
      const next = pending[0] || null;
      return {
        ...record,
        paidInstallments: paid,
        pendingAmount,
        nextInstallment: next
          ? {
              installmentNumber: next.installmentNumber,
              amount: next.amount,
              dueDate: next.dueDate,
              status: next.status,
              paymentLinkUrl: next.paymentLinkUrl || null,
            }
          : null,
      };
    });

    // Sort by createdAt desc
    annotated.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return formatResponse(200, {
      message: 'EMI enrollments fetched successfully',
      data: { enrollments: annotated, count: annotated.length },
    });
  } catch (error) {
    console.error('getEmiEnrollments error:', error);
    return formatResponse(500, { error: 'Failed to fetch EMI enrollments', details: error.message });
  }
};
