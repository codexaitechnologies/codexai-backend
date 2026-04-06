# Razorpay Payment Endpoints - Quick Reference

## Endpoints Summary

### 1. Create Order
```
POST /payments/create-order

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

RESPONSE (200):
{
  "message": "Order created successfully",
  "order": {
    "id": "order_2QlLg5lIcTuTYr",
    "amount": 499,
    "currency": "INR",
    "status": "created",
    "shortUrl": "https://rzp.io/l/xxxxx",
    "paymentDetails": {
      "keyId": "rzp_test_XXXXXXXXXXXXXXXX"
    }
  }
}
```

### 2. Verify Payment
```
POST /payments/verify

{
  "razorpay_order_id": "order_2QlLg5lIcTuTYr",
  "razorpay_payment_id": "pay_2QlLg5lIcTuTYr",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}

RESPONSE (200):
{
  "message": "Payment verified successfully",
  "valid": true,
  "payment": {
    "paymentId": "pay_2QlLg5lIcTuTYr",
    "orderId": "order_2QlLg5lIcTuTYr",
    "amount": 499,
    "status": "captured",
    "email": "user@example.com"
  }
}
```

### 3. Get Order Status
```
GET /payments/order/order_2QlLg5lIcTuTYr

RESPONSE (200):
{
  "message": "Order details retrieved successfully",
  "order": {
    "id": "order_2QlLg5lIcTuTYr",
    "amount": 499,
    "status": "created",
    "attempts": 0,
    "paymentId": null
  }
}
```

---

## Postman Collection Examples

### Create Order
```
POST {{base_url}}/payments/create-order

Headers:
Content-Type: application/json

Body:
{
  "amount": 499,
  "currency": "INR",
  "email": "john@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "description": "Web Development Course",
  "courseId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "{{userId}}"
}
```

### Verify Payment
```
POST {{base_url}}/payments/verify

Headers:
Content-Type: application/json

Body:
{
  "razorpay_order_id": "order_2QlLg5lIcTuTYr",
  "razorpay_payment_id": "pay_2QlLg5lIcTuTYr",
  "razorpay_signature": "signature_from_razorpay"
}
```

### Get Order Status
```
GET {{base_url}}/payments/order/order_2QlLg5lIcTuTYr
```

### Webhook (Automatic Enrollment - No Manual Call Needed)
```
Server-to-Server

Event: payment.authorized
Endpoint: POST /api/razorpay/webhook

Razorpay automatically sends this when payment succeeds.
No manual API call needed - this ensures enrollment happens
even if browser closes after payment.

For setup: See RAZORPAY_WEBHOOK_GUIDE.md
```

---

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Complete Payment Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend                           Backend                │
│  ├─ 1. Create Order ─────────────→ POST /create-order     │
│  │   └─ Returns Razorpay URL                              │
│  │                                                         │
│  ├─ 2. Show Razorpay Modal       ← Razorpay Modal         │
│  │   └─ Student enters card                               │
│  │                                                         │
│  ├─ 3. Capture Payment            → Razorpay Servers     │
│  │   └─ Razorpay captures         (Processing)            │
│  │                                                         │
│  ├─ 4. Verify Payment ────────────→ POST /verify          │
│  │   └─ Frontend verifies         (with signature)        │
│  │                                                         │
│  ├─ 5. Enroll User        ← Success Response              │
│  │   └─ Frontend enrolls                                  │
│  │       (IF frontend succeeds)                           │
│  │                                                         │
│  └─ 6. Redirect Home               Webhook (Async) ──→   │
│                               POST /api/razorpay/webhook  │
│                                   (SAFETY NET)            │
│                               ├─ Re-verify payment        │
│                               ├─ Enroll user              │
│                               ├─ Send email               │
│                               └─ Log event                │
│                                                             │
│  ✓ Safety: Webhook completes enrollment even if            │
│    browser closes before step 6                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── handlers/
│   ├── createOrder.js          # Create payment orders
│   ├── verifyPayment.js        # Verify payment signatures (frontend)
│   ├── getOrderStatus.js       # Check order status
│   └── razorpayWebhook.js      # Webhook handler (backup enrollment)
└── utils/
    └── dynamodb.js             # Database utilities
```

---

## Database Table

**Table Name:** `payments-{stage}` (e.g., `payments-dev`)

**Attributes:**
- `paymentId` (PK): Razorpay payment ID
- `orderId`: Razorpay order ID (GSI)
- `email`: User email (GSI)
- `createdAt`: Timestamp (GSI Sort Key)
- Amount, currency, status, method, etc.
- `webhookProcessed`: Boolean (true if webhook processed)
- `webhookEvent`: "payment.authorized" etc.

---

## Environment Variables

Required in `.env`:
```
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=Ad@rsh15101996
FRONTEND_URL=https://codexai.co.in
```

---

## Deployment

```bash
# Install packages
npm install

# Deploy to AWS
serverless deploy

# Test locally
serverless offline start
```

---

## Frontend Integration (JavaScript)

```javascript
// 1. Create order
const orderResponse = await fetch('{{base_url}}/payments/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 499,
    currency: 'INR',
    email: 'user@example.com',
    fullName: 'John Doe',
    phoneNumber: '+91-9876543210',
    description: 'Course Name',
    courseId: 'course_id'
  })
});

const orderData = await orderResponse.json();

// 2. Open Razorpay Checkout
const options = {
  key: orderData.order.paymentDetails.keyId,
  order_id: orderData.order.id,
  amount: orderData.order.amount * 100,
  handler: async (response) => {
    // 3. Verify payment
    const verifyResponse = await fetch('{{base_url}}/payments/verify', {
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
      alert('✓ Payment successful!');
      window.location.href = '/dashboard';
    }
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

---

## Test Credentials

Use in test mode:
- **Order Amount:** ₹1 minimum
- **Test Cards:** Use Razorpay test cards (4111 1111 1111 1111, etc.)
- **Mode:** Always test first before going live

---

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Amount < ₹1 | Minimum order is ₹1 |
| 400 | Invalid currency | Use: INR, USD, GBP, EUR |
| 400 | Missing fields | Check all required fields |
| 401 | Invalid signature | Signature verification failed |
| 401 | Razorpay auth failed | Check API credentials |
| 404 | Order not found | Order ID doesn't exist |
| 429 | Too many requests | Rate limited, retry later |

---

## Common Flows

### Happy Path (Successful Payment)
```
User clicks "Buy" 
  → Create Order (POST /payments/create-order)
  → Razorpay Checkout opens
  → User enters card details
  → Payment processed
  → Razorpay returns payment_id & signature
  → Verify Payment (POST /payments/verify)
  → Payment recorded in DynamoDB
  → User gets course access
```

### Check Payment Status
```
After payment, check status with:
GET /payments/order/order_xxxxx
→ Returns order status (created, attempted, paid)
```

### Refund (Manual - Razorpay Dashboard)
```
For refunds:
1. Login to Razorpay Dashboard
2. Find payment in Transactions
3. Click Refund
4. Process refund
```

---

## Live Mode Setup

When ready for production:

1. Get Live Razorpay Keys from Dashboard
2. Update `.env` with live keys
3. Remove test mode flags
4. Change FRONTEND_URL to production domain
5. Redeploy: `serverless deploy --stage prod`
6. Update payment handlers if needed for live mode

---

## Resources

- [Complete Setup Guide](RAZORPAY_SETUP.md)
- [Razorpay Docs](https://razorpay.com/docs/)
- [Payment Methods](https://razorpay.com/docs/payments/)
- [Signature Verification](https://razorpay.com/docs/payments/payment-gateway/web-standard/verify-payments/)
