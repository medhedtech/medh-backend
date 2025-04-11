# MEDH Backend

A modern Node.js Express backend for the MEDH learning platform with MongoDB integration.

## 🚀 Modernized Architecture

This project has been refactored to use modern JavaScript (ES6+) standards and improved architectural patterns:

- **ES Modules**: Uses native JavaScript modules with `import/export` syntax
- **Service Layer**: Business logic extracted from controllers into service layers
- **Clean Architecture**: Separation of concerns between routes, controllers, services, and models
- **Model Relationships**: Clear documentation of inter-model connections
- **Middleware Design**: Enhanced middleware for auth, error handling, and request processing

## 📋 Features

- User authentication and authorization (JWT)
- Course management (creation, enrollment, progress tracking)
- Student and instructor management
- Payment processing
- File upload and management
- Email notifications with templating, queueing, and error recovery
- API documentation
- Comprehensive error handling
- Logging and monitoring

## 🔧 Tech Stack

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **MongoDB/Mongoose**: Database and ODM
- **JWT**: Authentication
- **Nodemailer**: Email service
- **Bull**: Queue management
- **Handlebars**: Email templating
- **Redis**: Queue storage
- **Winston**: Logging
- **AWS SDK**: S3 file storage
- **Jest**: Testing framework

## 📁 Project Structure

```
medh-backend/
├── config/          # Configuration settings
├── controllers/     # Request handlers
├── models/          # Mongoose data models
├── services/        # Business logic
├── routes/          # API routes
├── middleware/      # Express middleware
├── templates/       # Email templates
├── utils/           # Utility functions
├── validations/     # Request validation
├── tests/           # Test files
├── docs/            # Documentation
├── scripts/         # Helper scripts
└── uploads/         # Local file storage
```

## 🔄 Service Layer Architecture

The service layer is a key improvement that:

1. **Separates Business Logic**: Moves complex operations out of controllers
2. **Enhances Testability**: Makes business logic easier to test in isolation
3. **Improves Reusability**: Allows logic to be shared across different controllers
4. **Clarifies Responsibilities**: Each service focuses on specific model operations

### Example Service Pattern

```javascript
// services/userService.js
class UserService {
  async createUser(userData) {
    // Business logic for user creation
  }

  async authenticateUser(credentials) {
    // Authentication logic
  }
}
```

## 🔌 Model Relationships

Models in the system are interconnected to form a cohesive data structure. The key relationships are:

- **User** → Enrollments, Blogs, Orders
- **Course** → Sections, Lessons, Enrollments
- **Enrollment** → Progress, Certificates
- **Lesson** → Quizzes, Assignments, Resources

See `docs/model-relationships.md` for detailed diagrams and explanations.

## 🛠️ Setup and Installation

### Prerequisites

- Node.js (v18+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/your-org/medh-backend.git
cd medh-backend
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server

```bash
npm run dev
# or
yarn dev
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run API tests with report
npm run test:api:report
```

## 📘 API Documentation

API documentation is available at `/api/docs` when the server is running, or in the `API_DOCUMENTATION.md` file.

## 🚢 Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Express.js team
- MongoDB team
- All contributors who have helped shape this project

## 📧 Email System

The platform uses a robust email system with the following features:

### Features

- **Templating**: Handlebars templates for consistent and maintainable email layouts
- **Queuing**: Bull queue integration for reliable email delivery and retry mechanism
- **Rate Limiting**: Prevents sending too many emails too quickly
- **Error Recovery**: Automatic retries with exponential backoff for failed emails
- **Admin Notifications**: Alerts administrators about persistent email failures
- **Plain Text Fallback**: Automatically generates plain text versions of HTML emails
- **Template Caching**: Improves performance for frequently sent emails
- **Bulk Email Support**: Efficiently send emails to multiple recipients
- **Email Analytics**: Track email sending status and performance

### Template System

Email templates are stored in the `templates/` directory as `.hbs` files, making it easy to maintain consistent branding and layouts across all emails.

```html
<!-- Example: templates/welcome.hbs -->
<h2>Welcome, {{name}}!</h2>
<p>Thank you for registering with us.</p>
```

### Usage Examples

```javascript
// Send a welcome email (queued with high priority)
await emailService.sendWelcomeEmail("user@example.com", "John Doe", {
  additionalData,
});

// Send a password reset email
await emailService.sendPasswordResetEmail(
  "user@example.com",
  "John Doe",
  "temp123pwd",
);

// Send a notification using a template
await emailService.sendNotificationEmail(
  "user@example.com",
  "Course Completed",
  "course-completion",
  { courseName: "JavaScript 101" },
);

// Send bulk emails
await emailService.sendBulkEmail(
  ["user1@example.com", "user2@example.com"],
  "New Course Available",
  "new-course",
  { courseName: "Advanced React" },
);
```
