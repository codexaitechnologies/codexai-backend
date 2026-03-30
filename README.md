# CodexAI Backend API

A serverless REST API for user management built with AWS Lambda, DynamoDB, and Serverless Framework.

## Features

✅ Create, Read, Update, Delete (CRUD) operations
✅ User attributes: fullName, email, phoneNumber, course
✅ DynamoDB for data storage
✅ Proper IAM roles and security
✅ Serverless deployment on AWS
✅ RESTful API design

## Project Structure

```
src/
├── handlers/
│   ├── createUser.js      # POST /users
│   ├── getUser.js         # GET /users/{userId}
│   ├── updateUser.js      # PUT /users/{userId}
│   └── deleteUser.js      # DELETE /users/{userId}
└── utils/
    └── dynamodb.js        # DynamoDB client and utilities

serverless.yml             # Serverless Framework configuration
package.json               # Node.js dependencies
```

## Setup & Deployment

### Prerequisites
- Node.js 20.x
- AWS Account with credentials configured
- Serverless Framework CLI

### Installation

1. Install dependencies:
```bash
npm install
```

2. Deploy to AWS (ap-south-1 region):
```bash
serverless deploy
```

3. Run locally (for development):
```bash
npm run dev
```

## API Endpoints

Base URL: `https://<api-id>.lambda-url.ap-south-1.on.aws` (provided after deployment)

---

### 1. Create User

**POST** `/users`

Creates a new user with the provided information.

#### Request

```bash
curl -X POST https://<api-id>.lambda-url.ap-south-1.on.aws/users \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91-9876543210",
    "course": "Web Development"
  }'
```

#### Request Body

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+91-9876543210",
  "course": "Web Development"
}
```

#### Response (201 Created)

```json
{
  "message": "User created successfully",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91-9876543210",
    "course": "Web Development",
    "createdAt": "2026-03-30T10:30:45.123Z",
    "updatedAt": "2026-03-30T10:30:45.123Z"
  }
}
```

#### JavaScript/Node.js Example

```javascript
const baseUrl = 'https://<api-id>.lambda-url.ap-south-1.on.aws';

const response = await fetch(`${baseUrl}/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'John Doe',
    email: 'john@example.com',
    phoneNumber: '+91-9876543210',
    course: 'Web Development'
  })
});

const data = await response.json();
console.log(data);
```

---

### 2. Get User

**GET** `/users/{userId}`

Retrieves a specific user by their ID.

#### Request

```bash
curl -X GET https://<api-id>.lambda-url.ap-south-1.on.aws/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "message": "User retrieved successfully",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91-9876543210",
    "course": "Web Development",
    "createdAt": "2026-03-30T10:30:45.123Z",
    "updatedAt": "2026-03-30T10:30:45.123Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "error": "User not found"
}
```

#### JavaScript/Node.js Example

```javascript
const baseUrl = 'https://<api-id>.lambda-url.ap-south-1.on.aws';
const userId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`${baseUrl}/users/${userId}`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
console.log(data);
```

---

### 3. Update User

**PUT** `/users/{userId}`

Updates one or more fields of an existing user. All fields are optional.

#### Request

```bash
curl -X PUT https://<api-id>.lambda-url.ap-south-1.on.aws/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "course": "Data Science"
  }'
```

#### Request Body (All Fields Optional)

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": "+91-9876543210",
  "course": "Data Science"
}
```

#### Response (200 OK)

```json
{
  "message": "User updated successfully",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "Jane Doe",
    "email": "john@example.com",
    "phoneNumber": "+91-9876543210",
    "course": "Data Science",
    "createdAt": "2026-03-30T10:30:45.123Z",
    "updatedAt": "2026-03-30T11:45:20.456Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "error": "User not found"
}
```

#### JavaScript/Node.js Example

```javascript
const baseUrl = 'https://<api-id>.lambda-url.ap-south-1.on.aws';
const userId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`${baseUrl}/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Jane Doe',
    course: 'Data Science'
  })
});

const data = await response.json();
console.log(data);
```

---

### 4. Delete User

**DELETE** `/users/{userId}`

Deletes a user permanently from the database.

#### Request

```bash
curl -X DELETE https://<api-id>.lambda-url.ap-south-1.on.aws/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"
```

#### Response (200 OK)

```json
{
  "message": "User deleted successfully",
  "deletedUserId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Response (404 Not Found)

```json
{
  "error": "User not found"
}
```

#### JavaScript/Node.js Example

```javascript
const baseUrl = 'https://<api-id>.lambda-url.ap-south-1.on.aws';
const userId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`${baseUrl}/users/${userId}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
console.log(data);
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status Code | Error | Description |
|---|---|---|
| 400 | Bad Request | Missing required fields or invalid input |
| 404 | Not Found | User with the specified ID does not exist |
| 500 | Internal Server Error | Server-side error during processing |

---

## Database Schema

**Table Name**: `users-dev` (or `users-<stage>`)

**Attributes**:

| Attribute | Type | Description |
|---|---|---|
| userId | String (Primary Key) | Unique identifier (UUID v4) |
| fullName | String | User's full name |
| email | String | User's email address |
| phoneNumber | String | User's phone number |
| course | String | Course enrolled in |
| createdAt | String | ISO 8601 timestamp when user was created |
| updatedAt | String | ISO 8601 timestamp when user was last updated |

---

## Security & IAM

The Lambda functions have the following DynamoDB permissions (least privilege):

```yaml
- dynamodb:Query
- dynamodb:Scan
- dynamodb:GetItem
- dynamodb:PutItem
- dynamodb:UpdateItem
- dynamodb:DeleteItem
```

These permissions are scoped to only the users table and cannot access other DynamoDB resources.

---

## Configuration

The serverless configuration is defined in `serverless.yml`:

- **Runtime**: Node.js 20.x
- **Region**: ap-south-1 (Mumbai)
- **Provider**: AWS Lambda with HTTP API
- **Database**: AWS DynamoDB (on-demand billing)

---

## Development

### Local Testing

Start the offline development server:

```bash
npm run dev
```

This will start a local server at `http://localhost:3000` where you can test your endpoints.

### Testing with curl

```bash
# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","phoneNumber":"+91-1234567890","course":"Testing"}'

# Get user (replace userId with actual ID from create response)
curl -X GET http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000

# Update user
curl -X PUT http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"course":"Updated Course"}'

# Delete user
curl -X DELETE http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

---

## Deployment

### Deploy to AWS

```bash
# Deploy to dev stage (default)
serverless deploy

# Deploy to production
serverless deploy --stage prod

# Remove deployment
serverless remove
```

After deployment, the CLI will output the API endpoint URL.

---

## Troubleshooting

### DynamoDB Table Not Found

Ensure the table was created successfully during deployment. Check AWS CloudFormation stack in the console.

### 403 Forbidden Error

Verify that your AWS credentials are configured correctly and have permission to:
- Lambda operations
- DynamoDB operations
- CloudFormation operations

### UUID Not Installed

If you see an error about missing `uuid` module, run:

```bash
npm install uuid
```

---

## Dependencies

- **aws-sdk**: AWS SDK for Node.js (v2)
- **uuid**: UUID generation library

---

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

Which should result in response similar to:

```json
{ "message": "Go Serverless v4! Your function executed successfully!" }
```

### Local development

The easiest way to develop and test your function is to use the `dev` command:

```
serverless dev
```

This will start a local emulator of AWS Lambda and tunnel your requests to and from AWS Lambda, allowing you to interact with your function as if it were running in the cloud.

Now you can invoke the function as before, but this time the function will be executed locally. Now you can develop your function locally, invoke it, and see the results immediately without having to re-deploy.

When you are done developing, don't forget to run `serverless deploy` to deploy the function to the cloud.
