const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'support-tickets-dev';

/**
 * List support queries (tickets) with pagination and optional filters.
 * GET /support/queries
 *
 * Query parameters:
 *  - limit: number (default 20, max 100)
 *  - lastEvaluatedKey: base64 JSON (pagination token)
 *  - status: string (optional) -> uses status-createdAt-index
 *  - email: string (optional) -> uses email-createdAt-index
 */
exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};

    let limit = parseInt(queryParams.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    let exclusiveStartKey = undefined;
    if (queryParams.lastEvaluatedKey) {
      try {
        const decodedKey = Buffer.from(queryParams.lastEvaluatedKey, 'base64').toString('utf-8');
        exclusiveStartKey = JSON.parse(decodedKey);
      } catch (e) {
        return formatResponse(400, {
          error: 'Invalid lastEvaluatedKey format. Must be base64-encoded JSON.',
        });
      }
    }

    const status = queryParams.status ? String(queryParams.status).toLowerCase() : undefined;
    const email = queryParams.email ? String(queryParams.email).trim().toLowerCase() : undefined;

    // Prefer email filter over status filter if both provided.
    if (email) {
      const params = {
        TableName: SUPPORT_TICKETS_TABLE,
        IndexName: 'email-createdAt-index',
        KeyConditionExpression: '#email = :email',
        ExpressionAttributeNames: { '#email': 'email' },
        ExpressionAttributeValues: { ':email': email },
        Limit: limit,
        ScanIndexForward: false, // latest first
      };
      if (exclusiveStartKey) params.ExclusiveStartKey = exclusiveStartKey;

      const result = await dynamodb.query(params).promise();

      const response = {
        message: 'Support queries retrieved successfully',
        count: result.Items ? result.Items.length : 0,
        total: result.Count || 0,
        scannedCount: result.ScannedCount || 0,
        tickets: result.Items || [],
      };

      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }

      return formatResponse(200, response);
    }

    if (status) {
      const params = {
        TableName: SUPPORT_TICKETS_TABLE,
        IndexName: 'status-createdAt-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Limit: limit,
        ScanIndexForward: false,
      };
      if (exclusiveStartKey) params.ExclusiveStartKey = exclusiveStartKey;

      const result = await dynamodb.query(params).promise();

      const response = {
        message: 'Support queries retrieved successfully',
        count: result.Items ? result.Items.length : 0,
        total: result.Count || 0,
        scannedCount: result.ScannedCount || 0,
        tickets: result.Items || [],
      };

      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }

      return formatResponse(200, response);
    }

    // No filter: scan table (pagination supported)
    const params = {
      TableName: SUPPORT_TICKETS_TABLE,
      Limit: limit,
    };
    if (exclusiveStartKey) params.ExclusiveStartKey = exclusiveStartKey;

    const result = await dynamodb.scan(params).promise();

    const response = {
      message: 'Support queries retrieved successfully',
      count: result.Items ? result.Items.length : 0,
      total: result.Count || 0,
      scannedCount: result.ScannedCount || 0,
      tickets: result.Items || [],
    };

    if (result.LastEvaluatedKey) {
      response.lastEvaluatedKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return formatResponse(200, response);
  } catch (error) {
    console.error('List support queries error:', error);
    return handleError(error);
  }
};

