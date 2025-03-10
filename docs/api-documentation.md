# MEDH Backend API Documentation

## Base URL
```
https://api.medh.io/v1
```

## Authentication
Most endpoints require authentication using JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting
- Public Routes: 200 requests per 15 minutes
- Admin Routes: 100 requests per 15 minutes
- Newsletter/Contact: 50 requests per 15 minutes

## API Endpoints

### Authentication & User Management

#### Authentication
- **POST** `/auth/login`
  - Body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
  - Response:
    ```json
    {
      "token": "string",
      "user": {
        "id": "string",
        "email": "string",
        "role": "string"
      }
    }
    ```

#### Password Management
- **POST** `/auth/forgot-password`
  - Body: `{ "email": "string" }`

- **POST** `/auth/reset-password`
  - Body:
    ```json
    {
      "email": "string",
      "token": "string",
      "newPassword": "string"
    }
    ```

- **POST** `/auth/verify-temp-password`
  - Body:
    ```json
    {
      "email": "string",
      "tempPassword": "string"
    }
    ```

### Courses

#### Public Endpoints
- **GET** `/courses/get`
  - Get all courses without pagination
  - Query: None
  - Access: Public

- **GET** `/courses/search`
  - Search courses with filters
  - Query Parameters:
    - `page`: number
    - `limit`: number
    - `search`: string
    - `category`: string
    - `price_min`: number
    - `price_max`: number
    - `sort`: string (options: "price_asc", "price_desc", "date_asc", "date_desc")

- **GET** `/courses/new`
  - Get new courses
  - Query Parameters:
    - `page`: number
    - `limit`: number

- **GET** `/courses/get/:id`
  - Get course details
  - Parameters:
    - `id`: Course ID

#### Admin Endpoints
- **POST** `/courses/create` (Admin)
  - Body:
    ```json
    {
      "title": "string",
      "description": "string",
      "category": "string",
      "price": "number",
      "duration": "string",
      "instructor": "string",
      "thumbnail": "string",
      "syllabus": ["string"],
      "requirements": ["string"],
      "class_type": "string",
      "start_date": "date",
      "end_date": "date"
    }
    ```

- **POST** `/courses/update/:id` (Admin)
  - Same body as create

- **DELETE** `/courses/delete/:id` (Super Admin)
  - Hard delete course

- **POST** `/courses/soft-delete/:id` (Admin)
  - Soft delete course

### Students

#### Registration & Profile
- **POST** `/students/register`
  - Body:
    ```json
    {
      "name": "string",
      "email": "string",
      "password": "string",
      "phone": "string",
      "address": {
        "street": "string",
        "city": "string",
        "state": "string",
        "country": "string",
        "pincode": "string"
      }
    }
    ```

- **GET** `/students/profile`
  - Get student profile
  - Requires Authentication

### Enrollments

#### Course Enrollment
- **POST** `/enrolled/enroll`
  - Enroll in a course
  - Requires Authentication
  - Body:
    ```json
    {
      "courseId": "string",
      "paymentDetails": {
        "amount": "number",
        "transactionId": "string",
        "paymentMethod": "string"
      }
    }
    ```

- **GET** `/enrolled/my-courses`
  - Get enrolled courses
  - Requires Authentication

### Learning Resources

#### Course Resources
- **GET** `/resources/course/:courseId`
  - Get course resources
  - Requires Authentication
  - Parameters:
    - `courseId`: Course ID

#### Recorded Sessions
- **GET** `/recorded-sessions/course/:courseId`
  - Get recorded sessions
  - Requires Authentication
  - Parameters:
    - `courseId`: Course ID

#### Online Meetings
- **GET** `/online-meeting/upcoming`
  - Get upcoming live sessions
  - Requires Authentication

### Assignments & Quizzes

#### Assignments
- **GET** `/assignments/course/:courseId`
  - Get course assignments
  - Requires Authentication

- **POST** `/assignments/submit`
  - Submit assignment
  - Requires Authentication
  - Body:
    ```json
    {
      "assignmentId": "string",
      "submission": "string",
      "attachments": ["string"]
    }
    ```

#### Quizzes
- **GET** `/quizes/course/:courseId`
  - Get course quizzes
  - Requires Authentication

- **POST** `/quizResponses/submit`
  - Submit quiz response
  - Requires Authentication

### Feedback & Support

#### Feedback
- **POST** `/feedback`
  - Submit course feedback
  - Requires Authentication
  - Body:
    ```json
    {
      "courseId": "string",
      "rating": "number",
      "comment": "string"
    }
    ```

#### Grievance
- **POST** `/grievance/submit`
  - Submit grievance
  - Requires Authentication
  - Body:
    ```json
    {
      "subject": "string",
      "description": "string",
      "category": "string"
    }
    ```

### Corporate Training

#### Corporate Courses
- **GET** `/corporate-training/courses`
  - Get corporate training courses
  - Requires Authentication (Corporate)

- **POST** `/enroll-coorporate/batch`
  - Enroll corporate batch
  - Requires Authentication (Corporate Admin)

### Additional Features

#### Blog
- **GET** `/blogs`
  - Get all blogs
  - Query Parameters:
    - `page`: number
    - `limit`: number
    - `category`: string

#### Newsletter
- **POST** `/newsletter/subscribe`
  - Body: `{ "email": "string" }`

#### Contact
- **POST** `/contact`
  - Body:
    ```json
    {
      "name": "string",
      "email": "string",
      "subject": "string",
      "message": "string"
    }
    ```

## Error Handling
All endpoints follow a standard error response format:
```json
{
  "status": "error",
  "code": "number",
  "message": "string",
  "details": "object (optional)"
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Security
1. JWT Authentication required for protected routes
2. Role-based access control (Student, Instructor, Admin, Super Admin)
3. Rate limiting on all endpoints
4. Input validation and sanitization
5. Secure password handling with hashing
6. Protected routes for sensitive operations

## Support
For API support, contact:
- Email: api-support@medh.io
- Documentation: https://docs.medh.io
- Technical Support: https://support.medh.io 