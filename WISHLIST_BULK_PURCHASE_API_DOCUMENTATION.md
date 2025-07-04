# Wishlist Bulk Purchase API Documentation

## Overview

The Wishlist Bulk Purchase API allows users to purchase multiple courses from their wishlist in a single transaction. This feature provides bulk discounts, coupon support, and streamlined checkout process.

## Features

- **Bulk Purchase**: Purchase 1-10 courses from wishlist simultaneously
- **Automatic Discounts**: Volume-based discounts (5% for 2 courses, 10% for 3+ courses, 15% for 5+ courses)
- **Coupon Support**: Apply coupon codes for additional savings
- **Preview Mode**: Calculate totals and discounts before purchase
- **Purchase History**: Track all bulk purchases
- **Email Confirmations**: Automatic confirmation emails
- **Wishlist Management**: Option to remove purchased courses from wishlist

## API Endpoints

### 1. Bulk Purchase from Wishlist

**Endpoint:** `POST /api/v1/enrollments/wishlist/bulk-purchase`

**Description:** Purchase multiple courses from user's wishlist in a single transaction.

**Authentication:** Required (Bearer Token)

**Request Body:**

```json
{
  "courseIds": ["64f1a2b3c4d5e6f7g8h9i0j1", "64f1a2b3c4d5e6f7g8h9i0j2"],
  "paymentMethod": "credit_card",
  "billingAddress": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  },
  "removeFromWishlist": true,
  "applyDiscount": true,
  "couponCode": "SAVE10",
  "currency": "USD",
  "notes": "Bulk purchase for team training"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Bulk purchase completed successfully",
  "data": {
    "bulk_purchase": {
      "user": "64f1a2b3c4d5e6f7g8h9i0j1",
      "courses": [
        {
          "course": "64f1a2b3c4d5e6f7g8h9i0j1",
          "original_price": 99.99
        },
        {
          "course": "64f1a2b3c4d5e6f7g8h9i0j2",
          "original_price": 149.99
        }
      ],
      "subtotal": 249.98,
      "discount_amount": 24.99,
      "coupon_discount": 22.5,
      "total_discount": 47.49,
      "final_total": 202.49,
      "currency": "USD",
      "payment_method": "credit_card",
      "status": "completed",
      "payment_id": "pay_1703123456789_abc123def",
      "completed_at": "2023-12-21T10:30:45.123Z"
    },
    "enrollments": [
      {
        "user": "64f1a2b3c4d5e6f7g8h9i0j1",
        "course": "64f1a2b3c4d5e6f7g8h9i0j1",
        "enrollment_date": "2023-12-21T10:30:45.123Z",
        "status": "active",
        "payment_status": "paid",
        "amount_paid": 99.99,
        "currency": "USD",
        "payment_method": "credit_card",
        "bulk_purchase_id": "pay_1703123456789_abc123def"
      }
    ],
    "courses_purchased": 2,
    "total_amount": 202.49,
    "currency": "USD",
    "removed_from_wishlist": true
  }
}
```

### 2. Preview Bulk Purchase

**Endpoint:** `POST /api/v1/enrollments/wishlist/bulk-purchase-preview`

**Description:** Preview bulk purchase with calculated totals, discounts, and savings before making the actual purchase.

**Authentication:** Required (Bearer Token)

**Request Body:**

```json
{
  "courseIds": ["64f1a2b3c4d5e6f7g8h9i0j1", "64f1a2b3c4d5e6f7g8h9i0j2"],
  "applyDiscount": true,
  "couponCode": "SAVE10",
  "currency": "USD"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Bulk purchase preview generated successfully",
  "data": {
    "course_breakdown": [
      {
        "course_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "course_title": "Advanced JavaScript",
        "course_subtitle": "Master modern JavaScript concepts",
        "course_image": "https://example.com/js-course.jpg",
        "course_category": "Programming",
        "original_price": 99.99,
        "currency": "USD"
      }
    ],
    "pricing": {
      "subtotal": 249.98,
      "bulk_discount": 24.99,
      "coupon_discount": 22.5,
      "total_discount": 47.49,
      "final_total": 202.49,
      "currency": "USD"
    },
    "discounts_applied": {
      "bulk_purchase": true,
      "coupon": true,
      "coupon_code": "SAVE10"
    },
    "savings": {
      "amount_saved": 47.49,
      "percentage_saved": 19.0
    }
  }
}
```

### 3. Get Purchase History

**Endpoint:** `GET /api/v1/enrollments/wishlist/purchase-history`

**Description:** Retrieve user's bulk purchase history with pagination and filtering.

**Authentication:** Required (Bearer Token)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `status` (optional): Filter by status (completed, pending, failed, cancelled)

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Bulk purchase history retrieved successfully",
  "data": {
    "purchases": [
      {
        "id": "bp_123456789",
        "courses_count": 3,
        "total_amount": 299.97,
        "currency": "USD",
        "status": "completed",
        "payment_method": "credit_card",
        "created_at": "2023-12-20T10:30:45.123Z",
        "completed_at": "2023-12-20T10:35:45.123Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 15,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 4. Apply Coupon

**Endpoint:** `POST /api/v1/enrollments/wishlist/apply-coupon`

**Description:** Apply a coupon code to bulk purchase and get updated pricing.

**Authentication:** Required (Bearer Token)

**Request Body:**

```json
{
  "courseIds": ["64f1a2b3c4d5e6f7g8h9i0j1", "64f1a2b3c4d5e6f7g8h9i0j2"],
  "couponCode": "SAVE20",
  "currency": "USD"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "coupon_details": {
      "code": "SAVE20",
      "discount_type": "percentage",
      "discount_value": 20,
      "description": "20% off your purchase"
    },
    "pricing": {
      "subtotal": 249.98,
      "coupon_discount": 49.99,
      "final_total": 199.99,
      "currency": "USD"
    },
    "savings": {
      "amount_saved": 49.99,
      "percentage_saved": 20.0
    }
  }
}
```

## Validation Rules

### Course Selection

- Minimum: 1 course
- Maximum: 10 courses
- All courses must be in user's wishlist
- Valid MongoDB ObjectId format required

### Payment Method

- Allowed values: `credit_card`, `debit_card`, `paypal`, `bank_transfer`, `crypto`, `wallet`

### Billing Address (Optional)

- Street: 5-200 characters
- City: 2-100 characters
- State: 2-100 characters
- Country: 2-100 characters
- ZIP Code: 3-20 characters

### Coupon Code

- Length: 3-20 characters
- Alphanumeric characters only
- Case-insensitive

### Currency

- 3-character ISO currency code (e.g., USD, EUR, GBP)
- Must match course pricing currency

## Discount Structure

### Bulk Purchase Discounts

- **2 courses**: 5% discount
- **3-4 courses**: 10% discount
- **5+ courses**: 15% discount

### Coupon Discounts

- **SAVE10**: 10% off total
- **SAVE20**: 20% off total
- Additional coupons can be configured

### Combined Discounts

- Bulk purchase discounts and coupon discounts are additive
- Maximum total discount: 35% (15% bulk + 20% coupon)

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "courseIds",
      "message": "Must select 1-10 courses to purchase"
    }
  ]
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "User not found"
}
```

### 400 Invalid Courses

```json
{
  "success": false,
  "message": "Some courses are not in your wishlist",
  "invalidCourses": ["64f1a2b3c4d5e6f7g8h9i0j3"]
}
```

### 400 Invalid Coupon

```json
{
  "success": false,
  "message": "Invalid or expired coupon code"
}
```

## Integration Examples

### Frontend Integration (JavaScript)

```javascript
// Preview bulk purchase
const previewPurchase = async (courseIds) => {
  try {
    const response = await fetch(
      "/api/v1/enrollments/wishlist/bulk-purchase-preview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseIds,
          applyDiscount: true,
          currency: "USD",
        }),
      },
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Preview error:", error);
  }
};

// Execute bulk purchase
const executePurchase = async (purchaseData) => {
  try {
    const response = await fetch("/api/v1/enrollments/wishlist/bulk-purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(purchaseData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Purchase error:", error);
  }
};
```

### React Component Example

```jsx
import React, { useState } from "react";

const BulkPurchaseModal = ({ selectedCourses, onClose }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const courseIds = selectedCourses.map((course) => course._id);
      const result = await previewPurchase(courseIds);
      setPreview(result.data);
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const purchaseData = {
        courseIds: selectedCourses.map((course) => course._id),
        paymentMethod: "credit_card",
        applyDiscount: true,
        removeFromWishlist: true,
        currency: "USD",
      };

      const result = await executePurchase(purchaseData);
      if (result.success) {
        onClose();
        // Show success message
      }
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-purchase-modal">
      <h2>Bulk Purchase ({selectedCourses.length} courses)</h2>

      {preview && (
        <div className="pricing-breakdown">
          <h3>Pricing Summary</h3>
          <div className="price-item">
            <span>Subtotal:</span>
            <span>${preview.pricing.subtotal}</span>
          </div>
          <div className="price-item discount">
            <span>Bulk Discount:</span>
            <span>-${preview.pricing.bulk_discount}</span>
          </div>
          <div className="price-item total">
            <span>Final Total:</span>
            <span>${preview.pricing.final_total}</span>
          </div>
          <div className="savings">
            You save ${preview.savings.amount_saved} (
            {preview.savings.percentage_saved}%)
          </div>
        </div>
      )}

      <div className="actions">
        <button onClick={handlePreview} disabled={loading}>
          {loading ? "Calculating..." : "Preview Purchase"}
        </button>
        <button onClick={handlePurchase} disabled={!preview || loading}>
          {loading ? "Processing..." : "Complete Purchase"}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};
```

## Email Templates

### Bulk Purchase Confirmation Email

The system automatically sends confirmation emails with the following template variables:

- `userName`: User's full name
- `purchaseId`: Unique purchase identifier
- `courseCount`: Number of courses purchased
- `courseTitles`: Comma-separated list of course titles
- `totalAmount`: Final amount paid
- `currency`: Payment currency
- `paymentMethod`: Method used for payment
- `purchaseDate`: Date and time of purchase
- `courses`: Array of course objects with title, subtitle, and category

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only purchase courses from their own wishlist
3. **Validation**: Comprehensive input validation on all fields
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Payment Security**: Integrate with secure payment processors
6. **Audit Trail**: All purchases are logged in user activity

## Performance Considerations

1. **Database Indexes**: Ensure proper indexing on wishlist and course collections
2. **Caching**: Cache course details for better performance
3. **Batch Operations**: Use database transactions for bulk operations
4. **Async Processing**: Handle email sending asynchronously
5. **Pagination**: Implement proper pagination for purchase history

## Monitoring and Analytics

Track the following metrics:

- Bulk purchase conversion rate
- Average order value
- Most popular course combinations
- Discount effectiveness
- Payment method preferences
- Geographic distribution of purchases

## Future Enhancements

1. **Subscription Bundles**: Allow purchasing course bundles
2. **Gift Purchases**: Enable gifting courses to other users
3. **Corporate Billing**: Support for corporate invoicing
4. **Installment Plans**: Payment in installments
5. **Loyalty Points**: Earn points on bulk purchases
6. **Referral Discounts**: Additional discounts for referrals
