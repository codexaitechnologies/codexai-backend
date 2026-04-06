# Razorpay Webhook Handler - Setup & Implementation Guide

## Overview

The Razorpay webhook handler is a **critical backup verification safety net** that ensures student enrollment even if the frontend payment flow fails (e.g., browser closed after payment completion).

### Why Webhooks?

1. **Frontend Reliability**: If a student closes the browser before the redirect, the frontend won't execute enrollment
2. **Safety Net**: Razorpay sends server-to-server webhooks independently, ensuring enrollment happens regardless
3. **Audit Trail**: All webhook events are logged and stored for debugging and verification
4. **Dual Layer Protection**: Both frontend (`verifyPayment.js`) and backend (`razorpayWebhook.js`) verify and process payments

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Frontend                          2. Server Webhook     │
│  ├─ Create Order                      ├─ Payment.authorized │
│  ├─ Show Razorpay Modal               ├─ Verify Signature   │
│  ├─ Capture Payment                   ├─ Verify Payment     │
│  ├─ Verify Payment                    ├─ Enroll User        │
│  ├─ Enroll User                       └─ Send Email         │
│  └─ Redirect Home                                           │
│                                                             │
│  Safety Net: If step 6 fails, webhook still completes      │
│  all remaining steps (3-5) asynchronously                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoint

**Endpoint:** `POST /api/razorpay/webhook`

**Type:** Webhook (server-to-server, no authentication header needed)

**Headers Required:**
- `X-Razorpay-Signature` - HMAC-SHA256 signature for verification

---

## Setup Instructions

### 1. Configure Razorpay Dashboard

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings → Webhooks**
3. Click **Add Webhook**
4. Fill in:
   - **Webhook URL:** `https://your-api.example.com/api/razorpay/webhook`
   - **Events:** Select all payment & order events (see below)
   - **Active:** Toggle ON

### 2. Select Webhook Events

Configure these events for automatic enrollment:

```
✓ payment.authorized      - Payment successful & authorized
✓ payment.captured        - Payment captured in Razorpay
✓ order.paid              - Complete order payment received
✓ payment.failed          - Payment failed (for logging)
```

### 3. Environment Variables

No additional setup needed - uses existing:
- `RAZORPAY_KEY_SECRET` - For signature verification
- `PAYMENTS_TABLE` - For storing payment records
- `USERS_TABLE` - For storing enrolled users
- `BROCHURES_TABLE` - For fetching course brochures

### 4. Verify Configuration

Test the webhook in Razorpay dashboard:
1. Go to **Settings → Webhooks**
2. Click your webhook URL
3. Click **Send Test Event**
4. Verify you receive `200 OK` response

---

## Webhook Events & Flow

### Event: `payment.authorized`

**Triggers when:** Payment is successfully authorized (most common)

**Process:**
```
1. Verify X-Razorpay-Signature
2. Extract payment & order details
3. Check if already processed (idempotency)
4. Save payment record to PAYMENTS_TABLE
5. Enroll user in course:
   └─ Get or create user record
   └─ Send welcome email with brochure
6. Return 200 OK
```

**User Enrollment Details Stored:**
```javascript
{
  userId: "uuid",
  email: "student@example.com",
  fullName: "Student Name",
  phoneNumber: "+91-1234567890",
  courseId: "course-id",
  course: "Course Name",
  paymentId: "pay_xxxxx",
  orderId: "order_xxxxx",
  enrolled: true,
  enrollmentSource: "webhook",
  enrolledAt: "2024-04-04T10:30:00.000Z",
  createdAt: "2024-04-04T10:30:00.000Z"
}
```

### Event: `payment.failed`

**Triggers when:** Payment fails or is rejected

**Process:**
```
1. Verify signature
2. Log failure reason
3. Store failed payment record for tracking
4. Return 200 OK (no enrollment)
```

**No Enrollment:** Payment failures don't trigger user enrollment

### Event: `order.paid`

**Triggers when:** Order payment is fully confirmed

**Process:**
```
1. Verify signature
2. Check if already processed
3. Extract course & student info from order notes
4. Enroll user if data complete
5. Return 200 OK
```

---

## Idempotency (Safety Check)

The webhook handler prevents double-enrollment using idempotency checks:

```javascript
// Check if payment already processed
const existingPayment = await getPaymentByPaymentId(paymentId);
if (existingPayment && existingPayment.webhookProcessed) {
  // Already processed - skip enrollment
  return { enrolled: false, status: 'already_processed' };
}
```

**Result:** Even if Razorpay sends duplicate webhook events, students enroll only once.

---

## Error Handling

All errors return `200 OK` to Razorpay webhook handler:

```javascript
try {
  // Process webhook
} catch (error) {
  console.error('Webhook error:', error);
  // ✓ Still return 200 to Razorpay
  return formatResponse(200, {
    message: 'Webhook acknowledged with error',
    error: error.message
  });
}
```

**Why 200 OK on errors?** This prevents Razorpay from retrying the webhook indefinitely.

---

## Testing Webhook Locally

### Option 1: Razorpay Test Mode

1. Get test key from Razorpay Dashboard
2. Use in development:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=test_secret_xxxxx
   ```
3. Use test card: `4111111111111111` with any CVV/expiry

### Option 2: Simulate Webhook Locally

Create a test script to simulate webhook:

```bash
#!/bin/bash

# Webhook payload
PAYLOAD='{"event":"payment.authorized","payload":{"payment":{"id":"pay_test123","order_id":"order_test123","amount":50000,"email":"test@example.com","created_at":1712217000,"notes":{"fullName":"Test Student","phoneNumber":"+91-9876543210","courseId":"course-web","course":"Web Development"}}}}'

# Generate signature
SIGNATURE=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$RAZORPAY_KEY_SECRET" -hex | cut -d' ' -f2)

# Send webhook
curl -X POST http://localhost:3000/api/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Option 3: Use Razorpay SDK

Test signature generation:

```javascript
const crypto = require('crypto');

const body = JSON.stringify({
  event: 'payment.authorized',
  payload: { /* ... */ }
});

const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(body)
  .digest('hex');

console.log('Generated signature:', signature);
```

---

## Debugging Webhook Issues

### Check 1: Signature Verification

**Problem:** "Invalid webhook signature"

**Solutions:**
1. Verify `RAZORPAY_KEY_SECRET` is correct (check `.env`)
2. Ensure raw body is used, not parsed JSON
3. In serverless-offline, body might be pre-parsed

**Fix for serverless-offline:**
```javascript
const body = typeof event.body === 'string' 
  ? event.body 
  : JSON.stringify(event.body);
```

### Check 2: Missing Order Notes

**Problem:** User not enrolled from webhook

**Solutions:**
1. Verify order notes contain `courseId`, `fullName`, `phoneNumber`
2. Check order creation includes notes:
   ```javascript
   const order = await razorpay.orders.create({
     amount: 50000,
     notes: {
       courseId: 'course-web',
       course: 'Web Development',
       fullName: 'Student Name',
       phoneNumber: '+91-9876543210',
       email: 'student@example.com'
     }
   });
   ```

### Check 3: CloudWatch Logs

**View webhook execution logs:**

```bash
# Via AWS CLI
aws logs tail /aws/lambda/codexai-backend-dev-razorpayWebhook --follow

# Or via Serverless Framework
serverless logs -f razorpayWebhook --stage dev --tail
```

**Look for:**
- `Webhook event received: payment.authorized`
- `Processing payment.authorized`
- `User enrolled via webhook`
- Error messages for debugging

### Check 4: Webhook Retries

**Razorpay retries webhook if not 200 OK:**
- 1st retry: 5 minutes
- 2nd retry: 30 minutes
- 3rd retry: 3 hours
- 4th retry: 24 hours

**Prevent duplicate processing:** Use `webhookProcessed` flag in payment record.

---

## Database Records Created

### PaymentsTable Entry

```javascript
{
  paymentId: "pay_xxxxx",           // Primary key
  orderId: "order_xxxxx",           // GSI: orderId-index
  email: "student@example.com",     // GSI: email-createdAt-index
  fullName: "Student Name",
  phoneNumber: "+91-1234567890",
  courseId: "course-id",
  amount: 500,                      // In rupees
  currency: "INR",
  status: "captured",
  method: "card",
  description: "Web Development Course",
  createdAt: "2024-04-04T10:25:00.000Z",
  webhookReceivedAt: "2024-04-04T10:30:00.000Z",
  webhookProcessed: true,
  webhookEvent: "payment.authorized",
  source: "webhook"
}
```

### UsersTable Entry

```javascript
{
  userId: "uuid-xxxx-xxxx",         // Primary key
  email: "student@example.com",
  fullName: "Student Name",
  phoneNumber: "+91-1234567890",
  courseId: "course-id",
  course: "Web Development",
  enrolled: true,
  enrollmentSource: "webhook",
  paymentId: "pay_xxxxx",
  orderId: "order_xxxxx",
  enrolledAt: "2024-04-04T10:30:00.000Z",
  createdAt: "2024-04-04T10:30:00.000Z",
  updatedAt: "2024-04-04T10:30:00.000Z"
}
```

---

## Best Practices

### ✓ DO:

1. **Verify signatures** - Never skip signature verification
2. **Return 200 OK** - Always return 200 OK to prevent infinite retries
3. **Log everything** - Log all webhook events for debugging
4. **Use idempotency** - Check if already processed before enrolling
5. **Handle errors gracefully** - Catch all exceptions, don't throw 500 errors
6. **Send welcome emails** - Confirm enrollment with student email

### ✗ DON'T:

1. **Modify order amount** - Don't change payment amount in webhook
2. **Throw 500 errors** - Return 200 OK even on processing errors
3. **Skip enrollment** - Always enroll if payment is verified
4. **Rely on frontend alone** - Always have webhook as fallback
5. **Create duplicate users** - Check email/phone before creating user record

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Webhook Success Rate**
   ```sql
   SELECT webhookEvent, COUNT(*) as count
   FROM PAYMENTS_TABLE
   WHERE webhookProcessed = true
   GROUP BY webhookEvent;
   ```

2. **Enrollment via Webhook**
   ```sql
   SELECT COUNT(*) as enrollments
   FROM USERS_TABLE
   WHERE enrollmentSource = 'webhook';
   ```

3. **Failed Payments**
   ```sql
   SELECT COUNT(*) as failed_count
   FROM PAYMENTS_TABLE
   WHERE status = 'failed'
   AND createdAt > NOW() - INTERVAL 1 DAY;
   ```

### CloudWatch Dashboard

Create alerts for:
- Webhook processing errors
- Duplicate payment attempts (possible fraud)
- Enrollment delays (webhook lag)
- Email delivery failures

---

## Comparison: Frontend vs Webhook

| Aspect | Frontend (verifyPayment) | Webhook (razorpayWebhook) |
|--------|--------------------------|---------------------------|
| **Triggered by** | Student browser | Razorpay servers |
| **When** | After payment completion | Async (0-2 min) |
| **Reliability** | Medium (browser can crash) | High (server-to-server) |
| **User Auth** | Via JWT bearer token | HMAC signature |
| **Fallback** | Webhook serves as backup | Primary enrollment source |
| **Idempotency** | Frontend may retry multiple times | Razorpay may retry (handled) |

---

## Troubleshooting Checklist

- [ ] Webhook URL accessible from internet
- [ ] RAZORPAY_KEY_SECRET correct in `.env`
- [ ] Webhook endpoint returns 200 OK (test in Razorpay dashboard)
- [ ] Order creation includes all required notes:
  - courseId
  - fullName
  - phoneNumber
  - course
  - email
- [ ] Student email in database after payment
- [ ] Welcome email received by student
- [ ] Payment record in PAYMENTS_TABLE with `webhookProcessed: true`
- [ ] CloudWatch logs show enrollment message

---

## References

- [Razorpay Webhooks Documentation](https://razorpay.com/docs/webhooks/)
- [Webhook Security (Signature Verification)](https://razorpay.com/docs/webhooks/validate-webhook-signature/)
- [Payment Events Reference](https://razorpay.com/docs/webhooks/supported-events/#payment-events)
- [Order Events Reference](https://razorpay.com/docs/webhooks/supported-events/#order-events)

---

## Related Files

- [Create Order Handler](createOrder.js) - Initial order creation
- [Verify Payment Handler](verifyPayment.js) - Frontend payment verification
- [User Creation Handler](createUser.js) - User enrollment logic
- [Email Service](../utils/emailService.js) - Welcome email sending
