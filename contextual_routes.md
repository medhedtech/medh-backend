# Contextual Routes for MEDH Backend

## Core Course Management Files

### Models
- **Course Model**: `models/course-model.js`
  - Primary schema for course data
  - Contains validation rules and indexes
  - Implements pre-save hooks and utility methods

- **Enrolled Course Model**: `models/enrolled-courses-model.js`
  - Tracks student enrollments in courses
  - Links students to courses with enrollment metadata

### Controllers
- **Course Controller**: `controllers/course-controller.js`
  - Implements core course CRUD operations
  - Handles course search and filtering
  - Manages course status changes

### Routes
- **Course Routes**: `routes/courseRoutes.js`
  - Defines API endpoints for course operations
  - Applies middleware for validation and authentication
  - Organizes routes by access level

### Middleware & Utilities
- **Auth Middleware**: `middleware/auth-middleware.js`
  - Handles JWT authentication and role-based authorization

- **Validation Middleware**: `middleware/validation-middleware.js`
  - Validates request inputs before processing
  - Ensures data integrity and security

- **Validation Helpers**: `utils/validation-helpers.js`
  - Contains reusable validation functions
  - Implements advanced data validation logic

## Course API Endpoints

### Public Endpoints
- `GET /api/courses/get`: Get all courses without pagination
- `GET /api/courses/search`: Search courses with filtering & pagination
- `GET /api/courses/new`: Get new courses with filtering & pagination
- `GET /api/courses/course-names`: Get course names for autocomplete
- `POST /api/courses/related-courses`: Get related courses
- `GET /api/courses/get/:id`: Get course by ID
- `GET /api/courses/get-coorporate/:id`: Get corporate course by ID

### Student Endpoints
- `GET /api/courses/recorded-videos/:studentId`: Get recorded videos for a student

### Admin Endpoints
- `POST /api/courses/create`: Create a new course
- `POST /api/courses/update/:id`: Update an existing course
- `POST /api/courses/toggle-status/:id`: Toggle course status
- `POST /api/courses/recorded-videos/:id`: Update recorded videos
- `DELETE /api/courses/delete/:id`: Hard delete a course (super admin only)
- `POST /api/courses/soft-delete/:id`: Soft delete a course 