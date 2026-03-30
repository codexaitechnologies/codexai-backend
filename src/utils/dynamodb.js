const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.USERS_TABLE;

// Response formatter
const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
};

// Error handler
const handleError = (error, statusCode = 500) => {
  console.error('Error:', error);
  return formatResponse(statusCode, {
    error: error.message || 'Internal server error',
  });
};

module.exports = {
  dynamodb,
  TABLE_NAME,
  formatResponse,
  handleError,
};
