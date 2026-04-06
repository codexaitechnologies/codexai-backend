# Coupons Management Guide

This guide explains how to manage coupons in CodexAI Backend using CRUD operations (Create, Read, Update, Delete).

## Overview

The coupon system provides:
- **List all available coupons** - Fetch list of active coupons (`GET /coupons`)
- **Get specific coupon** - Retrieve single coupon details (`GET /coupons/{couponCode}`)
- **Create coupon** - Add new coupon (`POST /coupons/create`)
- **Update coupon** - Modify existing coupon (`PUT /coupons/update/{couponCode}`)
- **Delete coupon** - Remove coupon (`DELETE /coupons/delete/{couponCode}`)
- **Validate coupon** - Verify coupon applicability and calculate discount (`POST /coupons/validate`)
- **Apply coupon** - Use coupons during checkout via `createOrder` endpoint

## Setup

### 1. Environment Configuration

Your Razorpay and coupon configuration is in `.env`:
```bash
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=Ad@rsh15101996
```

### 2. Deploy Backend

```bash
npm install
serverless deploy
```
      "status": "seeded",
      "description": "₹100 flat discount"
    }
    // ... more coupons
  ]
}
```

---

## Coupon Endpoints

### 1. Get All Available Coupons
**Endpoint:** `GET /coupons`

Fetches all active, non-expired coupons from the database.

**Request:**
```bash
curl -X GET https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons
```

**Success Response (200):**
```json
{
  "message": "Active coupons fetched successfully",
  "count": 8,
  "coupons": [
    {
      "code": "FLAT100",
      "type": "flat",
      "value": 100,
      "description": "₹100 flat discount",
      "minAmount": 500,
      "maxDiscount": null,
      "maxUses": null,
      "usedCount": 5,
      "expiresAt": null,
      "createdAt": "2024-04-04T10:00:00.000Z"
    },
    {
      "code": "OFF20",
      "type": "percentage",
      "value": 20,
      "description": "20% discount",
      "minAmount": 1000,
      "maxDiscount": 2000,
      "maxUses": null,
      "usedCount": 15,
      "expiresAt": null,
      "createdAt": "2024-04-04T10:00:00.000Z"
    },
    {
      "code": "SUMMER25",
      "type": "percentage",
      "value": 25,
      "description": "Summer offer 25% off",
      "minAmount": 1000,
      "maxDiscount": 3000,
      "maxUses": null,
      "usedCount": 32,
      "expiresAt": "2026-09-30T23:59:59.000Z",
      "createdAt": "2024-04-04T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `500`: Coupons table not configured

---

### 2. Validate Coupon
**Endpoint:** `POST /coupons/validate`

Validates a specific coupon code and calculates the discount for a given amount.

**Request Body:**
```json
{
  "couponCode": "OFF20",
  "amount": 1500
}
```

**Required Fields:**
- `couponCode`: Coupon code to validate (string)
- `amount`: Order amount in rupees (number)

**Success Response (200):**
```json
{
  "message": "Coupon validated successfully",
  "valid": true,
  "coupon": {
    "code": "OFF20",
    "type": "percentage",
    "description": "20% discount",
    "value": 20
  },
  "originalAmount": 1500,
  "discount": 300,
  "finalAmount": 1200,
  "savings": "₹300"
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Missing required fields | couponCode or amount missing |
| 400 | Invalid coupon code | Coupon doesn't exist |
| 400 | Coupon code is inactive | Coupon is disabled |
| 400 | Coupon code expired | Expiration date passed |
| 400 | Coupon usage limit exceeded | maxUses reached |
| 400 | Minimum order amount | Amount less than minAmount |
| 500 | Coupons table not configured | Environment variable missing |

---

### 3. Seed Coupons
**Endpoint:** `POST /coupons/seed`

Seeds the static coupon data into DynamoDB. Useful for:
- Initial setup
- Resetting to default coupons
- Environment migrations

**Request:**
```bash
curl -X POST https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons/seed
```

**Response (200):**
```json
{
  "message": "Coupons seeding completed",
  "summary": {
    "total": 8,
    "successful": 8,
    "failed": 0
  },
  "details": [
    {
      "code": "FLAT100",
      "status": "seeded",
      "description": "₹100 flat discount"
    },
    {
      "code": "FLAT200",
      "status": "seeded",
      "description": "₹200 flat discount"
    }
    // ... more coupons
  ]
}
```

**Error Responses:**
- `500`: Coupons table not configured

---

## Using Coupons During Checkout

### Apply Coupon in Create Order

Use the `couponCode` parameter with the `POST /payments/create-order` endpoint:

**Request:**
```json
{
  "amount": 1500,
  "currency": "INR",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "description": "Web Development Course",
  "courseId": "course-123",
  "couponCode": "OFF20"
}
```

**Response:**
```json
{
  "message": "Order created successfully",
  "order": {
    "id": "order_2QlLg5lIcTuTYr",
    "amount": 1200,
    "originalAmount": 1500,
    "discount": 300,
    "currency": "INR",
    "status": "created",
    "coupon": {
      "code": "OFF20",
      "type": "percentage",
      "description": "20% discount",
      "value": 20
    }
  }
}
```

---

## Available Coupons

### Flat Discounts

| Code | Discount | Min Amount | Max Uses | Expiry |
|------|----------|-----------|----------|--------|
| FLAT100 | ₹100 | ₹500 | Unlimited | Never |
| FLAT200 | ₹200 | ₹1000 | Unlimited | Never |
| FLAT500 | ₹500 | ₹2000 | Unlimited | Never |
| WELCOME50 | ₹50 | ₹300 | 1000 uses | Never |

### Percentage Discounts

| Code | Discount | Min Amount | Max Discount | Max Uses | Expiry |
|------|----------|-----------|--------------|----------|--------|
| OFF10 | 10% | ₹500 | ₹1000 | Unlimited | Never |
| OFF20 | 20% | ₹1000 | ₹2000 | Unlimited | Never |
| OFF30 | 30% | ₹1500 | ₹5000 | Unlimited | Never |
| SUMMER25 | 25% | ₹1000 | ₹3000 | Unlimited | Sept 30, 2026 |

---

## Database Table

### CouponsTable Schema

**Table Name:** `coupons-{stage}` (e.g., `coupons-dev`)

**Attributes:**
- `couponCode` (PK): Unique coupon code (String)
- `type`: flat or percentage (String)
- `value`: Discount amount or percentage (Number)
- `description`: Human-readable description (String)
- `minAmount`: Minimum order amount required (Number)
- `maxDiscount`: Maximum discount cap for percentage coupons (Number)
- `maxUses`: Maximum total uses allowed (Number)
- `isActive`: Whether coupon is active (Boolean)
- `usedCount`: Number of times used (Number)
- `expiresAt`: Expiration timestamp (String/ISO)
- `createdAt`: Creation timestamp (String/ISO)
- `updatedAt`: Last update timestamp (String/ISO)

**Example Item:**
```json
{
  "couponCode": "OFF20",
  "type": "percentage",
  "value": 20,
  "description": "20% discount",
  "minAmount": 1000,
  "maxDiscount": 2000,
  "maxUses": null,
  "isActive": true,
  "usedCount": 24,
  "expiresAt": null,
  "createdAt": "2024-04-04T10:00:00.000Z",
  "updatedAt": "2024-04-04T14:30:00.000Z"
}
```

---

## Frontend Integration

### Display Available Coupons

```javascript
// Fetch all available coupons
async function loadAvailableCoupons() {
  const response = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons');
  const data = await response.json();

  return data.coupons.map(coupon => ({
    code: coupon.code,
    description: coupon.description,
    value: coupon.value,
    type: coupon.type
  }));
}
```

### Validate Coupon Before Checkout

```javascript
// Validate coupon before creating order
async function validateCouponCode(couponCode, amount) {
  const response = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      couponCode: couponCode,
      amount: amount
    })
  });

  const data = await response.json();

  if (data.valid) {
    return {
      valid: true,
      discount: data.discount,
      finalAmount: data.finalAmount,
      savings: data.savings
    };
  } else {
    return {
      valid: false,
      error: data.error
    };
  }
}
```

### React Component Example

```jsx
import { useState, useEffect } from 'react';

function CouponSelector({ orderAmount, onApplyCoupon }) {
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [couponDetails, setCouponDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load available coupons
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons');
      const data = await response.json();
      setCoupons(data.coupons);
    } catch (error) {
      setError('Failed to load coupons');
    }
  };

  const handleValidateCoupon = async (couponCode) => {
    if (!couponCode) {
      setCouponDetails(null);
      onApplyCoupon(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode,
          amount: orderAmount
        })
      });

      const data = await response.json();

      if (data.valid) {
        setCouponDetails(data);
        onApplyCoupon({
          code: couponCode,
          discount: data.discount,
          finalAmount: data.finalAmount
        });
      } else {
        setError(data.error);
        setCouponDetails(null);
        onApplyCoupon(null);
      }
    } catch (error) {
      setError('Failed to validate coupon');
      setCouponDetails(null);
      onApplyCoupon(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coupon-selector">
      <h3>Apply Coupon Code</h3>
      
      <select
        value={selectedCoupon}
        onChange={(e) => {
          setSelectedCoupon(e.target.value);
          handleValidateCoupon(e.target.value);
        }}
      >
        <option value="">No coupon</option>
        {coupons.map(coupon => (
          <option key={coupon.code} value={coupon.code}>
            {coupon.code} - {coupon.description}
          </option>
        ))}
      </select>

      {loading && <p className="loading">Validating...</p>}
      {error && <p className="error">{error}</p>}

      {couponDetails && couponDetails.valid && (
        <div className="coupon-details">
          <p>Original Amount: ₹{couponDetails.originalAmount}</p>
          <p>Discount: {couponDetails.savings}</p>
          <p className="final-amount">Final Amount: ₹{couponDetails.finalAmount}</p>
        </div>
      )}
    </div>
  );
}

export default CouponSelector;
```

---

## Coupon Management

### Creating New Coupons

To add new coupons, update the `staticCoupons` array in `src/handlers/seedCoupons.js`:

```javascript
{
  couponCode: 'NEWYEAR50',
  type: 'flat',
  value: 50,
  description: 'New Year Special ₹50 off',
  minAmount: 300,
  maxDiscount: null,
  maxUses: 500,
  expiresAt: new Date('2026-01-31').toISOString(),
  isActive: true,
  usedCount: 0
}
```

Then run seed:
```bash
curl -X POST https://jbd1szydoc.lambda-url.ap-south-1.on.aws/coupons/seed
```

### Deactivating Coupons

Update coupon in DynamoDB:
- Via AWS Console: Set `isActive` to `false`
- Programmatically: POST to an admin endpoint (to be implemented)

### Tracking Coupon Usage

Query coupons by usage:
```bash
# Get most used coupons
aws dynamodb scan \
  --table-name coupons-dev \
  --expression-attribute-names '{"#uc":"usedCount"}' \
  --projection-expression "couponCode,#uc,description"
```

---

## Deployment Checklist

- [ ] Deploy backend: `serverless deploy`
- [ ] Seed coupons: `POST /coupons/seed`
- [ ] Test getCoupons: `GET /coupons`
- [ ] Test validateCoupon: `POST /coupons/validate`
- [ ] Test createOrder with coupon
- [ ] Update Postman collection
- [ ] Update frontend integration

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Coupons table not showing | Run seed endpoint to populate |
| "Coupon not found" error | Check coupon code spelling |
| Coupon expired | Check `expiresAt` date |
| Max uses exceeded | Update `maxUses` or reset `usedCount` |
| Discount higher than amount | Check `maxDiscount` value |

---

## References

- [Coupons Quick Reference](COUPONS_QUICK_REFERENCE.md)
- [Razorpay Setup Guide](RAZORPAY_SETUP.md)
- [Payment Integration Guide](RAZORPAY_QUICK_REFERENCE.md)
