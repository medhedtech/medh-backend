# Dynamic Form Schema System Documentation

## Overview

The Dynamic Form Schema System is a comprehensive, extensible form management solution that allows you to create, manage, and process any type of form without hardcoding form structures. This system is built on top of the existing Universal Form model and provides a powerful abstraction layer for form creation and management.

## Key Features

### 🎯 **Dynamic Form Creation**
- Create any form type through API calls or admin interface
- No code changes required for new forms
- Supports all HTML input types and custom field types
- Advanced validation rules with regex patterns

### 📊 **Analytics & Insights**
- Real-time form performance tracking
- Conversion rate analysis
- Field-level completion analytics
- Time-based trend analysis

### 🔒 **Security & Access Control**
- Role-based access control
- IP whitelisting capabilities
- Public/private form configurations
- Spam protection and CAPTCHA integration

### 🎨 **Customization**
- Multiple theme options
- Custom CSS and JavaScript support
- Conditional field logic
- Multi-language support

### 🔗 **Integrations**
- CRM integration (Salesforce, HubSpot, etc.)
- Email marketing platforms
- Webhook notifications
- Slack notifications

## API Documentation

### Base URL
```
/api/v1/forms/schema
```

### Authentication
Most endpoints require authentication with JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Public Endpoints

### 1. Get Form Schema Configuration

**Endpoint:** `GET /:identifier`

**Description:** Retrieve form configuration for rendering on frontend

**Parameters:**
- `identifier` (path): Form ID or MongoDB ObjectId
- `config_only` (query, optional): Return only configuration data (`true`/`false`)

**Example Request:**
```bash
curl -X GET "https://api.yoursite.com/api/v1/forms/schema/corporate_training_inquiry_v1?config_only=true"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Form schema retrieved successfully",
  "data": {
    "form_config": {
      "form_id": "corporate_training_inquiry_v1",
      "title": "Corporate Training Inquiry",
      "description": "Let us help your team grow...",
      "fields": [
        {
          "name": "full_name",
          "label": "Full Name",
          "type": "text",
          "placeholder": "Enter your full name",
          "required": true,
          "validation": {
            "required": true,
            "pattern": "^[a-zA-Z\\s'-]+$"
          }
        }
        // ... more fields
      ],
      "submitButton": {
        "label": "Submit Inquiry",
        "loadingText": "Submitting...",
        "successText": "Submitted Successfully!"
      },
      "confirmationMessage": "Thank you for reaching out!",
      "privacyNote": "Your information is safe with us."
    }
  }
}
```

### 2. Submit Form Data

**Endpoint:** `POST /:form_id/submit`

**Description:** Submit form data for processing

**Parameters:**
- `form_id` (path): The form identifier

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@company.com",
  "phone_number": "+911234567890",
  "country": "India",
  "designation": "HR Manager",
  "company_name": "Tech Corp Ltd",
  "company_website": "https://techcorp.com",
  "training_requirements": "We need comprehensive training for 50 employees on cloud technologies including AWS, Azure, and DevOps practices.",
  "terms_accepted": true
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Thank you for reaching out! Our team will review your request and respond within 24–48 hours.",
  "data": {
    "submission_id": "507f1f77bcf86cd799439011",
    "form_id": "corporate_training_inquiry_1701234567890_abc123def",
    "submitted_at": "2024-01-15T10:30:00.000Z",
    "status": "submitted"
  }
}
```

---

## Admin Endpoints (Authentication Required)

### 3. Create Form Schema

**Endpoint:** `POST /`

**Description:** Create a new form schema

**Request Body:**
```json
{
  "form_id": "contact_form_v1",
  "title": "Contact Us",
  "description": "Get in touch with our team",
  "category": "contact",
  "fields": [
    {
      "name": "name",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "validation": {
        "required": true,
        "minLength": 2,
        "maxLength": 100
      }
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "validation": {
        "required": true,
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
    }
  ],
  "submitButton": {
    "label": "Send Message",
    "loadingText": "Sending..."
  },
  "settings": {
    "enableCaptcha": true,
    "enableAnalytics": true
  },
  "status": "active"
}
```

### 4. Get All Form Schemas

**Endpoint:** `GET /`

**Description:** Retrieve all form schemas with filtering and pagination

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `active`, `inactive`, `archived`)
- `category` (optional): Filter by category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in title, description, or form_id
- `sortBy` (optional): Sort field (default: `created_at`)
- `sortOrder` (optional): Sort order (`asc`, `desc`, default: `desc`)

**Example Request:**
```bash
curl -X GET "https://api.yoursite.com/api/v1/forms/schema?status=active&category=corporate_training&page=1&limit=5" \
  -H "Authorization: Bearer <token>"
```

### 5. Update Form Schema

**Endpoint:** `PUT /:id`

**Description:** Update an existing form schema

**Parameters:**
- `id` (path): MongoDB ObjectId of the form schema

**Request Body:** (Partial update supported)
```json
{
  "title": "Updated Corporate Training Inquiry",
  "description": "New description...",
  "status": "active"
}
```

### 6. Delete/Archive Form Schema

**Endpoint:** `DELETE /:id`

**Description:** Archive or permanently delete a form schema

**Parameters:**
- `id` (path): MongoDB ObjectId of the form schema
- `permanent` (query, optional): Set to `true` for hard delete (super-admin only)

**Example:**
```bash
# Soft delete (archive)
curl -X DELETE "https://api.yoursite.com/api/v1/forms/schema/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"

# Hard delete (super-admin only)
curl -X DELETE "https://api.yoursite.com/api/v1/forms/schema/507f1f77bcf86cd799439011?permanent=true" \
  -H "Authorization: Bearer <token>"
```

### 7. Get Form Analytics

**Endpoint:** `GET /:id/analytics`

**Description:** Retrieve detailed analytics for a form

**Parameters:**
- `id` (path): MongoDB ObjectId of the form schema
- `period` (query, optional): Time period (`30d`, `60d`, `90d`, default: `30d`)
- `detailed` (query, optional): Include detailed analytics (`true`/`false`)

**Example Response:**
```json
{
  "success": true,
  "message": "Form analytics retrieved successfully",
  "data": {
    "basic": {
      "totalViews": 1250,
      "totalSubmissions": 89,
      "conversionRate": 7.12,
      "averageCompletionTime": 245,
      "lastSubmissionAt": "2024-01-15T10:30:00.000Z"
    },
    "detailed": {
      "timeAnalytics": {
        "averageTime": 245,
        "peakHours": [14],
        "peakDays": [2],
        "hourlyDistribution": [0, 0, 1, 2, ...],
        "dailyDistribution": [5, 12, 18, 15, 10, 8, 3]
      },
      "fieldAnalytics": [
        {
          "fieldName": "full_name",
          "fieldLabel": "Full Name",
          "completionRate": 98.5,
          "totalResponses": 87,
          "fieldType": "text"
        }
      ],
      "submissionTrend": [
        { "date": "2024-01-01", "submissions": 3 },
        { "date": "2024-01-02", "submissions": 5 }
      ]
    },
    "period": "30d",
    "generated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 8. Create Corporate Training Form

**Endpoint:** `POST /create-corporate-training`

**Description:** Create the default corporate training form schema

**Example Response:**
```json
{
  "success": true,
  "message": "Corporate training form created successfully",
  "data": {
    "form_schema": {
      "form_id": "corporate_training_inquiry_v1",
      "title": "Corporate Training Inquiry",
      // ... complete form schema
    },
    "form_config": {
      // ... form configuration for frontend
    }
  }
}
```

---

## Field Types and Validation

### Supported Field Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Single line text input | Name, title |
| `email` | Email input with validation | Email address |
| `tel` | Phone number input | Phone number |
| `url` | URL input with validation | Website |
| `number` | Numeric input | Age, quantity |
| `date` | Date picker | Birth date |
| `datetime-local` | Date and time picker | Appointment time |
| `time` | Time picker | Preferred time |
| `textarea` | Multi-line text input | Message, description |
| `select` | Dropdown selection | Country, category |
| `radio` | Radio button group | Gender, preference |
| `checkbox` | Checkbox input | Terms acceptance |
| `file` | File upload | Resume, documents |
| `hidden` | Hidden field | Tracking data |

### Validation Options

```json
{
  "validation": {
    "required": true,
    "minLength": 5,
    "maxLength": 100,
    "pattern": "^[a-zA-Z0-9]+$",
    "min": 0,
    "max": 100,
    "custom": "validatePhoneNumber"
  }
}
```

### Field Options (for select, radio, checkbox)

```json
{
  "options": [
    {
      "label": "Option 1",
      "value": "option1",
      "selected": false,
      "disabled": false
    }
  ]
}
```

---

## Frontend Integration

### React Hook Form Integration

```jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

const DynamicForm = ({ formId }) => {
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    fetchFormConfig();
  }, [formId]);

  const fetchFormConfig = async () => {
    try {
      const response = await fetch(`/api/v1/forms/schema/${formId}?config_only=true`);
      const data = await response.json();
      setFormConfig(data.data.form_config);
    } catch (error) {
      console.error('Error fetching form config:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const response = await fetch(`/api/v1/forms/schema/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      if (result.success) {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (loading) return <div>Loading form...</div>;
  if (!formConfig) return <div>Form not found</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2>{formConfig.title}</h2>
      <p>{formConfig.description}</p>
      
      {formConfig.fields.map((field) => (
        <div key={field.name} className="form-field">
          <label>{field.label} {field.required && '*'}</label>
          
          {field.type === 'textarea' ? (
            <textarea
              {...register(field.name, {
                required: field.required,
                minLength: field.validation?.minLength,
                maxLength: field.validation?.maxLength,
                pattern: field.validation?.pattern ? new RegExp(field.validation.pattern) : undefined
              })}
              placeholder={field.placeholder}
            />
          ) : field.type === 'select' ? (
            <select {...register(field.name, { required: field.required })}>
              <option value="">{field.placeholder}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              {...register(field.name, {
                required: field.required,
                minLength: field.validation?.minLength,
                maxLength: field.validation?.maxLength,
                pattern: field.validation?.pattern ? new RegExp(field.validation.pattern) : undefined
              })}
              placeholder={field.placeholder}
            />
          )}
          
          {errors[field.name] && (
            <span className="error">This field is required</span>
          )}
        </div>
      ))}
      
      <button type="submit">
        {formConfig.submitButton.label}
      </button>
      
      {formConfig.privacyNote && (
        <p className="privacy-note">{formConfig.privacyNote}</p>
      )}
    </form>
  );
};

export default DynamicForm;
```

### TypeScript Types

```typescript
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';
  placeholder?: string;
  required: boolean;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  options?: Array<{
    label: string;
    value: string;
    selected?: boolean;
    disabled?: boolean;
  }>;
}

interface FormConfig {
  form_id: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitButton: {
    label: string;
    loadingText?: string;
    successText?: string;
  };
  confirmationMessage?: string;
  privacyNote?: string;
}
```

---

## Database Integration

### Form Schema Collection

The form schemas are stored in the `form_schemas` collection with the following structure:

```javascript
{
  _id: ObjectId,
  form_id: String, // Unique identifier
  title: String,
  description: String,
  category: String,
  fields: [FormField],
  submitButton: Object,
  settings: Object,
  analytics: {
    totalViews: Number,
    totalSubmissions: Number,
    conversionRate: Number,
    // ... more analytics
  },
  status: String, // draft, active, inactive, archived
  created_by: ObjectId,
  updated_by: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

### Universal Form Integration

Form submissions are stored in the existing `universal_forms` collection with additional metadata:

```javascript
{
  // ... existing universal form fields
  form_schema_id: ObjectId, // Reference to form schema
  form_schema_version: String,
  custom_fields: Map, // All submitted data
  metadata: {
    form_schema_id: ObjectId,
    form_id: String,
    submission_source: 'dynamic_form',
    user_agent: String,
    ip_address: String,
    submission_timestamp: Date
  }
}
```

---

## Security Features

### Access Control

1. **Public Forms**: Accessible without authentication
2. **Private Forms**: Require user authentication
3. **Role-based Access**: Restrict forms to specific user roles
4. **IP Whitelisting**: Allow access only from specific IP addresses

### Data Protection

1. **Input Validation**: Server-side validation for all fields
2. **XSS Prevention**: Automatic sanitization of user inputs
3. **CSRF Protection**: Built-in CSRF token validation
4. **Rate Limiting**: Prevent spam submissions
5. **CAPTCHA Integration**: Optional CAPTCHA for forms

### Example Security Configuration

```json
{
  "access": {
    "public": false,
    "allowedRoles": ["admin", "manager"],
    "ipWhitelist": ["192.168.1.0/24"],
    "maxSubmissions": 5,
    "submissionWindow": 24
  },
  "settings": {
    "enableCaptcha": true,
    "enableSpamProtection": true
  }
}
```

---

## Best Practices

### Form Design

1. **Keep It Simple**: Only ask for essential information
2. **Clear Labels**: Use descriptive labels and help text
3. **Logical Flow**: Group related fields together
4. **Progressive Disclosure**: Show fields conditionally when needed
5. **Mobile-Friendly**: Ensure forms work well on all devices

### Performance

1. **Field Validation**: Use client-side validation for better UX
2. **Lazy Loading**: Load form configurations on demand
3. **Caching**: Cache form configurations for better performance
4. **Compression**: Minimize payload size

### Analytics

1. **Track Everything**: Monitor form views, submissions, and completion rates
2. **A/B Testing**: Test different form versions
3. **Field Analysis**: Identify problematic fields with low completion rates
4. **User Behavior**: Analyze drop-off points and optimize accordingly

---

## Migration Guide

### From Static to Dynamic Forms

1. **Export Existing Forms**: Create form schemas for existing forms
2. **Update Frontend**: Replace static forms with dynamic form components
3. **Data Migration**: Migrate existing form submissions if needed
4. **Testing**: Thoroughly test all form functionality

### Example Migration Script

```javascript
// Migration script to convert corporate training form to dynamic schema
const createCorporateTrainingSchema = async () => {
  const formSchema = {
    form_id: 'corporate_training_inquiry_v1',
    title: 'Corporate Training Inquiry',
    description: 'Let us help your team grow...',
    category: 'corporate_training',
    fields: [
      // ... field definitions
    ],
    status: 'active'
  };
  
  await FormSchema.create(formSchema);
  console.log('Corporate training form schema created');
};
```

---

## Troubleshooting

### Common Issues

#### 1. Form Not Loading
**Problem**: Form configuration not found
**Solution**: Check if form_id exists and status is 'active'

#### 2. Validation Errors
**Problem**: Form submission fails validation
**Solution**: Check field validation rules and ensure data matches requirements

#### 3. Access Denied
**Problem**: Cannot access private forms
**Solution**: Ensure user is authenticated and has required permissions

#### 4. Analytics Not Updating
**Problem**: Form analytics not showing current data
**Solution**: Check if analytics are enabled in form settings

### Debug Mode

Enable debug mode for detailed error information:

```javascript
// Set NODE_ENV to development for detailed error messages
process.env.NODE_ENV = 'development';
```

---

## Support and Contribution

### Getting Help

1. Check this documentation first
2. Review the API examples
3. Check the troubleshooting section
4. Contact the development team

### Contributing

1. Follow the coding standards
2. Add tests for new features
3. Update documentation
4. Submit pull requests for review

---

## Changelog

### Version 2.0.0
- Added dynamic form schema system
- Integrated with Universal Form model
- Added comprehensive analytics
- Added multi-language support
- Added conditional field logic

### Version 1.0.0
- Initial release with basic form handling
- Corporate training form implementation
- Basic validation and submission handling 