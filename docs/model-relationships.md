# Model Relationships and User Flow Documentation

## Core Models and Their Relationships

This document outlines the connections between different models in the MEDH backend application. Understanding these relationships is crucial for developing new features and maintaining the existing codebase.

```mermaid
graph TD
    User[User] --> |enrolls in| Course
    User --> |creates| Blog
    User --> |submits| PlacementForm
    User --> |creates| Order

    Course[Course] --> |contains| Section
    Section --> |contains| Lesson
    Course --> |has many| Enrollment
    Course --> |has| FAQ
    Course --> |has many| Feedback

    Enrollment[Enrollment] --> |tracks| Progress
    Enrollment --> |issues| Certificate
    Enrollment --> |has many| Meeting

    Lesson[Lesson] --> |contains| Quiz
    Lesson --> |has many| Resource
    Lesson --> |has many| Assignment

    Meeting[Online Meeting] --> |records| RecordedSession

    Instructor[Instructor/User] --> |teaches| Course
    Instructor --> |conducts| Meeting

    Corporate[Corporate Training] --> |assigns| Course
    Corporate --> |has many| CorporateStudent

    CorporateStudent[Corporate Student/User] --> |enrolls in| Enrollment

    Assignment[Assignment] --> |has many| Submission
    Quiz[Quiz] --> |has many| QuizResponse

    Job[Job Post] --> |created by| User
    Job --> |receives| JobApplication
```

## User Flow Diagram

This diagram demonstrates how users interact with different models throughout their journey in the application:

```mermaid
sequenceDiagram
    participant Student
    participant Auth
    participant Course
    participant Enrollment
    participant Meeting
    participant Certificate

    Student->>Auth: Register/Login
    Auth-->>Student: Authentication Token

    Student->>Course: Browse Courses
    Course-->>Student: Available Courses

    Student->>Enrollment: Enroll in Course
    Enrollment-->>Student: Enrollment Confirmation

    Student->>Course: Access Course Materials
    Course-->>Student: Lessons, Quizzes, Assignments

    Student->>Meeting: Join Online Sessions
    Meeting-->>Student: Live Classes

    Student->>Enrollment: Complete Course
    Enrollment->>Certificate: Generate Certificate
    Certificate-->>Student: Course Completion Certificate
```

## Core Model Details

### User Model

- Connected to: Enrollment, Blog, PlacementForm, Order, Job
- Key fields:
  - `_id`: Unique identifier
  - `full_name`: User's full name
  - `email`: Email address (unique)
  - `password`: Hashed password
  - `role`: Array of roles (student, instructor, admin, corporate, corporate-student)
  - `permissions`: Array of permissions for admin users
  - `status`: Active or Inactive

### Course Model

- Connected to: Lesson, Enrollment, FAQ, Feedback, Section
- Key fields:
  - `_id`: Unique identifier
  - `title`: Course title
  - `description`: Course description
  - `price`: Course price
  - `instructor`: Reference to User model
  - `sections`: Array of course sections
  - `status`: Published, Draft, or Archived
  - `category`: Reference to Category model
  - `rating`: Average rating from feedback

### Enrollment Model

- Connected to: User, Course, Progress, Certificate, Meeting
- Key fields:
  - `_id`: Unique identifier
  - `user`: Reference to User model
  - `course`: Reference to Course model
  - `enrolled_date`: Date of enrollment
  - `status`: Active, Completed, or Cancelled
  - `payment_status`: Paid, Pending, or Free

### Lesson Model

- Connected to: Course, Quiz, Resource, Assignment
- Key fields:
  - `_id`: Unique identifier
  - `title`: Lesson title
  - `description`: Lesson description
  - `order`: Sequence in course
  - `type`: Video, Text, Quiz, or Assessment
  - `content`: Lesson content
  - `duration`: Length of lesson in minutes

## Service Layer Integration

The new service layer architecture connects these models more efficiently through:

1. **Specialized Services**: Each service handles specific business logic for a model or group of related models.
2. **Data Transformation**: Services convert between database models and API response formats.
3. **Relationship Management**: Services handle the complexities of model relationships.

Example of service flow:

```mermaid
graph LR
    Controller[Controller] --> |request| AuthService
    AuthService --> |validates user| UserService
    UserService --> |accesses| UserModel[User Model]

    Controller --> |request| CourseService
    CourseService --> |accesses| CourseModel[Course Model]
    CourseService --> |enrolls user| EnrollmentService
    EnrollmentService --> |creates| EnrollmentModel[Enrollment Model]
    EnrollmentService --> |notifies| NotificationService
    NotificationService --> |sends email| EmailService
```

## Best Practices for Model Interactions

1. **Always use service layer**: Never directly interact with models from controllers.
2. **Validate relationships**: When creating or updating related models, verify that the referenced models exist.
3. **Handle cascading operations**: Consider the impact on related models when performing operations like deletion.
4. **Optimize queries**: Use population strategically to avoid excessive database queries.
5. **Maintain consistency**: Ensure that operations maintain data consistency across related models.

By following these patterns and understanding the model relationships, developers can efficiently build new features and maintain the existing codebase.
