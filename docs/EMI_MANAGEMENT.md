# EMI Management — Feature Documentation

## Overview

The **No-Cost EMI** feature allows admins to enroll students in a course and split the total course fee into N monthly installments. The student is enrolled in the course immediately upon creation. Payment links are generated per-installment via Razorpay and shared manually by the admin. The system automatically marks installments as paid via webhook and closes the enrollment once all installments are settled.

---

## Architecture

```
Admin Dashboard
    │
    ├── EMI Management page
    │       ├── Enroll Student dialog  →  POST /payments/emi/enroll
    │       ├── Generate Link button   →  POST /payments/emi/generate-link
    │       └── List Enrollments       →  GET  /payments/emi/enrollments
    │
Backend (AWS Lambda + DynamoDB)
    │
    ├── createEmiEnrollment.js        ──▶  EMI_ENROLLMENTS_TABLE  +  PAYMENTS_TABLE
    ├── generateInstallmentLink.js    ──▶  EMI_ENROLLMENTS_TABLE  (update schedule)
    ├── getEmiEnrollments.js          ──▶  EMI_ENROLLMENTS_TABLE  (scan / GSI query)
    └── razorpayWebhook.js            ──▶  payment_link.paid event
            └── handlePaymentLinkPaid()
                    ├── marks installment status = paid
                    ├── increments paidInstallments
                    ├── if all paid → enrollmentStatus = completed
                    └── updates PAYMENTS_TABLE record
```

---

## Course Configuration

Before enrolling a student in EMI, set `emiInstallments` on the course:

```json
POST /courses
{
  "title": "Full Stack Development",
  "price": 15000,
  "emiInstallments": 3
}
```

`emiInstallments` must be ≥ 2. If a course has no `emiInstallments` field (or it is < 2), the EMI enrollment will fail with a descriptive error.

The field can also be set via `PUT /courses/:courseId` using the `emiInstallments` key.

---

## API Endpoints

### 1. Enroll Student in EMI
**`POST /payments/emi/enroll`**

Enrolls a student, creates the installment schedule, and auto-generates a Razorpay Payment Link for **installment 1**.

**Request body:**
```json
{
  "studentName": "Rahul Sharma",
  "email": "rahul@example.com",
  "phoneNumber": "+91-9876543210",
  "courseId": "course-uuid",
  "userId": "cognito-sub-optional",
  "dueDay": 1
}
```

| Field | Required | Description |
|---|---|---|
| `studentName` | ✅ | Student's full name |
| `email` | ✅ | Student's email (used for Razorpay notification) |
| `phoneNumber` | ✅ | Student's phone (used for SMS notification) |
| `courseId` | ✅ | Must have `emiInstallments ≥ 2` set on the course |
| `userId` | ❌ | Cognito sub if the student already has an account |
| `dueDay` | ❌ | Day of month for installment due dates (1–28, default: 1) |

**Response `201`:**
```json
{
  "message": "EMI enrollment created. Payment link for installment 1 generated.",
  "data": {
    "enrollmentId": "emi_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "paymentLinkUrl": "https://rzp.io/l/xxxxx",
    "installmentAmount": 5000,
    "totalInstallments": 3,
    "courseName": "Full Stack Development",
    "enrollment": { ... }
  }
}
```

---

### 2. Generate Installment Payment Link
**`POST /payments/emi/generate-link`**

Generates a Razorpay Payment Link for a specific installment. Can also regenerate an existing link.

> **Rule:** Installments must be paid sequentially. You cannot generate a link for installment N until installment N−1 is paid.

**Request body:**
```json
{
  "enrollmentId": "emi_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "installmentNumber": 2
}
```

**Response `200`:**
```json
{
  "message": "Payment link for installment 2 generated successfully.",
  "data": {
    "enrollmentId": "emi_...",
    "installmentNumber": 2,
    "paymentLinkUrl": "https://rzp.io/l/yyyyy",
    "paymentLinkId": "plink_...",
    "amount": 5000,
    "dueDate": "2026-05-01"
  }
}
```

---

### 3. Get EMI Enrollments
**`GET /payments/emi/enrollments`**

Returns all EMI enrollments, optionally filtered.

**Query parameters:**

| Param | Description |
|---|---|
| `email` | Filter by student email |
| `status` | Filter by `active` or `completed` |

**Response `200`:**
```json
{
  "message": "EMI enrollments fetched successfully",
  "data": {
    "count": 12,
    "enrollments": [
      {
        "enrollmentId": "emi_...",
        "studentName": "Rahul Sharma",
        "email": "rahul@example.com",
        "phoneNumber": "+91-9876543210",
        "courseId": "course-uuid",
        "courseName": "Full Stack Development",
        "totalAmount": 15000,
        "installmentAmount": 5000,
        "totalInstallments": 3,
        "paidInstallments": 1,
        "enrollmentStatus": "active",
        "pendingAmount": 10000,
        "nextInstallment": {
          "installmentNumber": 2,
          "amount": 5000,
          "dueDate": "2026-05-01",
          "status": "scheduled",
          "paymentLinkUrl": null
        },
        "schedule": [
          {
            "installmentNumber": 1,
            "amount": 5000,
            "dueDate": "2026-04-01",
            "status": "paid",
            "paymentLinkId": "plink_...",
            "paymentLinkUrl": "https://rzp.io/l/...",
            "paymentId": "pay_...",
            "paidAt": "2026-04-10T08:30:00.000Z"
          },
          {
            "installmentNumber": 2,
            "amount": 5000,
            "dueDate": "2026-05-01",
            "status": "scheduled"
          },
          {
            "installmentNumber": 3,
            "amount": 5000,
            "dueDate": "2026-06-01",
            "status": "scheduled"
          }
        ],
        "createdAt": "2026-04-10T07:00:00.000Z",
        "updatedAt": "2026-04-10T08:30:00.000Z"
      }
    ]
  }
}
```

---

## DynamoDB — `codexai-emi-enrollments-{stage}`

### Primary Key
| Attribute | Type | Role |
|---|---|---|
| `enrollmentId` | String | Partition key — format: `emi_{uuid}` |

### Global Secondary Indexes
| Index | Hash Key | Range Key | Use Case |
|---|---|---|---|
| `email-createdAt-index` | `email` | `createdAt` | Fetch all enrollments for a student |
| `courseId-createdAt-index` | `courseId` | `createdAt` | Fetch all enrollments for a course |

### Full Item Schema
```
enrollmentId       String   PK
studentName        String
email              String   GSI1 hash
phoneNumber        String
courseId           String   GSI2 hash
courseName         String
userId             String?
totalAmount        Number   total course price
installmentAmount  Number   ceil(totalAmount / totalInstallments)
totalInstallments  Number
paidInstallments   Number
enrollmentStatus   String   active | completed | defaulted
createdAt          String   ISO-8601  GSI1+GSI2 range
updatedAt          String   ISO-8601

schedule           List<Map>
  installmentNumber  Number
  amount             Number
  dueDate            String  YYYY-MM-DD
  status             String  scheduled | pending_payment | paid | overdue
  paymentLinkId      String?
  paymentLinkUrl     String?
  paymentLinkCreatedAt String?
  paymentId          String?
  paidAt             String?
```

---

## PAYMENTS_TABLE Record

When an EMI enrollment is created, a record is written to `PAYMENTS_TABLE` with:

```json
{
  "paymentId": "emi_pending_{enrollmentId}_1",
  "status": "emi_partial",
  "method": "emi",
  "paidAmount": 0,
  "pendingAmount": 15000,
  "totalInstallments": 3,
  "paidInstallments": 0,
  "source": "emi_enrollment"
}
```

As installments are paid via webhook, this record is updated (`paidAmount`, `pendingAmount`, `paidInstallments`, `status`). When all installments are paid, `status` becomes `completed`.

---

## Webhook — `payment_link.paid`

Razorpay fires `payment_link.paid` when a student completes payment via a Payment Link.

The handler (`handlePaymentLinkPaid` in `razorpayWebhook.js`) extracts `enrollmentId` and `installmentNumber` from the Payment Link's `notes` field, then:

1. Fetches the enrollment from `EMI_ENROLLMENTS_TABLE`
2. Marks `schedule[installmentNumber - 1].status = 'paid'`
3. Sets `paymentId` and `paidAt` on the installment
4. Increments `paidInstallments`
5. If `paidInstallments === totalInstallments` → sets `enrollmentStatus = 'completed'`
6. Saves updated enrollment
7. Updates the `PAYMENTS_TABLE` record

> The Razorpay Payment Link **must** be created with `notes.enrollmentId` and `notes.installmentNumber` for the webhook to function. All three handlers (`createEmiEnrollment`, `generateInstallmentLink`) set these automatically.

---

## Admin Dashboard — EMI Management Page

Route: `/emi`

### Features
- **Stats bar** — Total / Active / Completed enrollment counts
- **Search & Filter** — Filter by student email and/or enrollment status
- **Enroll Student dialog**
  - Input: name, email, phone, course dropdown (shows only courses with `emiInstallments` set, including per-installment amount preview)
  - On submit: calls `POST /payments/emi/enroll` → shows the generated payment link
- **Enrollments table**
  - Columns: Student, Course, Installments paid/total, Total Amount, Pending Amount, Status, Enrolled date
  - Click any row to **expand** the installment schedule
- **Installment schedule** (expanded row)
  - Shows each installment: number, amount, due date, status badge
  - Copy-link button for existing links
  - "Generate Link" / "Regenerate" button for unpaid installments

---

## Files Changed

### Backend
| File | Change |
|---|---|
| `src/handlers/payments/createEmiEnrollment.js` | **New** — EMI enrollment handler |
| `src/handlers/payments/generateInstallmentLink.js` | **New** — Per-installment link generator |
| `src/handlers/payments/getEmiEnrollments.js` | **New** — List/filter enrollments |
| `src/handlers/payments/razorpayWebhook.js` | Added `payment_link.paid` case + `handlePaymentLinkPaid()` |
| `src/handlers/courses/createCourse.js` | Added optional `emiInstallments` field |
| `src/handlers/courses/updateCourse.js` | Added `emiInstallments` to allowed update fields |
| `serverless.yml` | `EMI_ENROLLMENTS_TABLE` env var, IAM, 3 Lambda functions, `EmiEnrollmentsTable` DynamoDB resource |

### Admin Dashboard
| File | Change |
|---|---|
| `src/lib/api/types.emi.ts` | **New** — TypeScript types |
| `src/lib/api/emi.ts` | **New** — API client functions |
| `src/lib/api/index.ts` | Exports `emi` and `types.emi` |
| `src/lib/api/types.courses.ts` | Added `emiInstallments?: number` to Course interface |
| `src/app/pages/EMIManagement.tsx` | **New** — Admin UI page |
| `src/app/routes.tsx` | Added `{ path: "emi", Component: EMIManagement }` |
| `src/app/components/DashboardLayout.tsx` | Added `CalendarClock` icon + "EMI Management" sidebar nav item |

### Postman
| File | Change |
|---|---|
| `CodexAI_Backend_API.postman_collection.json` | Added `EMI Management` folder with 3 requests |

---

## Environment Variables Required

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay API key (already in use) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (already in use) |
| `FRONTEND_URL` | Optional — used as Payment Link `callback_url` |

`EMI_ENROLLMENTS_TABLE` is set automatically by `serverless.yml` as `codexai-emi-enrollments-{stage}`.
