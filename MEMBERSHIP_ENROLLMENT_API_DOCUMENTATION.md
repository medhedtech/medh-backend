# MEDH Membership Enrollment API Documentation

## Overview
The MEDH Membership Enrollment API provides comprehensive functionality for managing premium memberships, including Silver and Gold tiers with flexible billing cycles and payment tracking.

## Membership Types

### Silver Membership
**Ideal for focused skill development**
- Access to all self-paced blended courses within any **Single-Category** of preference
- Access to LIVE Q&A Doubt Clearing Sessions
- Special discount on all live courses
- Community access
- Access to free courses
- Placement Assistance

### Gold Membership
**Perfect for diverse skill acquisition**
- Access to all self-paced blended courses within any **03-Categories** of preference
- Access to LIVE Q&A Doubt Clearing Sessions
- Minimum 15% discount on all live courses
- Community access
- Access to free courses
- Career Counselling
- Placement Assistance

## Pricing Plans

### Silver Membership
| Duration | Price (INR) | Billing Cycle |
|----------|-------------|---------------|
| Monthly | ₹999 | 1 month |
| Quarterly | ₹2,499 | 3 months |
| Half-yearly | ₹3,999 | 6 months |
| Annually | ₹4,999 | 12 months |

### Gold Membership
| Duration | Price (INR) | Billing Cycle |
|----------|-------------|---------------|
| Monthly | ₹1,999 | 1 month |
| Quarterly | ₹3,999 | 3 months |
| Half-yearly | ₹5,999 | 6 months |
| Annually | ₹6,999 | 12 months |

## API Endpoints

### Public Endpoints

#### Get Membership Pricing
```http
GET /api/v1/memberships/pricing
```

#### Get Membership Benefits
```http
GET /api/v1/memberships/benefits/:membershipType
```

### Authenticated Endpoints (Student)

#### Create Membership Enrollment
```http
POST /api/v1/memberships/enroll
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "membership_type": "silver",
  "duration_months": 12,
  "auto_renewal": false,
  "payment_info": {
    "amount": 4999,
    "currency": "INR",
    "payment_method": "upi",
    "transaction_id": "TXN123456789"
  }
}
```

#### Get Membership Status
```http
GET /api/v1/memberships/status
Authorization: Bearer <token>
```

#### Upgrade Membership
```http
PATCH /api/v1/memberships/:enrollmentId/upgrade
Authorization: Bearer <token>
```

#### Renew Membership
```http
PATCH /api/v1/memberships/:enrollmentId/renew
Authorization: Bearer <token>
```

#### Get Payment History
```http
GET /api/v1/memberships/:enrollmentId/payments
Authorization: Bearer <token>
```

#### Cancel Membership
```http
DELETE /api/v1/memberships/:enrollmentId/cancel
Authorization: Bearer <token>
```

### Admin Endpoints

#### Get All Memberships
```http
GET /api/v1/memberships/admin/all
Authorization: Bearer <admin_token>
```

#### Get Membership Statistics
```http
GET /api/v1/memberships/admin/stats
Authorization: Bearer <admin_token>
```