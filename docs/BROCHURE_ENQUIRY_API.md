# Brochure Enquiry API Documentation

## Overview
The Brochure Enquiry API manages customer enquiries for downloading brochures of CodeXAI courses. It includes endpoints for submitting enquiries, retrieving, listing, and updating enquiry status.

## Base URL
```
https://r5exi0cxad.execute-api.ap-south-1.amazonaws.com
```

## Endpoints

### 1. Submit Brochure Enquiry
Create a new brochure enquiry.

**Endpoint:** `POST /enquiries/submit-brochure`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+91 98765 43210",
  "course": "GenAI Engineering Summer Internship Program 2026",
  "courseId": "4c95969c-8cf8-459b-b152-356ac2fe291e"
}
```

**Response (200):**
```json
{
  "message": "Brochure enquiry submitted successfully",
  "enquiryId": "ENQ-1712345678000-a1b2c3d4",
  "status": "pending",
  "createdAt": "2024-04-10T10:30:45.000Z"
}
```

**Validations:**
- All fields are required
- Email must be a valid email format
- Phone number is stored as-is for flexibility

**Side Effects:**
- Sends confirmation email to the customer
- Sends notification email to admin

---

### 2. Get Brochure Enquiry
Retrieve a specific brochure enquiry by ID.

**Endpoint:** `GET /enquiries/brochure/{enquiryId}`

**Path Parameters:**
- `enquiryId` (required): The enquiry ID returned from submission

**Response (200):**
```json
{
  "enquiry": {
    "enquiryId": "ENQ-1712345678000-a1b2c3d4",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91 98765 43210",
    "course": "GenAI Engineering Summer Internship Program 2026",
    "courseId": "4c95969c-8cf8-459b-b152-356ac2fe291e",
    "status": "pending",
    "notes": "",
    "createdAt": "2024-04-10T10:30:45.000Z",
    "updatedAt": "2024-04-10T10:30:45.000Z"
  }
}
```

**Response (404):** Not found

---

### 3. List Brochure Enquiries
Retrieve all brochure enquiries with optional filtering and pagination.

**Endpoint:** `GET /enquiries/brochure`

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 20, max: 100)
- `lastKey` (optional): Base64-encoded last evaluated key for pagination
- `status` (optional): Filter by status (pending, brochure-sent, contacted)
- `courseId` (optional): Filter by course ID

**Response (200):**
```json
{
  "enquiries": [
    {
      "enquiryId": "ENQ-1712345678000-a1b2c3d4",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+91 98765 43210",
      "course": "GenAI Engineering Summer Internship Program 2026",
      "courseId": "4c95969c-8cf8-459b-b152-356ac2fe291e",
      "status": "pending",
      "createdAt": "2024-04-10T10:30:45.000Z",
      "updatedAt": "2024-04-10T10:30:45.000Z"
    }
  ],
  "count": 1,
  "total": 1,
  "lastEvaluatedKey": null
}
```

---

### 4. Update Brochure Enquiry
Update the status and/or notes of a brochure enquiry.

**Endpoint:** `PUT /enquiries/brochure/{enquiryId}`

**Path Parameters:**
- `enquiryId` (required): The enquiry ID to update

**Request Body:**
```json
{
  "status": "brochure-sent",
  "notes": "Brochure sent via email with additional course details"
}
```

**Valid Status Values:**
- `pending`: Initial status when enquiry is submitted
- `brochure-sent`: Brochure has been sent to the customer
- `contacted`: Team has contacted the customer

**Response (200):**
```json
{
  "message": "Brochure enquiry updated successfully",
  "enquiry": {
    "enquiryId": "ENQ-1712345678000-a1b2c3d4",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91 98765 43210",
    "course": "GenAI Engineering Summer Internship Program 2026",
    "courseId": "4c95969c-8cf8-459b-b152-356ac2fe291e",
    "status": "brochure-sent",
    "notes": "Brochure sent via email with additional course details",
    "createdAt": "2024-04-10T10:30:45.000Z",
    "updatedAt": "2024-04-10T10:30:50.000Z"
  }
}
```

**Side Effects:**
- When status changes to `brochure-sent`, an email is automatically sent to the customer

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing or empty required field: fullName"
}
```

### 404 Not Found
```json
{
  "error": "Brochure enquiry with ID ENQ-xxxx not found"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Database Schema

### Table: `brochure-enquiries-{stage}`

| Field | Type | Description |
|-------|------|-------------|
| enquiryId | String (PK) | Unique enquiry identifier (ENQ-timestamp-uuid) |
| fullName | String | Customer's full name |
| email | String | Customer's email address |
| phoneNumber | String | Customer's phone number |
| course | String | Course name |
| courseId | String | Course ID (for filtering and auditing) |
| status | String | Enquiry status (pending, brochure-sent, contacted) |
| notes | String | Admin notes |
| createdAt | String (ISO 8601) | Timestamp when enquiry was created |
| updatedAt | String (ISO 8601) | Timestamp when enquiry was last updated |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| BROCHURE_ENQUIRIES_TABLE | brochure-enquiries-dev | DynamoDB table name |
| ADMIN_EMAIL | admin@codexai.com | Admin email for notifications |
| GMAIL_USER | codexaitechnologies@gmail.com | Email service sender |
| GMAIL_APP_PASSWORD | - | Gmail app-specific password (from .env) |

---

## Deployment

Deploy with Serverless Framework:

```bash
# Deploy to dev stage
serverless deploy

# Deploy to production
serverless deploy --stage prod

# Deploy specific function
serverless deploy function -f submitBrochureEnquiry
```

---

## Testing with cURL

### Submit Enquiry
```bash
curl -X POST https://jbd1szydoc.execute-api.ap-south-1.amazonaws.com/enquiries/submit-brochure \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91 98765 43210",
    "course": "GenAI Engineering Summer Internship Program 2026",
    "courseId": "4c95969c-8cf8-459b-b152-356ac2fe291e"
  }'
```

### Get Enquiry
```bash
curl https://jbd1szydoc.execute-api.ap-south-1.amazonaws.com/enquiries/brochure/ENQ-1712345678000-a1b2c3d4
```

### List Enquiries
```bash
curl 'https://jbd1szydoc.execute-api.ap-south-1.amazonaws.com/enquiries/brochure?limit=20&status=pending'
```

### Update Enquiry
```bash
curl -X PUT https://jbd1szydoc.execute-api.ap-south-1.amazonaws.com/enquiries/brochure/ENQ-1712345678000-a1b2c3d4 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "brochure-sent",
    "notes": "Brochure sent"
  }'
```

---

## Notes

- All timestamps are in ISO 8601 format
- Enquiry IDs are unique and contain timestamp and UUID for uniqueness
- Email notifications are sent asynchronously and do not block the API response
- List endpoint uses pagination with base64-encoded cursor
- Admin can filter enquiries by status or course for easy management
