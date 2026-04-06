# Coupons API - Quick Reference

## Coupon CRUD Endpoints

### 1. Get All Available Coupons
```
GET /coupons
```

**Response:**
```json
{
  "message": "Active coupons fetched successfully",
  "count": 3,
  "coupons": [
    {
      "code": "FLAT100",
      "type": "flat",
      "value": 100,
      "description": "₹100 flat discount",
      "minAmount": 500
    }
  ]
}
```

---

### 2. Get Specific Coupon
```
GET /coupons/{couponCode}

Example: GET /coupons/FLAT100
```

**Response:**
```json
{
  "message": "Coupon retrieved successfully",
  "coupon": {
    "couponCode": "FLAT100",
    "type": "flat",
    "value": 100,
    "description": "₹100 flat discount",
    "minAmount": 500,
    "isActive": true,
    "usedCount": 5,
    "createdAt": "2024-04-04T10:00:00.000Z",
    "updatedAt": "2024-04-04T14:30:00.000Z"
  }
}
```

---

### 3. Create Coupon
```
POST /coupons/create

{
  "couponCode": "SUMMER50",
  "type": "flat",
  "value": 50,
  "description": "Summer Special ₹50 off",
  "minAmount": 300,
  "maxUses": 500,
  "expiresAt": "2026-09-30T23:59:59.000Z"
}
```

**Response (201):**
```json
{
  "message": "Coupon created successfully",
  "coupon": {
    "couponCode": "SUMMER50",
    "type": "flat",
    "value": 50,
    "description": "Summer Special ₹50 off",
    "minAmount": 300,
    "maxUses": 500,
    "isActive": true,
    "usedCount": 0,
    "createdAt": "2024-04-04T15:00:00.000Z"
  }
}
```

---

### 4. Update Coupon
```
PUT /coupons/update/{couponCode}

Example: PUT /coupons/update/SUMMER50

{
  "value": 100,
  "maxUses": 1000,
  "isActive": true
}
```

**Response (200):**
```json
{
  "message": "Coupon updated successfully",
  "coupon": {
    "couponCode": "SUMMER50",
    "value": 100,
    "maxUses": 1000,
    "isActive": true,
    "updatedAt": "2024-04-04T15:30:00.000Z"
  }
}
```

---

### 5. Delete Coupon
```
DELETE /coupons/delete/{couponCode}

Example: DELETE /coupons/delete/SUMMER50
```

**Response (200):**
```json
{
  "message": "Coupon deleted successfully",
  "deletedCoupon": {
    "code": "SUMMER50",
    "description": "Summer Special ₹50 off"
  }
}
```

---

### 6. Validate Coupon
```
POST /coupons/validate

{
  "couponCode": "OFF20",
  "amount": 1500
}
```

**Response (Valid):**
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

**Response (Invalid):**
```json
{
  "message": "Coupon code expired",
  "error": "Coupon code expired: EXPIRED_CODE",
  "valid": false
}
```

---

### 3. Seed Coupons
```
POST /coupons/seed
```

**Response:**
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
    }
  ]
}
```

---

## Postman Collection Examples

### Get All Coupons
```
GET {{base_url}}/coupons

Headers:
Content-Type: application/json
```

### Get Specific Coupon
```
GET {{base_url}}/coupons/FLAT100

Headers:
Content-Type: application/json
```

### Create Coupon
```
POST {{base_url}}/coupons/create

Headers:
Content-Type: application/json

Body:
{
  "couponCode": "NEWYEAR100",
  "type": "flat",
  "value": 100,
  "description": "New Year Special",
  "minAmount": 500,
  "maxUses": 200
}
```

### Update Coupon
```
PUT {{base_url}}/coupons/update/NEWYEAR100

Headers:
Content-Type: application/json

Body:
{
  "maxUses": 500,
  "isActive": true
}
```

### Delete Coupon
```
DELETE {{base_url}}/coupons/delete/NEWYEAR100

Headers:
Content-Type: application/json
```

### Validate Coupon
```
POST {{base_url}}/coupons/validate

Headers:
Content-Type: application/json

Body:
{
  "couponCode": "OFF20",
  "amount": 1500
}
```

---

## Using Coupons in Order Creation

Apply coupon when creating order:

```
POST {{base_url}}/payments/create-order

{
  "amount": 1500,
  "currency": "INR",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "description": "Web Development Course",
  "courseId": "course-id",
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

## File Structure

```
src/
├── handlers/
│   ├── getCoupons.js           # Fetch all coupons
│   ├── getCouponById.js        # Get single coupon
│   ├── createCoupon.js         # Create new coupon
│   ├── updateCoupon.js         # Update coupon
│   ├── deleteCoupon.js         # Delete coupon
│   ├── validateCoupon.js       # Validate coupon code
│   └── createOrder.js          # Apply coupon during checkout
└── utils/
    ├── coupon.js               # Coupon validation logic
    └── dynamodb.js             # Database utilities
```

---

## References

- [Complete Coupons Guide](COUPONS_GUIDE.md)
- [Razorpay Integration](RAZORPAY_QUICK_REFERENCE.md)
- [Payment Setup](RAZORPAY_SETUP.md)
