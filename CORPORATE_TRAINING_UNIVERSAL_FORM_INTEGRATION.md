# Corporate Training Form Integration with Universal Form Model

## Overview

The `universal-form.model.js` has been enhanced to fully support the corporate training inquiry form from your React frontend. This integration provides a unified approach to handling all form submissions while maintaining specific validation and business logic for corporate training inquiries.

## Key Features

### 1. **Enhanced Schema Support**
- **Contact Information**: Full validation for name, email, phone numbers with country codes, and country selection
- **Professional Information**: Company details including name, website, and designation with validation
- **Training Requirements**: Detailed message field with minimum length requirements
- **Consent Management**: Proper handling of terms acceptance and privacy policy

### 2. **Form-Specific Validations**
- **Email Validation**: Regex pattern matching for valid email addresses
- **Phone Number Validation**: Country code requirements and minimum digit validation
- **Website URL Validation**: Proper URL format checking for company websites
- **Message Requirements**: Minimum 20 characters for detailed training requirements
- **Consent Validation**: Required acceptance of terms and conditions

### 3. **Enhanced Workflow Management**
- **Priority Setting**: Corporate training inquiries are automatically set to "high" priority
- **Status Tracking**: Complete workflow from submission to completion
- **Internal Notes**: Admin capability to add internal tracking notes
- **Soft Delete**: Safe deletion with audit trail

## API Endpoints

### POST `/api/v1/corporate-training` (Create Corporate Training Inquiry)

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@company.com", 
  "country": "India",
  "phone_number": "+911234567890",
  "designation": "HR Manager",
  "company_name": "Tech Corp Ltd", 
  "company_website": "https://techcorp.com",
  "message": "We need comprehensive training for 50 employees on cloud technologies including AWS, Azure, and DevOps practices. Preferred timeline is next quarter.",
  "accept": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Corporate training inquiry submitted successfully! We will contact you shortly.",
  "data": {
    "form_id": "corporate_training_inquiry_1701234567890_abc123def",
    "submission_date": "2024-01-15T10:30:00.000Z",
    "status": "submitted", 
    "priority": "high"
  }
}
```

**Validation Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone_number",
      "message": "Phone number must include country code"
    }
  ]
}
```

### GET `/api/v1/corporate-training` (List All Inquiries - Admin)

**Query Parameters:**
- `status`: Filter by status (submitted, under_review, in_progress, completed, etc.)
- `priority`: Filter by priority (low, medium, high, urgent)
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "form_id": "corporate_training_inquiry_1701234567890_abc123def",
      "contact_info": {
        "full_name": "John Doe",
        "email": "john.doe@company.com",
        "country": "India",
        "phone_number": "+911234567890"
      },
      "professional_info": {
        "designation": "HR Manager",
        "company_name": "Tech Corp Ltd",
        "company_website": "https://techcorp.com"
      },
      "message": "Training requirements...",
      "status": "submitted",
      "priority": "high",
      "submitted_at": "2024-01-15T10:30:00.000Z",
      "completion_percentage": 100
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 47,
    "items_per_page": 10
  }
}
```

### GET `/api/v1/corporate-training/form-info` (Get Form Requirements)

Returns the expected data format and validation rules for frontend integration.

## Database Schema Mapping

The frontend form data maps to the Universal Form schema as follows:

| Frontend Field | Database Path | Validation |
|---------------|---------------|------------|
| `full_name` | `contact_info.full_name` | Required, alphabets only |
| `email` | `contact_info.email` | Required, valid email format |
| `country` | `contact_info.country` | Required for corporate forms |
| `phone_number` | `contact_info.phone_number` | Required, must include country code |
| `designation` | `professional_info.designation` | Required for corporate forms |
| `company_name` | `professional_info.company_name` | Required for corporate forms |
| `company_website` | `professional_info.company_website` | Required, valid URL format |
| `message` | `message` | Required, minimum 20 characters |
| `accept` | `accept` | Required, must be true |

## Enhanced Features

### 1. **Automatic Data Transformation**
```javascript
// The createCorporateTraining static method handles the transformation:
const formData = {
  form_type: 'corporate_training_inquiry',
  contact_info: {
    full_name: data.full_name,
    email: data.email, 
    phone_number: data.phone_number, // Already includes country code
    country: data.country
  },
  professional_info: {
    designation: data.designation,
    company_name: data.company_name,
    company_website: data.company_website
  },
  message: data.message,
  accept: data.accept,
  terms_accepted: data.accept,
  privacy_policy_accepted: data.accept,
  priority: 'high',
  status: 'submitted'
};
```

### 2. **Advanced Validation Rules**
- **Phone Number**: Automatically validates international format with country code
- **Website URL**: Accepts URLs with or without protocol (http/https)
- **Email**: Full RFC-compliant email validation
- **Message Length**: Ensures detailed training requirements (20+ characters)

### 3. **Workflow Management**
- **Status Progression**: submitted → under_review → in_progress → completed
- **Priority Levels**: low, medium, high, urgent (corporate forms default to "high")
- **Assignment**: Can be assigned to specific team members
- **Internal Notes**: Track internal communications and progress

### 4. **Advanced Query Features**
```javascript
// Get all high-priority pending inquiries
UniversalForm.find({
  form_type: 'corporate_training_inquiry',
  status: { $in: ['submitted', 'under_review'] },
  priority: 'high',
  is_deleted: false
}).sort({ submitted_at: -1 });

// Get completion statistics
UniversalForm.getFormStats('corporate_training_inquiry');
```

## Integration with Frontend

Your React component should work seamlessly with this enhanced backend. The key integration points:

1. **Form Submission**: The `createCorporate` endpoint accepts the exact data structure your form sends
2. **Validation**: Server-side validation matches your frontend validation rules
3. **Error Handling**: Detailed error responses for better user experience
4. **Success Response**: Includes form ID and confirmation details

## Testing the Integration

You can test the integration using this curl command:

```bash
curl -X POST http://localhost:3000/api/v1/corporate-training \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@company.com",
    "country": "India", 
    "phone_number": "+911234567890",
    "designation": "HR Manager",
    "company_name": "Tech Corp Ltd",
    "company_website": "https://techcorp.com", 
    "message": "We need comprehensive training for 50 employees on cloud technologies including AWS, Azure, and DevOps practices. Preferred timeline is next quarter.",
    "accept": true
  }'
```

## Future Enhancements

1. **Email Notifications**: Automatic email confirmations and follow-ups
2. **Training Proposal Generation**: Automated proposal creation based on requirements
3. **Calendar Integration**: Schedule follow-up calls and meetings
4. **Document Attachments**: Support for requirement documents and proposals
5. **Multi-step Form Support**: Break down complex requirements into multiple steps

## Migration Notes

If you have existing corporate training data in the old `corporate-training.model.js`, you can migrate it to the universal form model using the provided migration tools in the `scripts/` directory.

The universal form approach provides better scalability, unified reporting, and enhanced workflow management while maintaining all the specific business logic required for corporate training inquiries. 