# CodexAI Backend API

User management API built with Serverless Framework, Node.js, and AWS DynamoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Deploy to AWS:
```bash
serverless deploy
```

3. Run locally:
```bash
npm run dev
```

## API Endpoints

### Create User
**POST** `/users`

Request body:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "course": "Web Development"
}
```

Response (201):
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "uuid-string",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "course": "Web Development",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get User
**GET** `/users/{userId}`

Response (200):
```json
{
  "message": "User retrieved successfully",
  "user": { /* user object */ }
}
```

### Update User
**PUT** `/users/{userId}`

Request body (all fields optional):
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": "+0987654321",
  "course": "Data Science"
}
```

Response (200):
```json
{
  "message": "User updated successfully",
  "user": { /* updated user object */ }
}
```

### Delete User
**DELETE** `/users/{userId}`

Response (200):
```json
{
  "message": "User deleted successfully",
  "deletedUserId": "uuid-string"
}
```

## DynamoDB Schema

**Table Name**: `users-${stage}`

**Attributes**:
- `userId` (String, Primary Key)
- `fullName` (String)
- `email` (String)
- `phoneNumber` (String)
- `course` (String)
- `createdAt` (String, ISO 8601)
- `updatedAt` (String, ISO 8601)

## IAM Permissions

The Lambda functions have the following DynamoDB permissions:
- `dynamodb:Query`
- `dynamodb:Scan`
- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`

These permissions are restricted to the users table specified in the environment variable.

## Project Structure

```
src/
├── handlers/
│   ├── createUser.js
│   ├── getUser.js
│   ├── updateUser.js
│   └── deleteUser.js
└── utils/
    └── dynamodb.js
```

- **handlers/**: Lambda function handlers for each API endpoint
- **utils/dynamodb.js**: DynamoDB client and utility functions
