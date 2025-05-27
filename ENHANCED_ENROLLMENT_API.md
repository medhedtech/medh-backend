# Enhanced Enrollment API Documentation

This document describes the enhanced enrollment system that handles both **Individual** and **Batch** course enrollments with proper business logic, pricing calculations, and payment integration.

## Overview

The enhanced enrollment system provides:
- **Individual Enrollments**: Students enroll individually with flexible access duration
- **Batch Enrollments**: Students enroll in scheduled batches with instructor-led sessions
- **Dynamic Pricing**: Automatic calculation of pricing based on enrollment type, discounts, and batch size
- **Payment Integration**: Seamless integration with Razorpay for payment processing
- **Transfer Capability**: Transfer from individual to batch enrollments
- **EMI Support**: Installment payment options for both enrollment types

## Base URL
```
/api/enhanced-payments
```

## Authentication
Most endpoints require authentication using a Bearer token in the Authorization header:
```
Authorization: Bearer <your_token>
```

---

## Core Concepts

### Enrollment Types

#### 1. Individual Enrollment
- **Description**: Student enrolls individually with self-paced learning
- **Characteristics**:
  - No batch assignment
  - Flexible access duration (default: 1 year)
  - Individual pricing
  - Early bird discounts applicable
  - Self-paced learning

#### 2. Batch Enrollment
- **Description**: Student enrolls in a scheduled batch with instructor-led sessions
- **Characteristics**:
  - Assigned to a specific batch
  - Access duration tied to batch schedule + grace period
  - Batch pricing (usually lower than individual)
  - Group discounts applicable
  - Instructor-led sessions
  - Fixed schedule

### Pricing Logic

The system automatically calculates pricing based on:

1. **Base Price**: Individual or batch price from course pricing
2. **Early Bird Discount**: Applied to individual enrollments
3. **Group Discount**: Applied to batch enrollments meeting minimum size
4. **Custom Discounts**: Additional discounts via discount codes
5. **Currency**: Multi-currency support

---

## API Endpoints

### Public Endpoints

#### 1. Get Course Pricing
**GET** `/course-pricing/:courseId`

Get pricing information for a course based on enrollment type.

**Query Parameters:**
- `enrollment_type` (optional): `individual` or `batch` (default: `individual`)
- `batch_size` (optional): Number of students in batch (default: `1`)
- `currency` (optional): Currency code (default: `INR`)
- `discount_code` (optional): Discount code to apply

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": "64a7b8c9d1e2f3g4h5i6j7k0",
    "enrollmentType": "batch",
    "pricing": {
      "originalPrice": 5000,
      "finalPrice": 3750,
      "discountApplied": 1250,
      "currency": "INR",
      "pricingType": "group_discount",
      "savings": 1250
    },
    "coursePricing": {
      "minBatchSize": 5,
      "maxBatchSize": 20,
      "earlyBirdDiscount": 15,
      "groupDiscount": 25
    }
  }
}
```

#### 2. Get Available Batches
**GET** `/course-batches/:courseId`

Get all available batches for a course.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
      "batch_name": "Morning Batch - January 2024",
      "batch_code": "JS-123456",
      "start_date": "2024-01-15T00:00:00.000Z",
      "end_date": "2024-03-15T00:00:00.000Z",
      "capacity": 25,
      "enrolled_students": 12,
      "available_spots": 13,
      "schedule": [
        {
          "day": "Monday",
          "start_time": "09:00",
          "end_time": "11:00"
        }
      ],
      "instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "full_name": "Dr. John Smith",
        "email": "john.smith@example.com"
      },
      "status": "Upcoming"
    }
  ]
}
```

### Private Endpoints

#### 3. Create Enrollment Order
**POST** `/create-enrollment-order`

Create a payment order for course enrollment.

**Request Body:**
```json
{
  "course_id": "64a7b8c9d1e2f3g4h5i6j7k0",
  "enrollment_type": "batch",
  "batch_id": "64a7b8c9d1e2f3g4h5i6j7k1",
  "batch_size": 5,
  "currency": "INR",
  "discount_code": "EARLY2024",
  "custom_discount": 500,
  "payment_plan": "full",
  "batch_members": [
    "64a7b8c9d1e2f3g4h5i6j7k2",
    "64a7b8c9d1e2f3g4h5i6j7k3"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "order_razorpay_id",
    "amount": 375000,
    "currency": "INR",
    "receipt": "enrollment_1704067200000",
    "enrollment_data": {
      "studentId": "64a7b8c9d1e2f3g4h5i6j7k4",
      "courseId": "64a7b8c9d1e2f3g4h5i6j7k0",
      "enrollmentType": "batch",
      "batchId": "64a7b8c9d1e2f3g4h5i6j7k1",
      "batchSize": 5,
      "currency": "INR",
      "paymentPlan": "full"
    },
    "pricing": {
      "originalPrice": 5000,
      "finalPrice": 3750,
      "discountApplied": 1250,
      "currency": "INR",
      "pricingType": "group_discount",
      "savings": 1250
    }
  }
}
```

#### 4. Verify Payment and Create Enrollment
**POST** `/verify-enrollment-payment`

Verify payment and create the enrollment.

**Request Body:**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "pay_razorpay_id",
  "razorpay_signature": "signature_hash",
  "enrollment_data": {
    "studentId": "64a7b8c9d1e2f3g4h5i6j7k4",
    "courseId": "64a7b8c9d1e2f3g4h5i6j7k0",
    "enrollmentType": "batch",
    "batchId": "64a7b8c9d1e2f3g4h5i6j7k1",
    "batchSize": 5,
    "currency": "INR",
    "paymentPlan": "full"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and enrollment created successfully",
  "data": {
    "enrollment": {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k5",
      "student": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k4",
        "full_name": "Jane Doe",
        "email": "jane.doe@example.com"
      },
      "course": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
        "course_title": "JavaScript Fundamentals",
        "course_image": "https://example.com/image.jpg",
        "slug": "javascript-fundamentals"
      },
      "batch": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
        "batch_name": "Morning Batch - January 2024",
        "batch_code": "JS-123456",
        "start_date": "2024-01-15T00:00:00.000Z",
        "end_date": "2024-03-15T00:00:00.000Z"
      },
      "enrollment_type": "batch",
      "enrollment_date": "2024-01-01T10:30:00.000Z",
      "status": "active",
      "access_expiry_date": "2024-04-14T00:00:00.000Z",
      "pricing_snapshot": {
        "original_price": 5000,
        "final_price": 3750,
        "currency": "INR",
        "pricing_type": "group_discount",
        "discount_applied": 1250
      },
      "batch_info": {
        "batch_size": 5,
        "is_batch_leader": true,
        "batch_members": [
          {
            "student_id": "64a7b8c9d1e2f3g4h5i6j7k2",
            "joined_date": "2024-01-01T10:30:00.000Z"
          }
        ]
      }
    },
    "payment": {
      "transaction_id": "pay_razorpay_id",
      "amount": 3750,
      "currency": "INR",
      "status": "completed"
    }
  }
}
```

#### 5. Get Enrollment Dashboard
**GET** `/enrollment-dashboard`

Get student's enrollment dashboard with statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_enrollments": 5,
      "active_enrollments": 3,
      "completed_enrollments": 2,
      "individual_enrollments": 3,
      "batch_enrollments": 2,
      "total_amount_paid": 15000,
      "pending_payments": 1
    },
    "enrollments": {
      "active": [...],
      "completed": [...],
      "cancelled": [...],
      "on_hold": [...],
      "expired": [...]
    },
    "recent_enrollments": [...]
  }
}
```

#### 6. Get Enrollment Payment History
**GET** `/enrollment-history/:enrollmentId`

Get detailed payment history for an enrollment.

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollment_info": {
      "id": "64a7b8c9d1e2f3g4h5i6j7k5",
      "course": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
        "course_title": "JavaScript Fundamentals"
      },
      "batch": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
        "batch_name": "Morning Batch - January 2024"
      },
      "enrollment_type": "batch",
      "enrollment_date": "2024-01-01T10:30:00.000Z",
      "status": "active"
    },
    "pricing_snapshot": {
      "original_price": 5000,
      "final_price": 3750,
      "currency": "INR",
      "pricing_type": "group_discount",
      "discount_applied": 1250
    },
    "payment_plan": "full",
    "total_amount_paid": 3750,
    "payments": [
      {
        "amount": 3750,
        "currency": "INR",
        "payment_date": "2024-01-01T10:30:00.000Z",
        "payment_method": "razorpay",
        "transaction_id": "pay_razorpay_id",
        "payment_status": "completed",
        "receipt_url": "https://example.com/receipt.pdf"
      }
    ],
    "next_payment_date": null
  }
}
```

#### 7. Process EMI Payment
**POST** `/process-enrollment-emi`

Process an EMI installment payment.

**Request Body:**
```json
{
  "enrollment_id": "64a7b8c9d1e2f3g4h5i6j7k5",
  "installment_number": 2,
  "amount": 1250,
  "payment_method": "razorpay",
  "transaction_id": "pay_razorpay_id_2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "EMI payment processed successfully",
  "data": {
    "enrollment_id": "64a7b8c9d1e2f3g4h5i6j7k5",
    "installment_number": 2,
    "amount": 1250,
    "next_payment_date": "2024-02-01T00:00:00.000Z",
    "remaining_installments": 1
  }
}
```

#### 8. Transfer to Batch Enrollment
**POST** `/transfer-to-batch`

Transfer an individual enrollment to a batch enrollment.

**Request Body:**
```json
{
  "enrollment_id": "64a7b8c9d1e2f3g4h5i6j7k6",
  "batch_id": "64a7b8c9d1e2f3g4h5i6j7k1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully transferred to batch enrollment",
  "data": {
    "old_enrollment_id": "64a7b8c9d1e2f3g4h5i6j7k6",
    "new_enrollment": {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k7",
      "enrollment_type": "batch",
      "batch": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
        "batch_name": "Morning Batch - January 2024",
        "batch_code": "JS-123456",
        "start_date": "2024-01-15T00:00:00.000Z",
        "end_date": "2024-03-15T00:00:00.000Z"
      }
    }
  }
}
```

### Admin Endpoints

#### 9. Get Enrollment Statistics
**GET** `/admin/enrollment-stats`

Get comprehensive enrollment statistics (Admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActive": 150,
    "totalCompleted": 75,
    "individualEnrollments": 120,
    "batchEnrollments": 105,
    "recentEnrollments": [...],
    "paymentStats": [...]
  }
}
```

#### 10. Get Enrollment Details
**GET** `/admin/enrollment/:enrollmentId`

Get detailed enrollment information (Admin/Instructor only).

#### 11. Update Enrollment Status
**PATCH** `/admin/enrollment/:enrollmentId/status`

Update enrollment status (Admin only).

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Course completed successfully"
}
```

---

## Business Logic

### Pricing Calculation Flow

1. **Determine Base Price**:
   - Individual: Use `course.prices[].individual`
   - Batch: Use `course.prices[].batch`

2. **Apply Automatic Discounts**:
   - Individual: Early bird discount if available
   - Batch: Group discount if batch size ≥ minimum

3. **Apply Custom Discounts**:
   - Discount codes
   - Custom discount amounts

4. **Calculate Final Price**:
   - `finalPrice = basePrice - totalDiscounts`
   - Ensure `finalPrice ≥ 0`

### Enrollment Creation Flow

1. **Validate Prerequisites**:
   - Student exists and is valid
   - Course exists and is available
   - No existing active enrollment
   - Batch exists and has capacity (for batch enrollments)

2. **Calculate Pricing**:
   - Use pricing calculation logic
   - Store pricing snapshot for audit

3. **Create Enrollment**:
   - Set appropriate access expiry date
   - Configure batch information
   - Set initial status as pending

4. **Process Payment**:
   - Verify payment with gateway
   - Record payment details
   - Activate enrollment on successful payment

### Access Duration Logic

#### Individual Enrollments
- Default: 1 year from enrollment date
- Configurable via `accessDuration` parameter
- Self-paced learning

#### Batch Enrollments
- Based on batch end date + grace period (30 days)
- Tied to batch schedule
- Instructor-led sessions

---

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "field": "enrollment_type",
      "message": "Enrollment type must be 'individual' or 'batch'"
    }
  ]
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Course not found"
}
```

**409 Conflict**
```json
{
  "success": false,
  "message": "Student is already enrolled in this course"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Batch has reached maximum capacity"
}
```

---

## Integration Examples

### Frontend Integration

#### 1. Get Course Pricing
```javascript
// Get individual pricing
const individualPricing = await fetch('/api/enhanced-payments/course-pricing/courseId?enrollment_type=individual');

// Get batch pricing with group discount
const batchPricing = await fetch('/api/enhanced-payments/course-pricing/courseId?enrollment_type=batch&batch_size=10');
```

#### 2. Create Enrollment Order
```javascript
const orderData = {
  course_id: 'courseId',
  enrollment_type: 'batch',
  batch_id: 'batchId',
  batch_size: 5,
  currency: 'INR',
  payment_plan: 'full'
};

const order = await fetch('/api/enhanced-payments/create-enrollment-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(orderData)
});
```

#### 3. Verify Payment
```javascript
const verificationData = {
  razorpay_order_id: 'order_id',
  razorpay_payment_id: 'payment_id',
  razorpay_signature: 'signature',
  enrollment_data: orderResponse.enrollment_data
};

const enrollment = await fetch('/api/enhanced-payments/verify-enrollment-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(verificationData)
});
```

---

## Database Schema

### Enhanced Enrollment Model

```javascript
{
  student: ObjectId,              // Reference to Student
  course: ObjectId,               // Reference to Course
  batch: ObjectId,                // Reference to Batch (null for individual)
  enrollment_type: String,        // 'individual' or 'batch'
  enrollment_date: Date,
  status: String,                 // 'active', 'completed', etc.
  access_expiry_date: Date,
  
  // Pricing snapshot at time of enrollment
  pricing_snapshot: {
    original_price: Number,
    final_price: Number,
    currency: String,
    pricing_type: String,        // 'individual', 'batch', 'early_bird', 'group_discount'
    discount_applied: Number,
    discount_code: String
  },
  
  // Batch-specific information
  batch_info: {
    batch_size: Number,
    is_batch_leader: Boolean,
    batch_members: [{
      student_id: ObjectId,
      joined_date: Date
    }]
  },
  
  // Payment and progress tracking
  payments: [PaymentSchema],
  progress: ProgressSchema,
  payment_plan: String,
  total_amount_paid: Number,
  
  // Metadata
  created_by: ObjectId,
  notes: String
}
```

---

## Testing

### Test Scenarios

1. **Individual Enrollment**:
   - Create individual enrollment with early bird discount
   - Verify pricing calculation
   - Process payment and activate enrollment

2. **Batch Enrollment**:
   - Create batch enrollment with group discount
   - Verify batch capacity management
   - Test batch member management

3. **Transfer Scenarios**:
   - Transfer from individual to batch
   - Verify payment and progress transfer

4. **EMI Payments**:
   - Create installment enrollment
   - Process multiple EMI payments
   - Verify access management

5. **Error Scenarios**:
   - Duplicate enrollment attempts
   - Batch capacity exceeded
   - Invalid payment verification

---

## Security Considerations

1. **Authentication**: All private endpoints require valid JWT tokens
2. **Authorization**: Role-based access control for admin functions
3. **Payment Security**: Razorpay signature verification for all payments
4. **Data Validation**: Comprehensive input validation and sanitization
5. **Audit Trail**: Complete payment and enrollment history tracking

---

## Performance Optimizations

1. **Database Indexes**: Optimized indexes for common queries
2. **Caching**: Course pricing and batch information caching
3. **Pagination**: Large result sets are paginated
4. **Aggregation**: Efficient statistics calculation using MongoDB aggregation

This enhanced enrollment system provides a robust foundation for handling both individual and batch course enrollments with proper business logic, pricing calculations, and payment integration. 