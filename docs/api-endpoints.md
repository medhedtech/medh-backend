# API Endpoints Documentation

Base URL: `/api/v1`

## Authentication
- POST `/auth/register` - Register a new user
- POST `/auth/login` - Login user
- POST `/auth/logout` - Logout user

## Categories
- GET `/categories` - Get all categories
- POST `/categories` - Create a new category
- GET `/categories/:id` - Get category by ID
- PUT `/categories/:id` - Update category
- DELETE `/categories/:id` - Delete category

## Courses
- GET `/courses` - Get all courses
- POST `/courses` - Create a new course
- GET `/courses/:id` - Get course by ID
- PUT `/courses/:id` - Update course
- DELETE `/courses/:id` - Delete course

## Students
- GET `/students` - Get all students
- POST `/students` - Create a new student
- GET `/students/:id` - Get student by ID
- PUT `/students/:id` - Update student
- DELETE `/students/:id` - Delete student

## Instructors
- GET `/instructors` - Get all instructors
- POST `/instructors` - Create a new instructor
- GET `/instructors/:id` - Get instructor by ID
- PUT `/instructors/:id` - Update instructor
- DELETE `/instructors/:id` - Delete instructor

## Certificates
- GET `/certificates` - Get all certificates
- POST `/certificates` - Create a new certificate
- GET `/certificates/:id` - Get certificate by ID

## Online Meetings
- GET `/online-meeting` - Get all meetings
- POST `/online-meeting` - Create a new meeting
- GET `/online-meeting/:id` - Get meeting by ID

## Enrollments
- GET `/enroll` - Get all enrollments
- POST `/enroll` - Create a new enrollment
- GET `/enroll/:id` - Get enrollment by ID

## Recorded Sessions
- GET `/recorded-sessions` - Get all recorded sessions
- POST `/recorded-sessions` - Create a new recorded session
- GET `/recorded-sessions/:id` - Get recorded session by ID

## File Upload
- POST `/upload` - Upload files

## Contact
- POST `/contact` - Send contact message

## Blogs
- GET `/blogs` - Get all blogs
- POST `/blogs` - Create a new blog
- GET `/blogs/:id` - Get blog by ID

## Dashboard
- GET `/dashboard/stats` - Get dashboard statistics

## Assignments
- GET `/assignments` - Get all assignments
- POST `/assignments` - Create a new assignment
- GET `/assignments/:id` - Get assignment by ID
- PUT `/assignments/:id` - Update assignment
- DELETE `/assignments/:id` - Delete assignment

## Quizzes
- GET `/quizes` - Get all quizzes
- POST `/quizes` - Create a new quiz
- GET `/quizes/:id` - Get quiz by ID
- PUT `/quizes/:id` - Update quiz
- DELETE `/quizes/:id` - Delete quiz

## Quiz Responses
- GET `/quizResponses` - Get all quiz responses
- POST `/quizResponses` - Submit a quiz response
- GET `/quizResponses/:id` - Get quiz response by ID

## Resources
- GET `/resources` - Get all resources
- POST `/resources` - Add a new resource
- GET `/resources/:id` - Get resource by ID

## Feedback
- GET `/feedback` - Get all feedback
- POST `/feedback` - Submit feedback
- GET `/feedback/:id` - Get feedback by ID

## Placements
- GET `/placements` - Get all placements
- POST `/placements` - Add a new placement
- GET `/placements/:id` - Get placement by ID

## Complaints
- GET `/complaint` - Get all complaints
- POST `/complaint` - Submit a complaint
- GET `/complaint/:id` - Get complaint by ID

## Grievances
- GET `/grievance` - Get all grievances
- POST `/grievance` - Submit a grievance
- GET `/grievance/:id` - Get grievance by ID

## Job Posts
- GET `/job-post` - Get all job posts
- POST `/job-post` - Create a new job post
- GET `/job-post/:id` - Get job post by ID

## Subscriptions
- GET `/subscription` - Get all subscriptions
- POST `/subscription` - Create a new subscription
- GET `/subscription/:id` - Get subscription by ID
- PUT `/subscription/:id` - Update subscription
- DELETE `/subscription/:id` - Delete subscription

## Newsletter
- POST `/newsletter/subscribe` - Subscribe to newsletter
- POST `/newsletter/unsubscribe` - Unsubscribe from newsletter

## Corporate Training
- GET `/corporate-training` - Get all corporate training programs
- POST `/corporate-training` - Create a new corporate training program
- GET `/corporate-training/:id` - Get corporate training by ID

## Session Tracking
- GET `/track-sessions` - Get all tracked sessions
- POST `/track-sessions` - Track a new session
- GET `/track-sessions/:id` - Get tracked session by ID 