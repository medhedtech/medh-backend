# Certificate Generation System

## Overview
A comprehensive certificate generation system that allows admins to upload certificate templates and generate personalized certificates for students.

## Features

### ✅ **Template Management**
- Upload PDF/HTML certificate templates with placeholders
- Define custom fields (e.g., `{name}`, `{course}`, `{date}`)
- Template library with usage tracking
- Delete templates (only if not used)

### ✅ **Certificate Generation**
- Select template and student
- Auto-generated forms based on template fields
- PDF generation with placeholder replacement
- Unique certificate IDs and numbers
- Download functionality

### ✅ **Admin Dashboard**
- Modern React UI with Material-UI
- Template management interface
- Certificate generation workflow
- Statistics and analytics

## API Endpoints

### Template Management
```
POST   /api/v1/certificates/templates     - Upload template
GET    /api/v1/certificates/templates     - Get all templates
GET    /api/v1/certificates/templates/:id - Get template by ID
DELETE /api/v1/certificates/templates/:id - Delete template
```

### Certificate Generation
```
POST   /api/v1/certificates/generate      - Generate certificate
GET    /api/v1/certificates               - Get all certificates
GET    /api/v1/certificates/:id           - Get certificate by ID
GET    /api/v1/certificates/:id/download  - Download certificate
```

### Statistics
```
GET    /api/v1/certificates/stats/overview - Get certificate statistics
```

## Database Models

### CertificateTemplate
```javascript
{
  templateId: String,        // Auto-generated (TEMP0001, TEMP0002, etc.)
  templateName: String,      // Template name
  description: String,       // Template description
  fields: [String],          // Placeholder fields ["name", "course", "date"]
  fileUrl: String,           // S3 URL of template file
  fileType: String,          // "pdf" or "html"
  fileSize: Number,          // File size in bytes
  isActive: Boolean,         // Template status
  createdBy: ObjectId,       // User who created template
  usageCount: Number,        // How many times used
  lastUsed: Date            // Last usage date
}
```

### GeneratedCertificate
```javascript
{
  certificateId: String,     // Auto-generated (CERT000001, etc.)
  studentId: ObjectId,       // Student reference
  templateId: ObjectId,      // Template reference
  studentData: Object,       // Filled placeholder values
  generatedFileUrl: String,  // S3 URL of generated PDF
  certificateNumber: String, // Auto-generated (MEDH-202412-0001)
  status: String,           // "generated", "issued", "revoked"
  issuedAt: Date,           // Generation timestamp
  issuedBy: ObjectId,       // Admin who generated
  courseId: ObjectId,       // Optional course reference
  batchId: ObjectId         // Optional batch reference
}
```

## Usage Instructions

### 1. Access the Dashboard
Navigate to: `http://localhost:3000/dashboards/admin/GenrateCertificate/`

### 2. Upload Template
1. Click "Upload Template" button
2. Enter template name and description
3. Define placeholder fields (e.g., `name`, `course`, `date`)
4. Upload PDF or HTML file
5. Click "Upload"

### 3. Generate Certificate
1. Select a template from dropdown
2. Choose a student
3. Fill in the required fields (auto-generated based on template)
4. Click "Generate Certificate"
5. Download the generated PDF

### 4. View Statistics
- Switch to "Statistics & Analytics" tab
- View total templates, certificates, monthly stats
- See most used templates and usage distribution

## Environment Variables

Add these to your `.env` file for S3 functionality:

```env
# AWS Configuration
IM_AWS_ACCESS_KEY=your_aws_access_key
IM_AWS_SECRET_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_REGION=ap-south-1
```

## Dependencies

### Backend
```json
{
  "pdf-lib": "^1.17.1",
  "multer": "^1.4.5-lts.1",
  "aws-sdk": "^2.1531.0"
}
```

### Frontend
```json
{
  "@mui/material": "^5.x.x",
  "@mui/icons-material": "^5.x.x",
  "axios": "^1.x.x"
}
```

## File Structure

```
medh-backend/
├── models/
│   ├── certificateTemplate.js
│   └── generatedCertificate.js
├── controllers/
│   └── certificateController.js
├── routes/
│   └── certificateRoutes.js
└── utils/
    └── s3Utils.js

medh-web/
├── src/
│   ├── components/admin/
│   │   ├── CertificateGenerator.js
│   │   └── CertificateStats.js
│   └── app/dashboards/admin/GenrateCertificate/
│       └── page.js
```

## Error Handling

The system includes comprehensive error handling:

- **S3 Failures**: Graceful fallback to placeholder URLs for development
- **File Validation**: Only PDF and HTML files allowed
- **Required Fields**: Validation for all template fields
- **Template Usage**: Cannot delete templates that are in use
- **Student Validation**: Ensures student exists before generation

## Security Features

- **Admin Only Access**: All endpoints require admin/super-admin role
- **File Type Validation**: Strict MIME type checking
- **File Size Limits**: 10MB maximum file size
- **Signed URLs**: Secure S3 download URLs with expiration
- **Input Validation**: Comprehensive request validation

## Development Notes

### S3 Configuration
- The system works without S3 for development (uses placeholder URLs)
- For production, configure AWS credentials in `.env`
- Files are stored in `certificate-templates/` and `certificates/` folders

### PDF Generation
- Currently generates simple PDFs with student data
- Future enhancement: Use actual template files with placeholder replacement
- Uses `pdf-lib` for PDF manipulation

### Template Fields
- Dynamic field definition during template upload
- Auto-generated forms based on template fields
- Validation ensures all required fields are provided

## Future Enhancements

1. **Template Editor**: Visual template editor for creating certificates
2. **Batch Generation**: Generate multiple certificates at once
3. **Email Integration**: Automatically email certificates to students
4. **QR Code Integration**: Add QR codes for certificate verification
5. **Advanced PDF Processing**: Use actual template files with placeholder replacement
6. **Certificate Verification**: Public verification system
7. **Analytics Dashboard**: More detailed usage analytics

## Troubleshooting

### Common Issues

1. **S3 Upload Fails**
   - Check AWS credentials in `.env`
   - Verify S3 bucket exists and is accessible
   - System will use placeholder URLs as fallback

2. **File Upload Errors**
   - Ensure file is PDF or HTML
   - Check file size (max 10MB)
   - Verify multer configuration

3. **Template Not Found**
   - Check if template is active
   - Verify template ID in database

4. **Student Not Found**
   - Ensure student exists in database
   - Check student ID format

### Logs
Check server logs for detailed error information:
```bash
npm run dev
```

## Support

For issues or questions, check the server logs and ensure all dependencies are installed correctly.
