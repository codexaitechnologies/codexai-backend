const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE;

// v2-compatible wrapper: dynamodb.get(params).promise() still works
const dynamodb = {
  get:           (p) => ({ promise: () => docClient.send(new GetCommand(p)) }),
  put:           (p) => ({ promise: () => docClient.send(new PutCommand(p)) }),
  update:        (p) => ({ promise: () => docClient.send(new UpdateCommand(p)) }),
  delete:        (p) => ({ promise: () => docClient.send(new DeleteCommand(p)) }),
  query:         (p) => ({ promise: () => docClient.send(new QueryCommand(p)) }),
  scan:          (p) => ({ promise: () => docClient.send(new ScanCommand(p)) }),
  transactWrite: (p) => ({ promise: () => docClient.send(new TransactWriteCommand(p)) }),
};

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
