# CodexAI — Payment Flows Documentation

> **Last Updated:** April 2026  
> **Base API URL:** `https://r5exi0cxad.execute-api.ap-south-1.amazonaws.com`  
> **Two flows are documented here:**
> - [Flow A](#flow-a--full-payment-via-website) — Website full payment (user self-serve)
> - [Flow B](#flow-b--emi-installment-payment-via-admin-dashboard) — EMI installment payment (admin-managed)

---

## Table of Contents

1. [Flow A — Full Payment via Website](#flow-a--full-payment-via-website)
   - [Step 1 — User Registers](#step-1--user-registers)
   - [Step 2 — User Verifies Email](#step-2--user-verifies-email)
   - [Step 3 — User Browses & Selects a Course](#step-3--user-browses--selects-a-course)
   - [Step 4 — Order Created](#step-4--order-created)
   - [Step 5 — User Completes Payment on Razorpay Checkout](#step-5--user-completes-payment-on-razorpay-checkout)
   - [Step 6 — Payment Verified (Primary Path)](#step-6--payment-verified-primary-path)
   - [Step 7 — Webhook Backup (Fallback Path)](#step-7--webhook-backup-fallback-path)
   - [Step 8 — User is Enrolled](#step-8--user-is-enrolled)
   - [Flow A — Summary Diagram](#flow-a--summary-diagram)

2. [Flow B — EMI Installment Payment via Admin Dashboard](#flow-b--emi-installment-payment-via-admin-dashboard)
   - [Step 1 — Admin Enrolls Student in EMI Plan](#step-1--admin-enrolls-student-in-emi-plan)
   - [Step 2 — Installment Link Shared with Student](#step-2--installment-link-shared-with-student)
   - [Step 3 — Student Pays Installment](#step-3--student-pays-installment)
   - [Step 4a — Webhook Marks Installment Paid (Automatic)](#step-4a--webhook-marks-installment-paid-automatic)
   - [Step 4b — Admin Syncs Manually (If Webhook Fails)](#step-4b--admin-syncs-manually-if-webhook-fails)
   - [Step 5 — Admin Generates Next Installment Link](#step-5--admin-generates-next-installment-link)
   - [Step 6 — Repeat Until All Installments Paid](#step-6--repeat-until-all-installments-paid)
   - [Flow B — Summary Diagram](#flow-b--summary-diagram)

3. [DynamoDB Tables Reference](#dynamodb-tables-reference)
4. [Emails Reference](#emails-reference)
5. [Error Handling](#error-handling)

---

## Flow A — Full Payment via Website

This is the self-serve flow where a user visits the CodexAI website, registers, selects a course, and pays the full course fee in a single transaction using Razorpay Checkout.

---

### Step 1 — User Registers

**Endpoint:** `POST /auth/signup`  
**Handler:** `src/handlers/auth/signUpWithEmailPassword.js`  
**Triggered by:** User filling in the signup form on the website.

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass@123",
  "fullName": "Adarsh Kumar",
  "phoneNumber": "+919876543210"
}
```

**What happens:**
1. Validates all required fields and email format.
2. Calls **AWS Cognito `SignUp`** — creates a Cognito user with `email`, `name`, and `phone_number` attributes.
3. Cognito sends a **6-digit OTP** to the user's email address automatically.
4. Returns `userId` (Cognito sub) and `userConfirmed: false`.

**Response:**
```json
{
  "message": "User registered. Check email for verification code.",
  "userId": "cognito-sub-uuid",
  "userConfirmed": false
}
```

**DynamoDB writes:** None at this step. A user record is only created in `USERS_TABLE` after successful course enrollment (Step 8).

---

### Step 2 — User Verifies Email

**Endpoint:** `POST /auth/confirm-email`  
**Handler:** `src/handlers/auth/confirmEmailVerification.js`

**Request Body:**
```json
{
  "email": "student@example.com",
  "code": "123456"
}
```

**What happens:**
1. Calls **AWS Cognito `ConfirmSignUp`** with the OTP.
2. Cognito marks the user as confirmed.
3. **Triggers `sendWelcomeRegistrationEmail()`** — sends a welcome email to the user.

**Email sent:** `sendWelcomeRegistrationEmail`  
- **Subject:** `Welcome to CodexAI, {fullName}! Your account is ready 🎉`  
- **To:** User's email  
- **Content:** Account verified, login instructions, explore courses CTA

**Response:**
```json
{
  "message": "Email verified successfully. You can now log in.",
  "confirmed": true
}
```

> **Resend OTP:** `POST /auth/resend-code` if the code expires.

---

### Step 3 — User Browses & Selects a Course

**Endpoint:** `GET /courses` or `GET /courses/{courseId}`  
**Handler:** `src/handlers/courses/listCourses.js` / `getCourse.js`

**What happens:**
1. Frontend fetches course list from `COURSES_TABLE`.
2. Each course includes: `courseId`, `title`, `description`, `price`, `emiInstallments`, `duration`, etc.
3. User selects a course and optionally enters a coupon code.

---

### Step 4 — Order Created

**Endpoint:** `POST /payments/create-order`  
**Handler:** `src/handlers/payments/createOrder.js`

**Request Body:**
```json
{
  "amount": 10000,
  "currency": "INR",
  "email": "student@example.com",
  "fullName": "Adarsh Kumar",
  "phoneNumber": "+919876543210",
  "description": "CodexAI Gen AI Summer Internship",
  "courseId": "course_genai_2024",
  "userId": "cognito-sub-uuid",
  "couponCode": "SUMMER20"
}
```

**What happens:**
1. Validates all required fields (`amount`, `currency`, `email`, `fullName`, `phoneNumber`, `description`, `courseId`).
2. **If `couponCode` provided:**
   - Fetches coupon from `COUPONS_TABLE`.
   - Validates: active, not expired, minimum order value met.
   - Applies discount — calculates `finalAmount`.
3. Calls **Razorpay `orders.create()`** with final amount (in paise), receipt ID, and `notes`:
   ```
   notes: { courseId, email, fullName, phoneNumber, userId, originalAmount, finalAmount, couponCode, discount }
   ```
4. Returns order details to frontend for Razorpay Checkout widget.

**Response:**
```json
{
  "id": "order_XXXXXXXXXXXXXXXX",
  "amount": 8000,
  "originalAmount": 10000,
  "discount": 2000,
  "currency": "INR",
  "status": "created",
  "expiresAt": "2026-04-11T16:00:00.000Z",
  "coupon": { "code": "SUMMER20", "discountPercent": 20 },
  "razorpayKey": "rzp_live_XXXXXXXX"
}
```

**DynamoDB writes:** None at this step.

---

### Step 5 — User Completes Payment on Razorpay Checkout

This step happens entirely on the **Razorpay-hosted checkout** in the browser. No CodexAI server is involved.

**What happens:**
1. Frontend opens the Razorpay Checkout widget using `orderId` and `razorpayKey`.
2. User selects payment method: UPI, Card, Net Banking, Wallet.
3. User authenticates and authorizes the payment.
4. Razorpay returns to the frontend:
   - `razorpay_payment_id` — e.g., `pay_XXXXXXXXXXXXXXXX`
   - `razorpay_order_id` — same order ID from Step 4
   - `razorpay_signature` — HMAC-SHA256 signature for verification

---

### Step 6 — Payment Verified (Primary Path)

**Endpoint:** `POST /payments/verify`  
**Handler:** `src/handlers/payments/verifyPayment.js`

**Request Body:**
```json
{
  "razorpay_payment_id": "pay_XXXXXXXXXXXXXXXX",
  "razorpay_order_id": "order_XXXXXXXXXXXXXXXX",
  "razorpay_signature": "HMAC_SIGNATURE_STRING",
  "email": "student@example.com",
  "fullName": "Adarsh Kumar",
  "phoneNumber": "+919876543210",
  "courseId": "course_genai_2024"
}
```

**What happens:**
1. **Verifies HMAC-SHA256 signature**: `HMAC(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)` — rejects tampered requests.
2. **Fetches payment** from Razorpay API to confirm status = `captured` or `authorized`.
3. **Fetches order** from Razorpay to extract `notes` (courseId, email, etc.).
4. **Resolves course name** from `COURSES_TABLE` using `courseId`.
5. **Saves payment record** to `PAYMENTS_TABLE`:
   ```
   {
     paymentId: "pay_XXX",
     orderId: "order_XXX",
     email, fullName, phoneNumber,
     courseId, courseName,
     amount, currency, method,
     status: "paid",
     createdAt, updatedAt
   }
   ```
6. **Triggers `sendPaymentConfirmationEmail()`:**

**Email sent:** `sendPaymentConfirmationEmail`  
- **Subject:** `Payment Confirmed — You're enrolled in {courseName}! 🎓`  
- **To:** User's email  
- **Content:** Receipt details (paymentId, orderId, amount, method, date), course name, next steps

**Response:**
```json
{
  "message": "Payment verified successfully",
  "valid": true,
  "payment": {
    "paymentId": "pay_XXX",
    "orderId": "order_XXX",
    "amount": 8000,
    "currency": "INR",
    "status": "captured",
    "method": "upi",
    "email": "student@example.com"
  }
}
```

> **Note:** At this point the frontend shows a "Payment Successful" screen. The user record in `USERS_TABLE` is created by the webhook in Step 7.

---

### Step 7 — Webhook Backup (Fallback Path)

**Endpoint:** `POST /api/razorpay/webhook`  
**Handler:** `src/handlers/payments/razorpayWebhook.js`  
**Triggered by:** Razorpay automatically (event: `payment.authorized` or `payment.captured`)

This is a **server-to-server** call from Razorpay to CodexAI's webhook endpoint. It serves two purposes:

1. **Backup path** if the frontend failed to call `/payments/verify` (network error, browser closed).
2. **User enrollment** — creates the user record in `USERS_TABLE`.

**What happens:**
1. **Verifies webhook signature** using `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` — rejects if invalid.
2. Checks `webhookProcessed` flag on existing payment record — prevents double processing.
3. **Calls `enrollUserInCourse()`:**
   - Checks `USERS_TABLE` by email (via full scan or lookup).
   - **If user already exists:** Sends welcome email again, skips creation.
   - **If new user:** Creates user record in `USERS_TABLE`:
     ```
     {
       userId: uuid,
       fullName, email, phoneNumber,
       course: courseName, courseId,
       enrollmentSource: "webhook",
       paymentId, orderId, amount, currency,
       enrolled: true,
       enrolledAt, createdAt, updatedAt
     }
     ```
4. Fetches brochure link from `BROCHURES_TABLE` (matched by `courseId-index` GSI).
5. **Triggers `sendPaymentConfirmationEmail()`** (only if not already sent in Step 6).
6. **Triggers `sendSimpleWelcomeEmail()`** including brochure download link.
7. Marks `webhookProcessed: true` on the payment record in `PAYMENTS_TABLE`.

**Emails sent:**

| Email | Subject | When |
|-------|---------|------|
| `sendPaymentConfirmationEmail` | `Payment Confirmed — You're enrolled in {course}! 🎓` | If not sent in Step 6 |
| `sendSimpleWelcomeEmail` | `Welcome to CodexAI - {course} Course Registration Confirmed` | Always on enrollment |

---

### Step 8 — User is Enrolled

At the end of the flow, the following records exist:

| Table | Record | Key |
|-------|--------|-----|
| `codexai-payments-{stage}` | Payment record with `status: "paid"` | `paymentId` |
| `codexai-users-{stage}` | Student enrollment record | `userId` |

The student has received:
- ✉️ Payment confirmation email (with receipt)
- ✉️ Welcome email (with brochure/course material link)

---

### Flow A — Summary Diagram

```
User (Browser)                    CodexAI Backend                Razorpay            AWS
─────────────────────────────────────────────────────────────────────────────────────────

[REGISTER]
  POST /auth/signup           ──►  signUpWithEmailPassword  ──►  Cognito SignUp
                                                             ◄──  OTP sent to email
  (Enter OTP)
  POST /auth/confirm-email    ──►  confirmEmailVerification  ──►  Cognito ConfirmSignUp
                                    sendWelcomeRegistrationEmail  ─► Email ✉️

[SELECT COURSE]
  GET /courses                ──►  listCourses               ──►  DynamoDB COURSES_TABLE

[CHECKOUT]
  POST /payments/create-order ──►  createOrder
                                    (validate coupon)        ──►  Razorpay orders.create()
                              ◄──  { orderId, razorpayKey }

[PAY]
  Razorpay Checkout Widget    ──────────────────────────────►  Razorpay Checkout
                              ◄──  { paymentId, orderId, signature }

[VERIFY]
  POST /payments/verify       ──►  verifyPayment
                                    (verify HMAC signature)
                                    (fetch payment from Razorpay) ──► Razorpay API
                                    (save to PAYMENTS_TABLE) ──► DynamoDB
                                    sendPaymentConfirmationEmail  ─► Email ✉️
                              ◄──  { valid: true, payment }

[WEBHOOK - runs async]
  Razorpay server             ──►  razorpayWebhook
                                    (verify webhook signature)
                                    (create USERS_TABLE record) ──► DynamoDB
                                    (fetch brochure link)  ──► DynamoDB BROCHURES_TABLE
                                    sendPaymentConfirmationEmail  ─► Email ✉️ (if needed)
                                    sendSimpleWelcomeEmail        ─► Email ✉️
```

---

## Flow B — EMI Installment Payment via Admin Dashboard

This flow is **admin-initiated**. The admin enrolls a student on an EMI plan, generates payment links per installment, and the student pays each installment separately over time via a link-based checkout (no Razorpay Checkout widget needed).

---

### Step 1 — Admin Enrolls Student in EMI Plan

**Endpoint:** `POST /payments/emi/enroll`  
**Handler:** `src/handlers/payments/createEmiEnrollment.js`  
**Triggered by:** Admin filling the "Enroll Student" form in the admin dashboard → EMI Management page.

**Request Body:**
```json
{
  "studentEmail": "student@example.com",
  "studentName": "Adarsh Kumar",
  "studentPhone": "+919876543210",
  "courseId": "course_genai_2024",
  "totalAmount": 10000,
  "installments": 4,
  "startDate": "2026-04-15"
}
```

> If `installments` is not provided, it falls back to `course.emiInstallments` from `COURSES_TABLE`.

**What happens:**
1. **Fetches course** from `COURSES_TABLE` — validates it exists, gets `title` and `emiInstallments`.
2. **Calculates installment schedule:**
   - `installmentAmount = totalAmount / installments` (rounded to 2 decimal places)
   - Due dates are assigned monthly from `startDate`
   - Example for ₹10,000 in 4 installments:
     ```
     Installment 1: ₹2,500 — Due 15 Apr 2026
     Installment 2: ₹2,500 — Due 15 May 2026
     Installment 3: ₹2,500 — Due 15 Jun 2026
     Installment 4: ₹2,500 — Due 15 Jul 2026
     ```
3. **Creates Razorpay Payment Link** for installment #1 (30-day expiry):
   ```
   {
     amount: 250000,  (in paise)
     currency: "INR",
     description: "Installment 1/4 — CodexAI Gen AI Course",
     customer: { name, email, contact },
     notes: { enrollmentId, installmentNumber: 1 },
     expire_by: <now + 30 days>
   }
   ```
4. **Saves enrollment record** to `EMI_ENROLLMENTS_TABLE`:
   ```json
   {
     "enrollmentId": "emi_uuid",
     "studentEmail": "student@example.com",
     "studentName": "Adarsh Kumar",
     "studentPhone": "+919876543210",
     "courseId": "course_genai_2024",
     "courseName": "CodexAI Gen AI Summer Internship",
     "totalAmount": 10000,
     "totalInstallments": 4,
     "paidInstallments": 0,
     "enrollmentStatus": "active",
     "schedule": [
       {
         "installmentNumber": 1,
         "amount": 2500,
         "dueDate": "2026-04-15",
         "status": "pending",
         "paymentLinkId": "plink_XXXXXXXXXXXXXXXX",
         "paymentLinkUrl": "https://rzp.io/l/XXXXXX"
       },
       { "installmentNumber": 2, "amount": 2500, "dueDate": "2026-05-15", "status": "pending" },
       { "installmentNumber": 3, "amount": 2500, "dueDate": "2026-06-15", "status": "pending" },
       { "installmentNumber": 4, "amount": 2500, "dueDate": "2026-07-15", "status": "pending" }
     ],
     "createdAt": "2026-04-11T10:00:00.000Z"
   }
   ```
   > Note: Only installment #1 has a `paymentLinkId` and `paymentLinkUrl` at this point. Links for future installments are generated later (Step 5).
5. **Creates master payment record** in `PAYMENTS_TABLE`:
   ```json
   {
     "paymentId": "emi_pending_{enrollmentId}_1",
     "type": "emi",
     "enrollmentId": "emi_uuid",
     "email": "student@example.com",
     "courseId": "course_genai_2024",
     "totalAmount": 10000,
     "paidAmount": 0,
     "pendingAmount": 10000,
     "paidInstallments": 0,
     "totalInstallments": 4,
     "status": "emi_partial"
   }
   ```

**Response:**
```json
{
  "message": "EMI enrollment created successfully",
  "data": {
    "enrollmentId": "emi_uuid",
    "totalInstallments": 4,
    "installmentAmount": 2500,
    "firstInstallmentLink": "https://rzp.io/l/XXXXXX",
    "schedule": [ ... ]
  }
}
```

---

### Step 2 — Installment Link Shared with Student

The admin dashboard displays the payment link URL in the enrollment table.

**Admin actions available:**
- **Copy** — copies `paymentLinkUrl` to clipboard
- Share via WhatsApp, email, SMS (outside the system)

The student receives a simple URL like `https://rzp.io/l/XXXXXX` which they open in any browser.

---

### Step 3 — Student Pays Installment

The student opens the Razorpay-hosted payment link in their browser.

**What happens (on Razorpay's servers):**
1. Student sees: course name, installment amount, due date.
2. Student selects payment method (UPI, card, etc.) and pays.
3. Razorpay marks the payment link as `paid`.
4. Razorpay fires a `payment_link.paid` webhook event to CodexAI.

> No CodexAI backend endpoint is called directly by the student in this flow — unlike Flow A where the student calls `/payments/verify`.

---

### Step 4a — Webhook Marks Installment Paid (Automatic)

**Endpoint:** `POST /api/razorpay/webhook`  
**Handler:** `src/handlers/payments/razorpayWebhook.js`  
**Event:** `payment_link.paid`  
**Triggered by:** Razorpay server automatically after student's payment succeeds.

**What happens:**
1. **Verifies webhook signature** using `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` — rejects if invalid.
2. Extracts `enrollmentId` and `installmentNumber` from the payment link's `notes`.
3. **Fetches enrollment** from `EMI_ENROLLMENTS_TABLE`.
4. **Updates the installment** in the schedule:
   ```json
   {
     "installmentNumber": 1,
     "status": "paid",
     "paymentId": "pay_XXXXXXXXXXXXXXXX",
     "paidAt": "2026-04-11T12:34:56.000Z"
   }
   ```
5. **Recalculates** `paidInstallments` count.
6. If all installments paid → sets `enrollmentStatus: "completed"`.
7. **Updates `PAYMENTS_TABLE`** master record:
   - Increments `paidAmount`, decrements `pendingAmount`
   - Updates `status` to `"completed"` if fully paid

**DynamoDB writes:**
- `EMI_ENROLLMENTS_TABLE` — installment status, paidInstallments, enrollmentStatus
- `PAYMENTS_TABLE` — paidAmount, pendingAmount, status

**Admin dashboard** will reflect the paid installment on the next refresh.

> **Prerequisite:** `RAZORPAY_WEBHOOK_SECRET` must be set in `.env` and match the secret configured in Razorpay Dashboard → Settings → Webhooks.

---

### Step 4b — Admin Syncs Manually (If Webhook Fails)

If the webhook was not received (misconfiguration, webhook secret mismatch, network issue), the admin can manually trigger a sync:

**Endpoint:** `POST /payments/emi/sync`  
**Handler:** `src/handlers/payments/syncEmiInstallments.js`  
**Triggered by:** Admin clicking the **"Sync"** button on an enrollment row in the admin dashboard.

**Request Body:**
```json
{
  "enrollmentId": "emi_uuid"
}
```

**What happens:**
1. Fetches enrollment from `EMI_ENROLLMENTS_TABLE`.
2. For each installment where `status !== "paid"` and `paymentLinkId` exists:
   - Calls **Razorpay `paymentLink.fetch(paymentLinkId)`**
   - If `link.status === "paid"`:
     - Calls `razorpay.paymentLink.fetchPayments(paymentLinkId)` to get actual `paymentId` and `paidAt`
     - Marks installment as `paid` in the schedule (with `syncedAt` timestamp)
3. Recalculates `paidInstallments`.
4. If all paid → `enrollmentStatus: "completed"`.
5. Saves updated enrollment to `EMI_ENROLLMENTS_TABLE`.
6. Updates `PAYMENTS_TABLE` master record.

**Response:**
```json
{
  "message": "Sync complete. 1/4 installments paid.",
  "data": {
    "newlyMarkedPaid": [1],
    "paidInstallments": 1,
    "totalInstallments": 4,
    "enrollmentStatus": "active"
  }
}
```

The admin dashboard shows an alert: `"Sync complete! Installment 1 marked as paid."` and the table refreshes automatically.

---

### Step 5 — Admin Generates Next Installment Link

Once installment 1 is confirmed paid, the admin generates a link for installment 2.

**Endpoint:** `POST /payments/emi/generate-link`  
**Handler:** `src/handlers/payments/generateInstallmentLink.js`  
**Triggered by:** Admin clicking **"Generate Link"** for the next installment in the dashboard.

**Request Body:**
```json
{
  "enrollmentId": "emi_uuid",
  "installmentNumber": 2
}
```

**What happens:**
1. Fetches enrollment from `EMI_ENROLLMENTS_TABLE`.
2. **Validates installment order** — ensures the previous installment (`number - 1`) is already `"paid"`. Rejects if not.
3. Checks that the requested installment is not already paid.
4. **Creates a new Razorpay Payment Link** for installment 2 (30-day expiry):
   ```
   {
     amount: 250000,
     description: "Installment 2/4 — CodexAI Gen AI Course",
     customer: { name, email, contact },
     notes: { enrollmentId, installmentNumber: 2 }
   }
   ```
5. Updates `schedule[1].paymentLinkId` and `schedule[1].paymentLinkUrl` in `EMI_ENROLLMENTS_TABLE`.

**Response:**
```json
{
  "message": "Payment link generated for installment 2",
  "data": {
    "installmentNumber": 2,
    "amount": 2500,
    "dueDate": "2026-05-15",
    "paymentLinkUrl": "https://rzp.io/l/YYYYYY"
  }
}
```

Admin copies the new link and shares it with the student.

---

### Step 6 — Repeat Until All Installments Paid

Steps 3 → 4a/4b → 5 repeat for each installment:

```
Installment 1 link generated on enrollment
→ Student pays → Webhook marks paid
→ Admin generates Installment 2 link
→ Student pays → Webhook marks paid
→ Admin generates Installment 3 link
→ ...
→ Installment 4 paid → enrollmentStatus: "completed"
```

When the final installment is paid, the `PAYMENTS_TABLE` record is updated to `status: "completed"`.

---

### Flow B — Summary Diagram

```
Admin (Dashboard)               CodexAI Backend               Razorpay           DynamoDB
──────────────────────────────────────────────────────────────────────────────────────────

[ENROLL STUDENT]
  POST /payments/emi/enroll  ──► createEmiEnrollment
                                  (calculate schedule)
                                  paymentLink.create(inst 1) ──► Razorpay
                                  (save enrollment)          ──► EMI_ENROLLMENTS_TABLE
                                  (save payment record)      ──► PAYMENTS_TABLE
                             ◄──  { enrollmentId, firstInstallmentLink }

[SHARE LINK]
  Admin copies link ──► Student receives "https://rzp.io/l/XXXXXX"

[STUDENT PAYS INSTALLMENT 1]
  Student opens link ──────────────────────────────────────► Razorpay Hosted Page
                                                              Student pays
                                                              Razorpay fires webhook

[WEBHOOK — AUTOMATIC]
  Razorpay server ──────────────► razorpayWebhook (payment_link.paid)
                                   (verify signature)
                                   (mark inst 1 as paid)    ──► EMI_ENROLLMENTS_TABLE
                                   (update paidAmount)       ──► PAYMENTS_TABLE

  --- OR ---

[MANUAL SYNC — IF WEBHOOK FAILS]
  Admin clicks "Sync" ──► POST /payments/emi/sync
                           (poll Razorpay API for each link) ──► Razorpay
                           (mark paid links in DynamoDB)     ──► EMI_ENROLLMENTS_TABLE
                                                             ──► PAYMENTS_TABLE

[GENERATE NEXT LINK]
  Admin clicks "Generate Link" (inst 2) ──► generateInstallmentLink
                                             (validate inst 1 is paid)
                                             paymentLink.create(inst 2) ──► Razorpay
                                             (save link ID)             ──► EMI_ENROLLMENTS_TABLE
                                        ◄──  { paymentLinkUrl }

[REPEAT FOR INSTALLMENTS 2, 3, 4...]

[ENROLLMENT COMPLETE]
  All 4 installments paid → enrollmentStatus: "completed"
                          → PAYMENTS_TABLE status: "completed"
```

---

## DynamoDB Tables Reference

| Table | Primary Key | GSIs | Used In |
|-------|-------------|------|---------|
| `codexai-users-{stage}` | `userId` | — | Enrollment records (Flow A) |
| `codexai-courses-{stage}` | `courseId` | — | Course details (both flows) |
| `codexai-payments-{stage}` | `paymentId` | `orderId-index`, `email-createdAt-index`, `userId-createdAt-index` | Payment records (both flows) |
| `codexai-emi-enrollments-{stage}` | `enrollmentId` | `email-createdAt-index`, `courseId-createdAt-index` | EMI enrollments (Flow B) |
| `codexai-brochures-{stage}` | `brochureId` | `courseId-index` | Brochure URL lookup (Flow A Step 7) |
| `codexai-coupons-{stage}` | `couponCode` | `isActive-expiresAt-index` | Coupon validation (Flow A Step 4) |

---

## Emails Reference

| Email Function | Subject | Trigger | Flow |
|----------------|---------|---------|------|
| `sendWelcomeRegistrationEmail` | `Welcome to CodexAI, {name}! Your account is ready 🎉` | Email OTP confirmed | Flow A Step 2 |
| `sendPaymentConfirmationEmail` | `Payment Confirmed — You're enrolled in {course}! 🎓` | Payment verified OR webhook | Flow A Steps 6 & 7 |
| `sendSimpleWelcomeEmail` | `Welcome to CodexAI - {course} Course Registration Confirmed` | Webhook enrollment | Flow A Step 7 |
| `sendBrochureRequestEmail` | `Your {course} Brochure from CodexAI` | Brochure enquiry form | Separate feature |
| `sendTicketConfirmationMail` | `Support Ticket Created [{ticketId}]` | Support ticket created | Separate feature |
| `sendTiketUpdateStatusEmail` | `Update on Your Support Ticket - {ticketId}` | Ticket status changed | Separate feature |

> All emails are sent via **Gmail App Password** (SMTP). They are **non-blocking** — a failure to send email does not fail the payment or enrollment.

---

## Error Handling

### Flow A

| Scenario | Handled By | Behaviour |
|----------|------------|-----------|
| Invalid coupon code | `createOrder` | Returns 400 with error message |
| Razorpay signature mismatch | `verifyPayment` | Returns 400 `{ valid: false }` |
| Payment not captured | `verifyPayment` | Returns 400 |
| Email send fails | `verifyPayment` / `razorpayWebhook` | Logs warning, does not fail response |
| Frontend never calls `/payments/verify` | `razorpayWebhook` | Webhook serves as fallback to create user record |
| Duplicate webhook events | `razorpayWebhook` | `webhookProcessed` flag prevents reprocessing |

### Flow B

| Scenario | Handled By | Behaviour |
|----------|------------|-----------|
| Course not found | `createEmiEnrollment` | Returns 404 |
| Previous installment not yet paid | `generateInstallmentLink` | Returns 400 with message |
| Installment already has a payment link | `generateInstallmentLink` | Returns 400 |
| Webhook secret wrong / not configured | `razorpayWebhook` | Signature verification fails; admin must use Sync |
| Razorpay API unavailable during sync | `syncEmiInstallments` | Logs error per installment, continues with others |
| Enrollment not found | `syncEmiInstallments` | Returns 404 |

---

*Document maintained by the CodexAI Backend Team.*
