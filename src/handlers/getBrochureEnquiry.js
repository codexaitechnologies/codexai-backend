const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const BROCHURE_ENQUIRIES_TABLE = process.env.BROCHURE_ENQUIRIES_TABLE || 'brochure-enquiries-dev';

/**
 * Get a single brochure enquiry by enquiryId
 * Path parameter: enquiryId
 * Returns: enquiry object
 */
exports.handler = async (event) => {
  try {
    const enquiryId = event.pathParameters?.enquiryId;

    if (!enquiryId) {
      return formatResponse(400, {
        error: 'Missing required path parameter: enquiryId',
      });
    }

    const params = {
      TableName: BROCHURE_ENQUIRIES_TABLE,
      Key: { enquiryId },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return formatResponse(404, {
        error: `Brochure enquiry with ID ${enquiryId} not found`,
      });
    }

    return formatResponse(200, {
      enquiry: result.Item,
    });
  } catch (error) {
    return handleError(error);
  }
};
