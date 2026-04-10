const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const BROCHURE_ENQUIRIES_TABLE = process.env.BROCHURE_ENQUIRIES_TABLE || 'brochure-enquiries-dev';

/**
 * List all brochure enquiries with optional filtering and pagination
 * Query parameters:
 *   - limit: number (default: 20, max: 100)
 *   - lastKey: string (for pagination, base64 encoded)
 *   - status: string (filter by status: pending, brochure-sent, contacted)
 *   - courseId: string (filter by courseId)
 * Returns: array of enquiries with pagination token
 */
exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    let limit = parseInt(queryParams.limit) || 20;
    const status = queryParams.status;
    const courseId = queryParams.courseId;
    const lastKey = queryParams.lastKey ? JSON.parse(Buffer.from(queryParams.lastKey, 'base64').toString()) : undefined;

    // Validate limit
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;

    let params = {
      TableName: BROCHURE_ENQUIRIES_TABLE,
      Limit: limit,
    };

    // Add pagination
    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    // Build filter expression
    let filterExpressions = [];
    let expressionAttributeValues = {};

    if (status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = status;
    }

    if (courseId) {
      filterExpressions.push('courseId = :courseId');
      expressionAttributeValues[':courseId'] = courseId;
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      if (status) {
        params.ExpressionAttributeNames = { '#status': 'status' };
      }
    }

    // Scan table
    const result = await dynamodb.scan(params).promise();

    // Encode last key for pagination
    let nextKey = null;
    if (result.LastEvaluatedKey) {
      nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return formatResponse(200, {
      enquiries: result.Items,
      count: result.Items.length,
      total: result.Count,
      lastEvaluatedKey: nextKey,
    });
  } catch (error) {
    return handleError(error);
  }
};
