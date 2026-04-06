# Razorpay Payment Integration Guide

This guide explains the Razorpay payment integration for CodexAI Backend.

## Overview

The payment system uses **Razorpay** for processing payments. It provides endpoints for:
- Creating payment orders
- Verifying payment signatures
- Checking order status

## Setup

### 1. Razorpay Configuration

Your Razorpay credentials are already in `.env`:
```bash
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=Ad@rsh15101996
```

### 2. Get from Razorpay Dashboard

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to:
   - Settings → API Keys for Key ID and Secret
   - Settings → Webhooks for Webhook Secret
3. Update `.env` with your credentials

### 3. Deploy Backend

```bash
npm install
serverless deploy
```

---

## Payment Endpoints

### 1. Create Order
**Endpoint:** `POST /payments/create-order`

**Request Body:**
```json
{
  "amount": 499,
  "currency": "INR",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "description": "Web Development Course",
  "courseId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Required Fields:**
- `amount`: Price in rupees (₹1 minimum)
- `currency`: INR, USD, GBP, or EUR
- `email`: Valid email address
- `fullName`: User's full name
- `phoneNumber`: Contact number
- `description`: Order description
- `courseId`: Course being purchased
- `userId` (optional): User ID if logged in

**Success Response (200):**
```json
{
  "message": "Order created successfully",
  "order": {
    "id": "order_2QlLg5lIcTuTYr",
    "entity": "order",
    "amount": 499,
    "amountPaid": 0,
    "amountDue": 499,
    "currency": "INR",
    "receipt": "receipt_550e8400-e29b-41d4-a716",
    "status": "created",
    "attempts": 0,
    "notes": {
      "courseId": "550e8400-e29b-41d4-a716-446655440001",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "createdAt": "2024-04-04T10:30:00.000Z",
    "expiresAt": "2024-04-04T11:00:00.000Z",
    "shortUrl": "https://rzp.io/l/xxxxx",
    "paymentDetails": {
      "email": "user@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "courseId": "550e8400-e29b-41d4-a716-446655440001",
      "keyId": "rzp_test_XXXXXXXXXXXXXXXX"
    }
  }
}
```

**Error Responses:**
- `400`: Invalid amount, currency, or missing fields
- `401`: Razorpay authentication failed
- `429`: Too many requests

---

### 2. Verify Payment
**Endpoint:** `POST /payments/verify`

**Request Body:**
```json
{
  "razorpay_order_id": "order_2QlLg5lIcTuTYr",
  "razorpay_payment_id": "pay_2QlLg5lIcTuTYr",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**How to get signature in frontend:**

```javascript
// After successful payment, Razorpay returns these values
const paymentHandler = (response) => {
  const payload = {
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature
  };

  // Send to backend
  fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};
```

**Success Response (200):**
```json
{
  "message": "Payment verified successfully",
  "valid": true,
  "payment": {
    "paymentId": "pay_2QlLg5lIcTuTYr",
    "orderId": "order_2QlLg5lIcTuTYr",
    "amount": 499,
    "currency": "INR",
    "status": "captured",
    "method": "card",
    "email": "user@example.com",
    "contact": "+919876543210",
    "description": "Web Development Course",
    "courseId": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-04-04T10:31:30.000Z"
  }
}
```

**Error Responses:**
- `400`: Invalid signature or payment not captured
- `401`: Razorpay authentication failed
- `401`: Invalid payment signature

---

### 3. Get Order Status
**Endpoint:** `GET /payments/order/{orderId}`

**Path Parameters:**
- `orderId`: Razorpay Order ID (format: `order_xxxx`)

**Example:**
```
GET https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/order/order_2QlLg5lIcTuTYr
```

**Success Response (200):**
```json
{
  "message": "Order details retrieved successfully",
  "order": {
    "id": "order_2QlLg5lIcTuTYr",
    "entity": "order",
    "amount": 499,
    "amountPaid": 0,
    "amountDue": 499,
    "currency": "INR",
    "receipt": "receipt_550e8400-e29b-41d4-a716",
    "status": "created",
    "attempts": 0,
    "notes": {
      "courseId": "550e8400-e29b-41d4-a716-446655440001",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "createdAt": "2024-04-04T10:30:00.000Z",
    "paymentId": null,
    "shortUrl": "https://rzp.io/l/xxxxx"
  }
}
```

**Possible Order Statuses:**
- `created`: Order created, awaiting payment
- `attempted`: Payment attempted but failed
- `paid`: Payment successfully completed

**Error Responses:**
- `400`: Invalid order ID format
- `404`: Order not found
- `401`: Razorpay authentication failed

---

## Frontend Integration

### Using Razorpay Payment Button

#### Install Razorpay SDK

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

#### Complete Payment Flow Example

```javascript
// 1. Create order on backend
async function createPaymentOrder(courseData) {
  const response = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: courseData.price,
      currency: 'INR',
      email: userEmail,
      fullName: userName,
      phoneNumber: userPhone,
      description: courseData.name,
      courseId: courseData.id,
      userId: userId || 'guest'
    })
  });

  return response.json();
}

// 2. Open Razorpay Checkout
function openRazorpayCheckout(order) {
  const options = {
    key: order.paymentDetails.keyId,
    order_id: order.id,
    amount: order.amount * 100, // Amount in paise
    currency: order.currency,
    name: 'CodexAI',
    description: 'Course Payment',
    image: 'https://codexai.co.in/logo.png',
    prefill: {
      email: order.paymentDetails.email,
      contact: order.paymentDetails.phoneNumber.replace(/\D/g, '')
    },
    handler: async function(response) {
      // 3. Verify payment signature
      const verifyResponse = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      });

      const result = await verifyResponse.json();

      if (result.valid) {
        alert('✓ Payment successful! You can now access the course.');
        // Redirect to course or dashboard
        window.location.href = '/dashboard';
      } else {
        alert('✗ Payment verification failed. Please try again.');
      }
    },
    modal: {
      ondismiss: function() {
        alert('Payment cancelled');
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

// 4. Usage
async function handlePurchase(course) {
  try {
    const order = await createPaymentOrder(course);
    openRazorpayCheckout(order.order);
  } catch (error) {
    console.error('Payment error:', error);
  }
}
```

### React Component Example

```jsx
import { useEffect } from 'react';
import axios from 'axios';

function RazorpayCheckout({ course, userEmail, userName, userPhone, userId }) {
  useEffect(() => {
    // Load Razorpay SDK
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePayment = async () => {
    try {
      // Create order
      const { data: orderData } = await axios.post(
        'https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/create-order',
        {
          amount: course.price,
          currency: 'INR',
          email: userEmail,
          fullName: userName,
          phoneNumber: userPhone,
          description: course.name,
          courseId: course.id,
          userId: userId
        }
      );

      const options = {
        key: orderData.order.paymentDetails.keyId,
        order_id: orderData.order.id,
        amount: orderData.order.amount * 100,
        currency: 'INR',
        name: 'CodexAI',
        description: course.name,
        image: 'https://codexai.co.in/logo.png',
        prefill: {
          email: userEmail,
          contact: userPhone.replace(/\D/g, '')
        },
        handler: async (response) => {
          // Verify payment
          const { data: verifyData } = await axios.post(
            'https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/verify',
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }
          );

          if (verifyData.valid) {
            // Payment successful
            window.location.href = '/dashboard';
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <button onClick={handlePayment} className="pay-now-btn">
      Pay ₹{course.price}
    </button>
  );
}

export default RazorpayCheckout;
```

---

## Payment Flow Diagram

```
┌─────────────────┐
│  User clicks    │
│  "Buy Course"   │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ Frontend calls               │
│ POST /payments/create-order  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Backend calls Razorpay API   │
│ to create order              │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Razorpay returns order_id    │
│ and payment details          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Frontend opens Razorpay      │
│ Checkout modal               │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ User enters payment details  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Razorpay processes payment   │
└────────┬─────────────────────┘
         │
    ┌────┴─────┐
    │           │
    ▼           ▼
Success      Failed
    │           │
    ▼           ▼
    │      Show error
    │           │
    ▼      User retries
    │           │
    └───┬───────┘
        │
        ▼
┌──────────────────────────────┐
│ Frontend sends signature to  │
│ POST /payments/verify        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Backend verifies signature   │
│ and stores payment record    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Return payment confirmation  │
│ to frontend                  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Frontend grants course access│
│ and redirects to dashboard   │
└──────────────────────────────┘
```

---

## Payment Status Check

Check payment status anytime:

```javascript
async function checkOrderStatus(orderId) {
  const response = await fetch(
    `https://jbd1szydoc.lambda-url.ap-south-1.on.aws/payments/order/${orderId}`
  );
  const data = await response.json();
  console.log('Order status:', data.order.status);
}
```

---

## Database Records

### Payments Table (`payments-{stage}`)

When a payment is verified, it's stored with:

```
{
  paymentId: "pay_2QlLg5lIcTuTYr",
  orderId: "order_2QlLg5lIcTuTYr",
  email: "user@example.com",
  fullName: "John Doe",
  phoneNumber: "+91-9876543210",
  courseId: "550e8400-e29b-41d4-a716-446655440001",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  amount: 499,
  currency: "INR",
  status: "captured",
  method: "card",
  description: "Web Development Course",
  invoiceId: null,
  createdAt: "2024-04-04T10:31:30.000Z",
  verifiedAt: "2024-04-04T10:31:40.000Z",
  metadata: { ... }
}
```

### Query Examples

```javascript
// Find all payments for a user
const userPayments = await dynamodb.query({
  TableName: 'payments-dev',
  IndexName: 'email-createdAt-index',
  KeyConditionExpression: 'email = :email',
  ExpressionAttributeValues: {
    ':email': 'user@example.com'
  }
}).promise();

// Find payment by order
const payment = await dynamodb.query({
  TableName: 'payments-dev',
  IndexName: 'orderId-index',
  KeyConditionExpression: 'orderId = :orderId',
  ExpressionAttributeValues: {
    ':orderId': 'order_2QlLg5lIcTuTYr'
  }
}).promise();
```

---

## Environment Variables

Update `.env`:

```bash
# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=Your_Webhook_Secret

# Frontend
FRONTEND_URL=https://codexai.co.in
PORT=3000
```

---

## Security Considerations

1. **Signature Verification:**
   - Always verify payment signature server-side
   - Never trust client-side payment confirmation alone

2. **API Keys:**
   - Keep `RAZORPAY_KEY_SECRET` safe (never expose in frontend)
   - Use `RAZORPAY_KEY_ID` only on frontend for Checkout

3. **Amount Validation:**
   - Verify amount matches what was agreed
   - Check currency is correct

4. **HTTPS Only:**
   - Payment data must be transmitted over HTTPS
   - Local testing should use tunneling tools (ngrok, etc.)

---

## Testing

### Test Cards

Use these cards in Razorpay test mode:

| Card Number | Details |
|-------------|---------|
| 4111 1111 1111 1111 | Visa Success |
| 5555 5555 5555 4444 | Mastercard Success |
| 3782 822463 10005 | American Express Success |
| 6011 0009 9013 9424 | Discover Success |

**CVV:** Any 3-4 digit number
**Expiry:** Any future date

### Postman Examples

See [AUTH_QUICK_REFERENCE.md](AUTH_QUICK_REFERENCE.md) for Postman collection updates.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid key_id" | Verify RAZORPAY_KEY_ID is correct and testing keys in dev mode |
| "Signature mismatch" | Check RAZORPAY_KEY_SECRET matches in .env |
| "Order not found" | Verify order_id format and check if order expired (30 min) |
| "Payment not captured" | Payment must be in captured status before verification |
| CORS error | Frontend domain must be whitelisted (check serverless.yml) |

---

## References

- [Razorpay Documentation](https://razorpay.com/docs/payments/payment-gateway/web-standard/getting-started/)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [Razorpay Orders API](https://razorpay.com/docs/api/orders/)
- [Payment Verification](https://razorpay.com/docs/payments/payment-gateway/web-standard/verify-payments/)

---

## Next Steps

1. ✅ Razorpay credentials configured
2. ✅ Payment handlers created
3. ✅ DynamoDB table for payments
4. Implement webhook handler for real-time payment updates
5. Add email receipts after payment
6. Integrate with course enrollment system
7. Add refund handling
