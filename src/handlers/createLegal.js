const AWS = require('aws-sdk');
const { formatResponse, handleError } = require('../utils/dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Create a new legal document
 * POST /admin/legals
 * Body: { documentName, documentLink }
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const legalsTable = process.env.LEGALS_TABLE;

    if (!legalsTable) {
      return formatResponse(500, {
        error: 'Legals table not configured',
      });
    }

    // Validate required fields
    const required = ['documentName', 'documentLink'];
    const missing = required.filter((field) => !body[field]);

    if (missing.length > 0) {
      return formatResponse(400, {
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // Validate documentName and documentLink are strings
    if (typeof body.documentName !== 'string' || body.documentName.trim() === '') {
      return formatResponse(400, {
        error: 'documentName must be a non-empty string',
      });
    }

    if (typeof body.documentLink !== 'string' || body.documentLink.trim() === '') {
      return formatResponse(400, {
        error: 'documentLink must be a non-empty string',
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const params = {
      TableName: legalsTable,
      Item: {
        id,
        documentName: body.documentName.trim(),
        documentLink: body.documentLink.trim(),
        createdAt: now,
        updatedAt: now,
      },
    };

    await dynamodb.put(params).promise();

    return formatResponse(201, {
      message: 'Legal document created successfully',
      legal: params.Item,
    });
  } catch (error) {
    console.error('Create legal error:', error);
    return handleError(error);
  }
};
