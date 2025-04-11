# MEDH API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Common Headers](#common-headers)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-1)
  - [Categories](#categories)
  - [Courses](#courses)
  - [FAQ](#faq)
  - [Freq (Frequently Used Data)](#freq-frequently-used-data)
  - [Students](#students)
  - [Instructors](#instructors)
  - [Certificates](#certificates)
  - [Online Meetings](#online-meetings)
  - [Enrolled Courses](#enrolled-courses)
  - [Recorded Sessions](#recorded-sessions)
  - [Upload](#upload)
  - [Contact](#contact)
  - [Blogs](#blogs)
  - [Dashboard](#dashboard)
  - [Assign Instructor](#assign-instructor)
  - [Membership](#membership)
  - [Resources](#resources)
  - [Quizzes](#quizzes)
  - [Feedback](#feedback)
  - [Assignment](#assignment)
  - [Placements](#placements)
  - [Complaint](#complaint)
  - [Grievance](#grievance)
  - [Enroll Form](#enroll-form)
  - [Job Post](#job-post)
  - [Subscription](#subscription)
  - [Brochure](#brochure)
  - [Newsletter](#newsletter)
  - [Quiz Response](#quiz-response)
  - [Track Sessions](#track-sessions)
  - [Assign Corporate Course](#assign-corporate-course)
  - [Corporate Training](#corporate-training)
  - [Payments](#payments)
  - [CORS Test](#cors-test)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

This document provides information on how to interact with the MEDH API, including authentication methods, endpoints, request formats, response structures, and best practices.

## Base URL

For development environment:

```
http://localhost:8080/api/v1
```

For production environment:

```
https://api.medh.co/api/v1
```

## Authentication

Most endpoints require authentication using JWT tokens. After successfully logging in, you'll receive a token that should be included in subsequent requests.

### Authentication Headers

```
Authorization: Bearer <your_token>
```

## Common Headers

For all API requests, include the following headers:

```
Content-Type: application/json
Accept: application/json
```

For file uploads:

```
Content-Type: multipart/form-data
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Limits are:

- 100 requests per minute for authenticated users
- 30 requests per minute for non-authenticated users

If you exceed the rate limit, you'll receive a 429 (Too Many Requests) response.

## Endpoints

### Authentication

#### Register a new user

```
POST /auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "User Name",
  "phone_numbers": "9876543210",
  "agree_terms": true,
  "role": ["student"],
  "meta": {
    "gender": "Male",
    "upload_resume": []
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### Login

```
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (Success):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    // User details
  }
}
```

### Categories

#### Get All Categories

```
GET /categories/getAll
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "category_id",
      "name": "Category Name",
      "description": "Category Description",
      "slug": "category-name"
      // Other category fields
    }
  ]
}
```

### Courses

#### Get All Courses

```
GET /courses/get
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "course_id",
      "title": "Course Title",
      "description": "Course Description",
      "category": "category_id"
      // Other course fields
    }
  ]
}
```

### FAQ

#### Get All FAQs

```
GET /faq/getAll
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "faq_id",
      "question": "FAQ Question",
      "answer": "FAQ Answer"
    }
  ]
}
```

#### Get FAQ by ID

```
GET /faq/:id
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "_id": "faq_id",
    "question": "FAQ Question",
    "answer": "FAQ Answer"
  }
}
```

### Freq (Frequently Used Data)

#### Get Freq Data

```
GET /freq/get
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    // Frequently used data
  }
}
```

### Students

#### Get All Students

```
GET /students/get
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "student_id",
      "full_name": "Student Name",
      "email": "student@example.com"
      // Other student fields
    }
  ]
}
```

### Instructors

#### Get All Instructors

```
GET /instructors/get
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "instructor_id",
      "full_name": "Instructor Name",
      "email": "instructor@example.com"
      // Other instructor fields
    }
  ]
}
```

### Certificates

#### Get Certificates

```
GET /certificates/get
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "certificate_id",
      "student": "student_id",
      "course": "course_id",
      "issue_date": "2023-01-01T00:00:00.000Z"
      // Other certificate fields
    }
  ]
}
```

### Online Meetings

#### Get All Online Meetings

```
GET /online-meetings/get
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "meeting_id",
      "title": "Meeting Title",
      "description": "Meeting Description",
      "start_time": "2023-01-01T10:00:00.000Z",
      "end_time": "2023-01-01T11:00:00.000Z",
      "meeting_link": "https://meeting-platform.com/join/123456"
      // Other meeting fields
    }
  ]
}
```

### Enrolled Courses

#### Get Enrolled Courses

```
GET /enrolled/get
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "enrollment_id",
      "student": "student_id",
      "course": "course_id",
      "enrollment_date": "2023-01-01T00:00:00.000Z"
      // Other enrollment fields
    }
  ]
}
```

### Recorded Sessions

#### Get Recorded Sessions

```
GET /recorded-sessions/get
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "session_id",
      "title": "Session Title",
      "description": "Session Description",
      "video_url": "https://video-storage.com/video/12345"
      // Other session fields
    }
  ]
}
```

### Upload

#### Upload File

```
POST /upload
```

**Headers Required:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

```
file: <file_to_upload>
type: "profile" | "document" | "assignment" | "resource"
```

**Response (Success):**

```json
{
  "success": true,
  "url": "https://storage.cloudprovider.com/path/to/file"
}
```

### Contact

#### Submit Contact Form

```
POST /contact/submit
```

**Request Body:**

```json
{
  "name": "Contact Name",
  "email": "contact@example.com",
  "subject": "Contact Subject",
  "message": "Contact Message"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Contact form submitted successfully"
}
```

### Blogs

#### Get All Blogs

```
GET /blogs/get
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "blog_id",
      "title": "Blog Title",
      "content": "Blog Content",
      "author": "author_id",
      "publish_date": "2023-01-01T00:00:00.000Z"
      // Other blog fields
    }
  ]
}
```

### Dashboard

#### Get Dashboard Data

```
GET /dashboard/stats
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "total_students": 100,
    "total_courses": 20,
    "total_instructors": 10
    // Other dashboard statistics
  }
}
```

### Assign Instructor

#### Assign Instructor to Course

```
POST /assign-instructor
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "course_id": "course_id",
  "instructor_id": "instructor_id"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Instructor assigned successfully"
}
```

### Membership

#### Get Membership Plans

```
GET /membership/plans
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "plan_id",
      "name": "Plan Name",
      "description": "Plan Description",
      "price": 99.99,
      "duration": 30
      // Other plan fields
    }
  ]
}
```

### Resources

#### Get All Resources

```
GET /resources
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "resource_id",
      "title": "Resource Title",
      "description": "Resource Description",
      "file_url": "https://storage.cloudprovider.com/path/to/resource"
      // Other resource fields
    }
  ]
}
```

### Quizzes

#### Get All Quizzes

```
GET /quizes
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "quiz_id",
      "title": "Quiz Title",
      "description": "Quiz Description",
      "questions": [
        {
          "question": "Question text",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correct_answer": 0
        }
      ]
      // Other quiz fields
    }
  ]
}
```

### Feedback

#### Submit Feedback

```
POST /feedback/submit
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "course_id": "course_id",
  "rating": 4.5,
  "comment": "Feedback comment"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Feedback submitted successfully"
}
```

### Assignment

#### Get All Assignments

```
GET /assignment
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "assignment_id",
      "title": "Assignment Title",
      "description": "Assignment Description",
      "due_date": "2023-01-15T00:00:00.000Z"
      // Other assignment fields
    }
  ]
}
```

### Placements

#### Get Placement Information

```
GET /placements
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "placement_id",
      "company_name": "Company Name",
      "position": "Position Title",
      "description": "Job Description"
      // Other placement fields
    }
  ]
}
```

### Complaint

#### Submit Complaint

```
POST /complaint/submit
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "subject": "Complaint Subject",
  "description": "Complaint Description",
  "category": "technical" | "billing" | "course" | "instructor"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Complaint submitted successfully",
  "ticket_id": "COMP123456"
}
```

### Grievance

#### Submit Grievance

```
POST /grievance/submit
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "subject": "Grievance Subject",
  "description": "Grievance Description",
  "severity": "low" | "medium" | "high"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Grievance submitted successfully",
  "ticket_id": "GRIEV123456"
}
```

### Enroll Form

#### Submit Enrollment Form

```
POST /enroll-form/submit
```

**Request Body:**

```json
{
  "name": "Applicant Name",
  "email": "applicant@example.com",
  "phone": "9876543210",
  "course_id": "course_id",
  "education": "Education Information",
  "experience": "Experience Information"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Enrollment form submitted successfully"
}
```

### Job Post

#### Get All Job Posts

```
GET /job-post
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "job_id",
      "title": "Job Title",
      "company": "Company Name",
      "description": "Job Description",
      "requirements": ["Requirement 1", "Requirement 2"],
      "location": "Job Location"
      // Other job fields
    }
  ]
}
```

#### Add Job Post

```
POST /add-job-post
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "title": "Job Title",
  "company": "Company Name",
  "description": "Job Description",
  "requirements": ["Requirement 1", "Requirement 2"],
  "location": "Job Location",
  "salary_range": {
    "min": 50000,
    "max": 80000
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Job post added successfully"
}
```

### Subscription

#### Subscribe to Newsletter

```
POST /subscription/subscribe
```

**Request Body:**

```json
{
  "email": "subscriber@example.com",
  "name": "Subscriber Name",
  "interests": ["courses", "placements", "events"]
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Subscribed successfully"
}
```

### Brochure

#### Get Brochure

```
GET /broucher
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "brochure_id",
      "title": "Brochure Title",
      "file_url": "https://storage.cloudprovider.com/path/to/brochure.pdf"
      // Other brochure fields
    }
  ]
}
```

### Newsletter

#### Get Newsletters

```
GET /newsletter
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "newsletter_id",
      "title": "Newsletter Title",
      "content": "Newsletter Content",
      "publish_date": "2023-01-01T00:00:00.000Z"
      // Other newsletter fields
    }
  ]
}
```

### Quiz Response

#### Submit Quiz Response

```
POST /quiz-response/submit
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "quiz_id": "quiz_id",
  "answers": [0, 2, 1, 3],
  "time_taken": 300
}
```

**Response (Success):**

```json
{
  "success": true,
  "score": 75,
  "correct_answers": 3,
  "total_questions": 4
}
```

### Track Sessions

#### Track Session Attendance

```
POST /track-sessions/record
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "session_id": "session_id",
  "student_id": "student_id",
  "attendance_status": "present" | "absent" | "late",
  "duration": 45
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Session tracking recorded successfully"
}
```

### Assign Corporate Course

#### Assign Course to Corporate Client

```
POST /assign-corporate-course
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "corporate_id": "corporate_id",
  "course_id": "course_id",
  "seats": 10,
  "start_date": "2023-01-15T00:00:00.000Z",
  "end_date": "2023-03-15T00:00:00.000Z"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Course assigned to corporate client successfully"
}
```

### Corporate Training

#### Get Corporate Training Information

```
GET /corporate-training
```

**Response (Success):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "training_id",
      "title": "Training Title",
      "description": "Training Description",
      "duration": "2 months",
      "format": "online" | "offline" | "hybrid",
      // Other training fields
    }
  ]
}
```

### Payments

#### Process Payment

```
POST /payments/process
```

**Headers Required:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "amount": 999.99,
  "course_id": "course_id",
  "payment_method": "credit_card" | "debit_card" | "net_banking" | "upi",
  "currency": "INR",
  "payment_details": {
    // Payment method specific details
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "transaction_id": "TXN123456",
  "status": "completed",
  "receipt_url": "https://storage.cloudprovider.com/path/to/receipt.pdf"
}
```

### CORS Test

#### Test CORS Configuration

```
GET /cors-test
```

**Response (Success):**

```json
{
  "message": "CORS test successful",
  "origin": "https://example.com",
  "allowedOrigins": [
    "https://medh.co",
    "https://www.medh.co",
    "http://localhost:3000"
  ],
  "environment": "development",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Error Handling

The API returns standard HTTP status codes along with a JSON response containing error details.

### Common Error Responses

#### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Resource not found"
}
```

#### 429 Too Many Requests

```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in 30 seconds."
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Best Practices

1. Always include the `Authorization` header for authenticated endpoints
2. Use appropriate content types for requests (`application/json` for JSON data, `multipart/form-data` for file uploads)
3. Handle rate limiting by implementing exponential backoff in your clients
4. For file uploads, ensure that file size doesn't exceed the server limits (10MB per file)
5. Implement proper error handling in your client applications
6. Use HTTPS for all production API calls
7. Don't hardcode authentication tokens in client-side code
