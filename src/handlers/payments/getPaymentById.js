const { dynamodb, formatResponse, handleError } = require('../../utils/dynamodb');

const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'payments-dev';

/**
 * Get a single payment by paymentId
 * Path parameter: paymentId (Razorpay payment ID)
 */
exports.handler = async (event) => {
  try {
    // Get paymentId from path parameter
    const paymentId = event.pathParameters?.paymentId;

    if (!paymentId) {
      return formatResponse(400, {
        error: 'Missing required path parameter: paymentId',
      });
    }

    const params = {
      TableName: PAYMENTS_TABLE,
      Key: {
        paymentId: paymentId,
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: `Payment not found with ID: ${paymentId}`,
      });
    }

    return formatResponse(200, {
      message: 'Payment retrieved successfully',
      data: result.Item,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    return handleError(error);
  }
};
