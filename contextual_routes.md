# Contextual Routes

## API Routes
- **POST /api/v1/broucher/create** - Create a new brochure record and send email
- **GET /api/v1/broucher** - Get all brochures with pagination and filtering
- **GET /api/v1/broucher/:id** - Get a specific brochure by ID
- **PUT /api/v1/broucher/:id** - Update a brochure
- **DELETE /api/v1/broucher/:id** - Delete a brochure
- **POST /api/v1/broucher/download/:courseId** - Download a brochure for a course
- **GET /api/v1/broucher/analytics** - Get brochure download analytics

## Course Routes
- **POST /api/courses/create** - Create a new course
- **GET /api/courses** - Get all courses
- **GET /api/courses/:id** - Get course by ID
- **PUT /api/courses/:id** - Update course
- **DELETE /api/courses/:id** - Delete course

## Brochure Routes
- **GET /api/v1/broucher** - Get all brochures (Admin)
- **GET /api/v1/broucher/:id** - Get specific brochure by ID (Admin)
- **POST /api/v1/broucher/create** - Create a new brochure record and send via email
- **POST /api/v1/broucher/download/:courseId** - Download brochure for a specific course (with user data collection & email)
- **GET /api/v1/broucher/download/:courseId** - Get brochure URL for a specific course (simplified version)
- **PUT /api/v1/broucher/update/:id** - Update brochure (Admin)
- **DELETE /api/v1/broucher/delete/:id** - Delete brochure (Admin)

## Important Files
- index.js - Main server entry point
- routes/index.js - Main router
- controllers/auth-controller.js - Authentication logic
- models/user-model.js - User schema
- middleware/auth.js - Authentication middleware
- routes/broucherRoutes.js - Brochure routes
- controllers/brouchers-controller.js - Brochure logic
- models/broucker-model.js - Brochure schema

## Utility Files
- **nodemailer configuration** - Set up in brouchers-controller.js
- **MongoDB connection** - Likely in app.js or a database configuration file

## Entry Points
- **app.js or server.js** - Main application entry point
- **routes/** - Directory containing route definitions 