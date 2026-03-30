# Getting Started with Serverless Framework Guide

A comprehensive guide to creating serverless projects with AWS Lambda, DynamoDB, and the Serverless Framework. Includes ready-to-use Copilot prompts for automated handler creation.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Create a Serverless Project](#create-a-serverless-project)
- [Project Structure](#project-structure)
- [Understanding Handlers](#understanding-handlers)
- [Configuring serverless.yml](#configuring-severlessyml)
- [Copilot Prompts for Handler Generation](#copilot-prompts-for-handler-generation)
- [Quick Reference](#quick-reference)

---

## Prerequisites

Before you start, ensure you have:

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **AWS Account** - Sign up at [aws.amazon.com](https://aws.amazon.com/)
- **AWS Credentials Configured** - Run `aws configure` in your terminal
- **Serverless Framework CLI** - Install globally:

```bash
npm install -g serverless
```

Verify installation:

```bash
serverless --version
```

---

## Create a Serverless Project

### Option 1: Using Serverless CLI (Recommended)

```bash
# Create a new serverless project
serverless create --template aws-nodejs --path my-serverless-api

# Navigate to project directory
cd my-serverless-api

# Install dependencies
npm install
```

### Option 2: Manual Setup

```bash
# Create project directory
mkdir my-serverless-api
cd my-serverless-api

# Initialize npm project
npm init -y

# Install required dependencies
npm install --save aws-sdk uuid

# Install dev dependencies
npm install --save-dev serverless serverless-offline
```

### Option 3: Clone from Existing Project

```bash
# Copy the codexai-backend structure
cp -r codexai-backend my-new-api
cd my-new-api

# Install dependencies
npm install
```

---

## Project Structure

A well-organized serverless project should follow this structure:

```
my-serverless-api/
├── src/
│   ├── handlers/
│   │   ├── createUser.js
│   │   ├── getUser.js
│   │   ├── updateUser.js
│   │   └── deleteUser.js
│   └── utils/
│       ├── dynamodb.js
│       ├── response.js
│       └── validators.js
├── serverless.yml
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

**Explanation:**

- `src/handlers/` - Lambda function handlers (one per endpoint)
- `src/utils/` - Shared utility functions
- `serverless.yml` - Service configuration
- `package.json` - Dependencies and scripts

---

## Understanding Handlers

A **handler** is a Node.js function that processes incoming HTTP requests. Each handler is a Lambda function that runs when its endpoint is triggered.

### Handler Anatomy

```javascript
// Handler receives an event and context parameter
exports.handler = async (event) => {
  try {
    // 1. Parse request body and parameters
    const body = JSON.parse(event.body);
    const userId = event.pathParameters?.userId;

    // 2. Validate input
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId' })
      };
    }

    // 3. Process the request
    const result = await someOperation(userId, body);

    // 4. Return response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    // 5. Handle errors
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### Handler Best Practices

✅ **Always return proper HTTP responses** with status codes
✅ **Parse JSON request bodies** with error handling
✅ **Validate all inputs** before processing
✅ **Use async/await** for clean code
✅ **Add try-catch blocks** for error handling
✅ **Log errors** for debugging
✅ **Store shared logic in utils** directory

---

## Configuring serverless.yml

The `serverless.yml` file defines your entire service configuration:

### Basic Structure

```yaml
# Service metadata
org: your-org-name
app: your-app-name
service: my-api

# Provider configuration
provider:
  name: aws
  runtime: nodejs20.x
  region: ap-south-1
  environment:
    USERS_TABLE: users-${sls:stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource: "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${self:provider.environment.USERS_TABLE}"

# Lambda functions
functions:
  createUser:
    handler: src/handlers/createUser.handler
    events:
      - httpApi:
          path: /users
          method: post

  getUser:
    handler: src/handlers/getUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: get

# DynamoDB Table
resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.USERS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH

# Plugins for local development
plugins:
  - serverless-offline
```

### Key Configuration Elements

#### Provider Section

```yaml
provider:
  name: aws                    # Cloud provider
  runtime: nodejs20.x          # Runtime environment
  region: ap-south-1           # AWS region
  environment:                 # Environment variables
    TABLE_NAME: myTable-${sls:stage}
  iam:
    role:
      statements:              # IAM permissions
        - Effect: Allow
          Action:
            - dynamodb:*
          Resource: "arn:aws:dynamodb:*"
```

#### Functions Section

```yaml
functions:
  functionName:                # Logical name
    handler: path/to/file.handler  # Handler file and export
    events:                    # Trigger events
      - httpApi:
          path: /endpoint
          method: post
```

#### Resources Section

```yaml
resources:                     # AWS CloudFormation resources
  Resources:
    ResourceName:
      Type: AWS::DynamoDB::Table
      Properties:
        # CloudFormation properties
```

---

## Copilot Prompts for Handler Generation

Use these ready-made prompts with GitHub Copilot to automatically generate handlers for your serverless API.

### Prompt 1: Basic CRUD Handler

**Copy & paste this into Copilot chat or as a comment:**

```
Create a Node.js Lambda handler that:
- Accepts a POST request with body containing: name, email, phone, course
- Validates all required fields
- Generates a UUID for userId
- Saves to DynamoDB using DocumentClient
- Returns 201 status with the created user
- Returns 400 if fields are missing
- Includes proper error handling and logging
- Uses environment variable USERS_TABLE for table name
File: src/handlers/createUser.js
```

### Prompt 2: GET Handler with Path Parameters

```
Create a Node.js Lambda handler that:
- Accepts a GET request with userId in path parameters
- Retrieves user from DynamoDB using userId as primary key
- Returns 200 with user data if found
- Returns 404 if user not found
- Returns 400 if userId is missing
- Includes error handling and logging
- Uses DocumentClient for DynamoDB operations
- Uses environment variable USERS_TABLE for table name
File: src/handlers/getUser.js
```

### Prompt 3: UPDATE Handler with Dynamic Fields

```
Create a Node.js Lambda handler that:
- Accepts a PUT request with userId in path parameters
- Extracts body containing optional fields: name, email, phone, course
- Verifies user exists before updating
- Dynamically builds UpdateExpression based on provided fields
- Updates only non-null fields
- Updates the updatedAt timestamp
- Returns 200 with updated user if successful
- Returns 404 if user not found
- Returns 400 if userId is missing
- Includes error handling and uses DynamoDB DocumentClient
- Uses environment variable USERS_TABLE
File: src/handlers/updateUser.js
```

### Prompt 4: DELETE Handler

```
Create a Node.js Lambda handler that:
- Accepts a DELETE request with userId in path parameters
- Checks if user exists before deletion
- Deletes the user from DynamoDB
- Returns 200 with deletion confirmation message and deleted userId
- Returns 404 if user not found
- Returns 400 if userId is missing
- Includes comprehensive error handling and logging
- Uses DocumentClient for DynamoDB operations
- Uses environment variable USERS_TABLE
File: src/handlers/deleteUser.js
```

### Prompt 5: Utility Functions - DynamoDB Helper

```
Create a Node.js utility file that:
- Initializes AWS SDK DocumentClient
- Exports formatResponse function that takes statusCode and body, returns formatted HTTP response
- Exports handleError function that logs error and returns 500 response
- Exports table name from environment variable
- Exports documentClient instance configured for DynamoDB
- Each function includes JSDoc comments
File: src/utils/dynamodb.js
```

### Prompt 6: Input Validator Utility

```
Create a Node.js validation utility that:
- Exports validateUserInput function checking required fields: fullName, email, phoneNumber, course
- Exports validateEmail function using regex pattern
- Exports validatePhoneNumber function accepting +XX-XXXXXXXXXX format
- Returns object with isValid boolean and error message if invalid
- Includes detailed error messages for each validation type
File: src/utils/validators.js
```

### Prompt 7: List All Users Handler (Bonus)

```
Create a Node.js Lambda handler that:
- Accepts a GET request with optional limit and lastEvaluatedKey query parameters
- Scans DynamoDB table with pagination support
- Returns array of users, count, and lastEvaluatedKey for pagination
- Defaults limit to 10 if not provided, max 100
- Returns 200 with paginated results
- Includes error handling
- Uses DocumentClient scan operation
- Uses environment variable USERS_TABLE
File: src/handlers/listUsers.js
```

---

## How to Use Copilot Prompts

### Method 1: GitHub Copilot Chat

1. Open VS Code
2. Press `Cmd+I` (Mac) or `Ctrl+I` (Windows/Linux)
3. Copy the prompt from above
4. Paste it into the Copilot chat
5. Press Enter to generate code

### Method 2: Copilot Inline Suggestion

1. Create a new file with the name mentioned in the prompt
2. Add a comment with the prompt description
3. Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows/Linux)
4. Accept the suggestion

### Method 3: Use as Code Comment

```javascript
// Create a Lambda handler that accepts POST request with name, email, phone, course
// Validates all fields, generates UUID, saves to DynamoDB, returns 201 with user
// Returns 400 if fields missing, includes error handling

exports.handler = async (event) => {
  // Copilot will auto-complete from here
};
```

---

## Deploying Your Serverless Project

### Deploy to AWS

```bash
# Deploy to dev stage (default)
serverless deploy

# Deploy to production
serverless deploy --stage prod

# View deployment information
serverless info

# Remove deployment
serverless remove
```

### Run Locally for Development

```bash
# Install serverless-offline plugin
npm install --save-dev serverless-offline

# Start local server (runs on http://localhost:3000)
serverless offline start
```

### View Logs

```bash
# View logs for specific function
serverless logs -f createUser

# View logs with real-time streaming
serverless logs -f createUser --tail
```

---

## Adding Handlers to serverless.yml

Once you create handlers using Copilot, add them to `serverless.yml`:

```yaml
functions:
  # Create User
  createUser:
    handler: src/handlers/createUser.handler
    events:
      - httpApi:
          path: /users
          method: post

  # Get User
  getUser:
    handler: src/handlers/getUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: get

  # Update User
  updateUser:
    handler: src/handlers/updateUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: put

  # Delete User
  deleteUser:
    handler: src/handlers/deleteUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: delete

  # List Users (optional)
  listUsers:
    handler: src/handlers/listUsers.handler
    events:
      - httpApi:
          path: /users
          method: get
```

---

## Complete serverless.yml Example

```yaml
org: your-org
app: codexai
service: codexai-backend

provider:
  name: aws
  runtime: nodejs20.x
  region: ap-south-1
  environment:
    USERS_TABLE: users-${sls:stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource: "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${self:provider.environment.USERS_TABLE}"

functions:
  createUser:
    handler: src/handlers/createUser.handler
    events:
      - httpApi:
          path: /users
          method: post

  getUser:
    handler: src/handlers/getUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: get

  updateUser:
    handler: src/handlers/updateUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: put

  deleteUser:
    handler: src/handlers/deleteUser.handler
    events:
      - httpApi:
          path: /users/{userId}
          method: delete

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.USERS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH

plugins:
  - serverless-offline
```

---

## Quick Reference

### Common Commands

| Command | Purpose |
|---------|---------|
| `serverless create` | Create new serverless project |
| `serverless deploy` | Deploy to AWS |
| `serverless offline start` | Run locally |
| `serverless logs -f <function>` | View function logs |
| `serverless remove` | Remove deployment |
| `serverless info` | Show deployment info |
| `npm install` | Install dependencies |

### Handler Template

```javascript
const { dynamodb, TABLE_NAME, formatResponse, handleError } = require('../utils/dynamodb');

exports.handler = async (event) => {
  try {
    // Your logic here
    return formatResponse(200, { message: 'Success' });
  } catch (error) {
    return handleError(error);
  }
};
```

### package.json Scripts

```json
{
  "scripts": {
    "deploy": "serverless deploy",
    "dev": "serverless offline start",
    "logs": "serverless logs -f",
    "remove": "serverless remove"
  }
}
```

### Environment Variables

```yaml
# In serverless.yml
provider:
  environment:
    TABLE_NAME: ${env:TABLE_NAME, 'users-${sls:stage}'}
    REGION: ${aws:region}
    ACCOUNT_ID: ${aws:accountId}
```

---

## Troubleshooting

### Issue: "No handler found"

**Solution**: Verify the handler path matches your file structure and export name.

```yaml
handler: src/handlers/createUser.handler  # Must match file structure
```

### Issue: "DynamoDB table not found"

**Solution**: Ensure table is created and environment variable is set correctly.

```bash
serverless info  # Check deployed resources
```

### Issue: "AWS credentials not found"

**Solution**: Configure AWS credentials.

```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

### Issue: "Port 3000 already in use" (offline)

**Solution**: Kill process using port 3000 or specify different port.

```bash
serverless offline start --httpPort 3001
```

---

## Next Steps

1. **Create your first handler** using the Copilot prompts above
2. **Add handler to serverless.yml**
3. **Deploy to AWS**: `serverless deploy`
4. **Test your API** using curl or Postman
5. **Monitor logs**: `serverless logs -f <function-name> --tail`

---

## Resources

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [HTTP API (API Gateway V2)](https://www.serverless.com/framework/docs/providers/aws/events/http-api)

---

## Support

For questions or issues:
1. Check Serverless documentation
2. Review AWS CloudFormation events in console
3. Check CloudWatch logs in AWS console
4. Search GitHub issues for solutions

---

**Happy serverless building! 🚀**
