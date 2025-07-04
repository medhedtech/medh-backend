# Course Types Documentation Guide

## Table of Contents
1. [Overview](#overview)
2. [Common Base Fields](#common-base-fields)
3. [Live Course (live)](#live-course-live)
4. [Blended Course (blended)](#blended-course-blended)
5. [Free Course (free)](#free-course-free)
6. [Curriculum Structure](#curriculum-structure)
7. [Pricing Structure](#pricing-structure)
8. [Examples](#examples)
9. [Validation Rules](#validation-rules)
10. [Migration Notes](#migration-notes)

## Overview

The course types system supports three main course models that extend from a common `BaseCourse` schema:

- **Live Course (`live`)** - Real-time instructor-led courses with scheduled sessions
- **Blended Course (`blended`)** - Combination of self-paced and live instruction with doubt sessions
- **Free Course (`free`)** - Self-paced courses with unlimited or time-limited access

All course types inherit common fields from `BaseCourse` and add their own specific fields for specialized functionality.

## Common Base Fields

All course types inherit these fields from `BaseCourse`:

### Required Fields

#### `course_type` (String, Required)
- **Values**: `"live"`, `"blended"`, `"free"`
- **Purpose**: Defines the course delivery model and determines which specific schema to use
- **Validation**: Must be one of the three supported values
- **Business Logic**: 
  - `live`: Real-time instructor-led courses with scheduled sessions
  - `blended`: Self-paced content with live doubt sessions
  - `free`: Self-paced courses with optional time limits
- **Example**: `"live"`

#### `course_category` (String, Required)
- **Purpose**: Primary categorization for course organization and filtering
- **Validation**: Non-empty string, trimmed
- **Length**: Typically 3-50 characters
- **Examples**: `"Programming"`, `"Data Science"`, `"Web Development"`, `"Machine Learning"`
- **Use Cases**: Course filtering, category-based search, analytics
- **Indexing**: Indexed for fast filtering

#### `course_title` (String, Required)
- **Purpose**: Main course name displayed to users
- **Validation**: Non-empty string, trimmed
- **Length**: Recommended 10-100 characters
- **SEO Impact**: Used in meta titles and URLs
- **Examples**: 
  - `"Advanced JavaScript Development"`
  - `"Python Data Analysis Bootcamp"`
  - `"Complete Web Development Course"`
- **Business Rules**: Should be unique within category for better user experience

#### `course_level` (String, Required)
- **Values**: `"Beginner"`, `"Intermediate"`, `"Advanced"`, `"All Levels"`
- **Purpose**: Indicates the complexity and prerequisite knowledge required
- **Validation**: Must be one of the four predefined values
- **Use Cases**: 
  - Course filtering and recommendation
  - Setting user expectations
  - Prerequisite validation
- **Examples**:
  - `"Beginner"`: No prior knowledge required
  - `"Intermediate"`: Some background knowledge expected
  - `"Advanced"`: Significant experience required
  - `"All Levels"`: Suitable for any skill level

#### `course_image` (String, Required)
- **Purpose**: Primary visual representation of the course
- **Validation**: Must be a valid URL
- **Format**: HTTPS URLs preferred
- **Supported Types**: JPG, PNG, WebP
- **Recommended Size**: 1200x630px for social sharing
- **Examples**: 
  - `"https://cdn.example.com/courses/js-advanced.jpg"`
  - `"https://storage.amazonaws.com/course-images/python-data.png"`
- **CDN**: Should use CDN for performance
- **Alt Text**: Filename used for accessibility

#### `course_description` (Object, Required)
A comprehensive object containing all course description elements:

##### `program_overview` (String, Required)
- **Purpose**: Main course description explaining what the course covers
- **Length**: Recommended 100-500 characters
- **Format**: Plain text, supports basic HTML in display
- **SEO Impact**: Used in meta descriptions
- **Example**: `"Master advanced JavaScript concepts and modern development practices through hands-on projects and real-world applications"`

##### `benefits` (String, Required)
- **Purpose**: Clear value proposition explaining what students will gain
- **Length**: Recommended 50-300 characters
- **Format**: Can be structured as bullet points or paragraph
- **Example**: `"Build complex applications, understand async programming, learn modern frameworks, and develop production-ready skills"`

##### `learning_objectives` (Array of Strings, Optional)
- **Purpose**: Specific, measurable learning outcomes
- **Format**: Array of concise statements
- **Recommended Count**: 3-8 objectives
- **Structure**: Start with action verbs (Master, Build, Understand, Create)
- **Examples**:
  ```javascript
  [
    "Master ES6+ features and syntax",
    "Build full-stack applications with modern tools",
    "Understand advanced async programming patterns",
    "Create responsive user interfaces with React"
  ]
  ```

##### `course_requirements` (Array of Strings, Optional)
- **Purpose**: Prerequisites and technical requirements
- **Format**: Array of requirement statements
- **Categories**: Technical skills, software, hardware
- **Examples**:
  ```javascript
  [
    "Basic JavaScript knowledge (variables, functions, loops)",
    "HTML/CSS fundamentals",
    "Computer with internet connection",
    "Text editor or IDE installed"
  ]
  ```

##### `target_audience` (Array of Strings, Optional)
- **Purpose**: Defines who should take this course
- **Format**: Array of audience descriptions
- **Use Cases**: Marketing targeting, course recommendations
- **Examples**:
  ```javascript
  [
    "Intermediate developers looking to advance skills",
    "Frontend developers wanting to learn backend",
    "Computer science students",
    "Career changers entering tech"
  ]
  ```

```typescript
interface BaseCourseRequired {
  course_type: "live" | "blended" | "free";
  course_category: string;
  course_title: string;
  course_level: "Beginner" | "Intermediate" | "Advanced" | "All Levels";
  course_image: string;
  course_description: {
    program_overview: string;
    benefits: string;
    learning_objectives?: string[];
    course_requirements?: string[];
    target_audience?: string[];
  };
}
```

### Optional Fields

#### Core Optional Fields

##### `course_subcategory` (String, Optional)
- **Purpose**: More specific categorization within the main category
- **Default**: `null`
- **Length**: 3-50 characters
- **Examples**: 
  - Category: "Programming" → Subcategory: "Frontend Development"
  - Category: "Data Science" → Subcategory: "Machine Learning"
- **Use Cases**: Advanced filtering, specialized course recommendations
- **Hierarchy**: Creates category → subcategory relationships

##### `course_subtitle` (String, Optional)
- **Purpose**: Additional context or tagline for the course
- **Default**: `null`
- **Length**: 10-150 characters
- **Examples**: 
  - `"From Zero to Full-Stack Developer"`
  - `"Master Modern JavaScript with Real Projects"`
- **Display**: Often shown below main title in course cards
- **SEO**: Can be included in meta descriptions

##### `course_tag` (String, Optional)
- **Purpose**: Flexible tagging for course categorization and search
- **Format**: Comma-separated tags or single tag
- **Examples**: `"javascript,react,frontend"` or `"beginner-friendly"`
- **Use Cases**: Search enhancement, related course suggestions
- **Indexing**: Text-indexed for search functionality

##### `slug` (String, Optional, Auto-generated)
- **Purpose**: URL-friendly identifier for the course
- **Generation**: Auto-generated from course title if not provided
- **Format**: Lowercase, hyphen-separated, no special characters
- **Uniqueness**: Must be unique across all courses
- **Examples**: 
  - Title: "Advanced JavaScript Development" → Slug: `"advanced-javascript-development"`
- **Use Cases**: SEO-friendly URLs, course routing

##### `language` (String, Optional)
- **Default**: `"English"`
- **Purpose**: Course instruction language
- **Validation**: Should be a valid language name
- **Examples**: `"English"`, `"Spanish"`, `"French"`, `"Hindi"`
- **Use Cases**: Language-based filtering, international course offerings
- **Future**: Could be extended to support multiple languages per course

##### `course_grade` (String, Optional)
- **Purpose**: Academic grade level or professional level
- **Examples**: 
  - Academic: `"High School"`, `"Undergraduate"`, `"Graduate"`
  - Professional: `"Entry Level"`, `"Mid Level"`, `"Senior Level"`
- **Use Cases**: Academic program alignment, skill level matching

##### `brochures` (Array of Strings, Optional)
- **Purpose**: PDF brochures and course materials for download
- **Validation**: Each URL must be a valid PDF link
- **Supported Domains**: AWS S3, Google Drive, Dropbox, direct PDF links
- **Examples**:
  ```javascript
  [
    "https://example.com/course-brochure.pdf",
    "https://drive.google.com/file/d/abc123/view",
    "https://s3.amazonaws.com/courses/syllabus.pdf"
  ]
  ```
- **Security**: URLs should be publicly accessible or use secure tokens

##### `status` (String, Optional)
- **Values**: `"Draft"`, `"Published"`, `"Upcoming"`
- **Default**: `"Draft"`
- **Purpose**: Course publication and availability status
- **Validation**: Must be one of the three predefined values
- **Business Logic**:
  - `"Draft"`: Course is being created, not visible to students
  - `"Published"`: Course is live and available for enrollment
  - `"Upcoming"`: Course is scheduled for future release
- **Indexing**: Indexed for status-based filtering

#### Content Structure Fields

##### `curriculum` (Array of CurriculumWeek, Optional)
- **Purpose**: Week-based course curriculum structure
- **Inheritance**: Available to all course types
- **Structure**: Hierarchical weeks → sections → lessons
- **Auto-IDs**: Automatic ID generation for all elements
- **Validation**: Each week must have a title
- **Use Cases**: Course structure display, progress tracking
- **Details**: See [Curriculum Structure](#curriculum-structure) section

##### `prices` (Array of Price, Optional)
- **Purpose**: Multi-currency pricing configuration
- **Validation**: No duplicate currencies allowed
- **Structure**: Individual and batch pricing with discounts
- **Free Courses**: Empty array for free courses
- **Details**: See [Pricing Structure](#pricing-structure) section

##### `tools_technologies` (Array of ToolTechnology, Optional)
- **Purpose**: Technologies and tools covered in the course
- **Structure**:
  ```typescript
  interface ToolTechnology {
    name: string;                           // Required: "React", "Python"
    category?: "programming_language" | "framework" | "library" | "tool" | "platform" | "other";
    description?: string;                   // Optional: "UI library for building interfaces"
    logo_url?: string;                     // Optional: Technology logo
  }
  ```
- **Examples**:
  ```javascript
  [
    {
      name: "React",
      category: "framework",
      description: "UI library for building user interfaces",
      logo_url: "https://reactjs.org/logo.svg"
    },
    {
      name: "Node.js",
      category: "platform",
      description: "JavaScript runtime environment"
    }
  ]
  ```

##### `faqs` (Array of FAQ, Optional)
- **Purpose**: Frequently asked questions about the course
- **Structure**:
  ```typescript
  interface FAQ {
    question: string;                       // Required
    answer: string;                         // Required
    category?: string;                      // Optional: "enrollment", "content", "technical"
    order?: number;                         // Optional: Display order
  }
  ```
- **Use Cases**: Address common concerns, reduce support queries
- **Display**: Usually in collapsible format on course pages

##### `resource_pdfs` (Array of ResourcePDF, Optional)
- **Purpose**: Additional downloadable resources
- **Structure**:
  ```typescript
  interface ResourcePDF {
    title: string;                          // Required
    url: string;                           // Required: Valid PDF URL
    description?: string;                   // Optional
  }
  ```
- **Examples**:
  ```javascript
  [
    {
      title: "Course Handbook",
      url: "https://example.com/handbook.pdf",
      description: "Complete guide to course materials and policies"
    }
  ]
  ```

##### `bonus_modules` (Array of BonusModule, Optional)
- **Purpose**: Additional content beyond main curriculum
- **Structure**:
  ```typescript
  interface BonusModule {
    title: string;                          // Required
    description?: string;                   // Optional
    content: Array<{                        // Required
      type: "video" | "pdf" | "quiz" | "assignment";
      title: string;
      url: string;
      duration?: string;
    }>;
    order?: number;                         // Display order
  }
  ```

#### Assessment Fields

##### `final_evaluation` (Object, Optional)
- **Purpose**: End-of-course assessment configuration
- **Structure**:
  ```typescript
  interface FinalEvaluation {
    has_final_exam?: boolean;               // Default: false
    has_final_project?: boolean;            // Default: false
    final_exam?: {
      title?: string;
      description?: string;
      duration_minutes?: number;            // Exam duration
      passing_score?: number;               // 0-100, required score to pass
    };
    final_project?: {
      title?: string;
      description?: string;
      submission_deadline_days?: number;    // Days from course start
      evaluation_criteria?: string[];       // Assessment criteria
    };
  }
  ```

#### Legacy Compatibility Fields

##### `course_fee` (Number, Optional)
- **Purpose**: Legacy single-currency pricing
- **Migration**: Maps to prices array in new system
- **Validation**: Non-negative number
- **Deprecation**: Use `prices` array for new courses

##### `course_videos` (Array of Strings, Optional)
- **Purpose**: Legacy video URL storage
- **Migration**: Should be moved to curriculum structure
- **Validation**: Valid video URLs

##### `min_hours_per_week` / `max_hours_per_week` (Number, Optional)
- **Purpose**: Expected time commitment range
- **Validation**: 
  - Non-negative numbers
  - max_hours_per_week ≥ min_hours_per_week
- **Use Cases**: Setting student expectations, course planning

##### `session_duration` (String | Number, Optional)
- **Purpose**: Length of individual sessions
- **Formats**: 
  - String: `"2 hours"`, `"90 minutes"`
  - Number: Minutes (e.g., 120 for 2 hours)
- **Validation**: Positive value if numeric

##### `category_type` (String, Optional)
- **Values**: `"Paid"`, `"Live"`, `"Free"`
- **Purpose**: Legacy categorization system
- **Migration**: Maps to course_type and pricing

##### `isFree` (Boolean, Optional)
- **Purpose**: Legacy free course indicator
- **Auto-set**: Based on pricing array (empty = free)
- **Default**: `false`

##### `assigned_instructor` (ObjectId, Optional)
- **Purpose**: Single instructor assignment (legacy)
- **References**: User model with instructor role
- **Migration**: Use type-specific instructor arrays for new courses

##### `class_type` (String, Optional)
- **Purpose**: Legacy class categorization
- **Examples**: `"Live Courses"`, `"Blended Courses"`, `"Self-Paced"`
- **Migration**: Maps to course_type

##### Feature Flags (Legacy)
- **`is_Certification`**: `"Yes"` | `"No"` - Certification availability
- **`is_Assignments`**: `"Yes"` | `"No"` - Assignment availability  
- **`is_Projects`**: `"Yes"` | `"No"` - Project-based learning
- **`is_Quizes`**: `"Yes"` | `"No"` - Quiz availability
- **Purpose**: Legacy feature tracking
- **Migration**: Use structured assessment objects in new system

```typescript
interface BaseCourseOptional {
  // Core optional fields
  course_subcategory?: string;
  course_subtitle?: string;
  course_tag?: string;
  slug?: string;
  language?: string;
  course_grade?: string;
  brochures?: string[];
  status?: "Draft" | "Published" | "Upcoming";
  
  // Content structure
  curriculum?: CurriculumWeek[];
  prices?: Price[];
  tools_technologies?: ToolTechnology[];
  faqs?: FAQ[];
  resource_pdfs?: ResourcePDF[];
  bonus_modules?: BonusModule[];
  
  // Assessment
  final_evaluation?: FinalEvaluation;
  
  // Legacy compatibility
  course_fee?: number;
  course_videos?: string[];
  min_hours_per_week?: number;
  max_hours_per_week?: number;
  session_duration?: string | number;
  category_type?: "Paid" | "Live" | "Free";
  isFree?: boolean;
  assigned_instructor?: ObjectId;
  class_type?: string;
  is_Certification?: "Yes" | "No";
  is_Assignments?: "Yes" | "No";
  is_Projects?: "Yes" | "No";
  is_Quizes?: "Yes" | "No";
}
```

## Live Course (live)

Live courses are real-time, instructor-led courses with scheduled sessions and interactive elements. They provide synchronous learning experiences with direct instructor interaction and peer collaboration.

### Specific Required Fields

#### `course_schedule` (Object, Required)
The scheduling configuration for live course sessions:

##### `start_date` (Date, Required)
- **Purpose**: When the course begins
- **Validation**: Must be a valid future date
- **Format**: ISO 8601 date format
- **Business Logic**: Should be at least 1 day in the future for new courses
- **Example**: `new Date("2024-02-01T00:00:00Z")`
- **Use Cases**: Enrollment deadlines, course calendar integration

##### `end_date` (Date, Required)
- **Purpose**: When the course concludes
- **Validation**: Must be after start_date
- **Calculation**: Often calculated from start_date + total_sessions + schedule
- **Example**: `new Date("2024-04-01T00:00:00Z")`
- **Business Logic**: Determines course duration and certificate issuance

##### `session_days` (Array of Strings, Required)
- **Purpose**: Days of the week when sessions occur
- **Values**: `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]`
- **Validation**: Must contain at least one valid day
- **Examples**:
  - `["Monday", "Wednesday", "Friday"]` - MWF schedule
  - `["Saturday"]` - Weekend intensive
  - `["Tuesday", "Thursday"]` - Bi-weekly schedule
- **Use Cases**: Calendar integration, scheduling conflicts detection

##### `session_time` (String, Required)
- **Purpose**: Time range for each session
- **Format**: Human-readable time range
- **Examples**: 
  - `"7:00 PM - 9:00 PM"`
  - `"10:00 AM - 12:00 PM"`
  - `"6:30 PM - 8:30 PM"`
- **Validation**: Must be a valid time range format
- **Time Zone**: Interpreted in the specified timezone

##### `timezone` (String, Required)
- **Purpose**: Time zone for all course sessions
- **Format**: IANA time zone identifiers
- **Examples**: 
  - `"America/New_York"` (EST/EDT)
  - `"UTC"` (Coordinated Universal Time)
  - `"Asia/Kolkata"` (IST)
  - `"Europe/London"` (GMT/BST)
- **Validation**: Must be a valid IANA timezone
- **Use Cases**: Automatic local time conversion for students

#### `total_sessions` (Number, Required)
- **Purpose**: Total number of live sessions in the course
- **Validation**: Minimum value: 1
- **Typical Range**: 8-20 sessions for most courses
- **Calculation**: Should align with course duration and schedule
- **Examples**:
  - 8 sessions for a 4-week course (2 sessions/week)
  - 16 sessions for an 8-week course (2 sessions/week)
- **Use Cases**: Progress tracking, course completion calculation

#### `max_students` (Number, Required)
- **Purpose**: Maximum enrollment capacity for the course
- **Validation**: Minimum value: 1
- **Typical Range**: 10-50 students depending on course type
- **Business Logic**: 
  - Affects instructor workload
  - Impacts interaction quality
  - Determines pricing strategies
- **Examples**:
  - 15 students for intensive coding bootcamps
  - 30 students for lecture-style courses
  - 8 students for hands-on workshops
- **Use Cases**: Enrollment management, waitlist functionality

#### `modules` (Array of LiveModule, Required)
- **Purpose**: Organizational units containing live sessions
- **Validation**: Must contain at least one module
- **Structure**: Each module groups related sessions together
- **Auto-IDs**: Automatic ID generation for modules
- **Use Cases**: Course organization, progress tracking
- **Details**: See [Live Module Structure](#live-module-structure) section

### Specific Optional Fields

#### `session_duration` (String | Number, Optional)
- **Purpose**: Duration of each individual session
- **Formats**:
  - **String**: `"2 hours"`, `"90 minutes"`, `"1.5 hours"`
  - **Number**: Minutes (e.g., 120 for 2 hours)
- **Validation**: 
  - Positive value if numeric
  - Minimum 15 minutes if numeric
- **Default**: Calculated from session_time if not provided
- **Use Cases**: Calendar blocking, instructor scheduling

#### `instructors` (Array of ObjectId, Optional)
- **Purpose**: Multiple instructor assignments for the course
- **References**: User documents with instructor role
- **Structure**: Array allows for multiple instructors
- **Validation**: Each ID must reference a valid instructor user
- **Examples**:
  ```javascript
  [
    ObjectId("instructor_id_1"),  // Lead instructor
    ObjectId("instructor_id_2"),  // Subject matter expert
    ObjectId("instructor_id_3")   // Teaching assistant
  ]
  ```
- **Use Cases**: Team teaching, specialized topics, backup instructors

#### `prerequisites` (Array of Strings, Optional)
- **Purpose**: Course-specific prerequisites beyond base requirements
- **Format**: Array of prerequisite statements
- **Examples**:
  ```javascript
  [
    "Basic programming knowledge",
    "Completed Intro to JavaScript course",
    "Computer with webcam and microphone",
    "Familiarity with command line interface"
  ]
  ```
- **Use Cases**: Enrollment validation, setting expectations

#### `certification` (Object, Optional)
- **Purpose**: Certification requirements and configuration
- **Structure**:
  ```typescript
  interface Certification {
    is_certified?: boolean;                 // Default: true
    attendance_required?: number;           // 0-100%, default: 80
  }
  ```

##### `is_certified` (Boolean, Optional)
- **Default**: `true`
- **Purpose**: Whether course offers certification upon completion
- **Business Logic**: Affects course marketing and pricing
- **Use Cases**: Student motivation, professional development

##### `attendance_required` (Number, Optional)
- **Default**: `80`
- **Range**: 0-100 (percentage)
- **Purpose**: Minimum attendance required for certification
- **Validation**: Must be between 0 and 100
- **Examples**:
  - `80` - Must attend 80% of sessions
  - `100` - Perfect attendance required
  - `60` - More flexible for working professionals
- **Use Cases**: Certification logic, attendance tracking

```typescript
interface LiveCourseRequired {
  course_schedule: {
    start_date: Date;
    end_date: Date;
    session_days: string[];
    session_time: string;
    timezone: string;
  };
  total_sessions: number;
  max_students: number;
  modules: LiveModule[];
}

interface LiveCourseOptional {
  session_duration?: string | number;
  instructors?: ObjectId[];
  prerequisites?: string[];
  certification?: {
    is_certified?: boolean;
    attendance_required?: number;
  };
}
```

### Live Module Structure

```typescript
interface LiveModule {
  title: string;                             // Required
  description: string;                       // Required
  order: number;                             // Required
  sessions: LiveSession[];                   // Live sessions in this module
  resources: ModuleResource[];               // Module resources
}

interface LiveSession {
  title: string;                             // Required
  description: string;                       // Required
  date: Date;                                // Required
  duration: number;                          // Min: 15 minutes
  meeting_link?: string;                     // Zoom/Teams link
  instructor: ObjectId;                      // Required
  recording_url?: string;                    // Post-session recording
  is_recorded?: boolean;                     // Default: false
  materials?: SessionMaterial[];             // Session materials
  prerequisites?: string[];                  // Session prerequisites
}
```

### Live Course Example

```javascript
const liveCourseExample = {
  // Base required fields
  course_type: "live",
  course_category: "Programming",
  course_title: "Advanced JavaScript Development",
  course_level: "Advanced",
  course_image: "https://example.com/js-course.jpg",
  course_description: {
    program_overview: "Master advanced JavaScript concepts and modern development practices",
    benefits: "Build complex applications, understand async programming, learn modern frameworks",
    learning_objectives: [
      "Master ES6+ features and syntax",
      "Build full-stack applications",
      "Understand advanced async patterns"
    ],
    course_requirements: ["Basic JavaScript knowledge", "HTML/CSS fundamentals"],
    target_audience: ["Intermediate developers", "Frontend developers", "Full-stack developers"]
  },
  
  // Live-specific required fields
  course_schedule: {
    start_date: new Date("2024-02-01"),
    end_date: new Date("2024-04-01"),
    session_days: ["Tuesday", "Thursday"],
    session_time: "7:00 PM - 9:00 PM",
    timezone: "America/New_York"
  },
  total_sessions: 16,
  max_students: 25,
  modules: [
    {
      title: "Advanced JavaScript Concepts",
      description: "Deep dive into modern JavaScript features",
      order: 1,
      sessions: [
        {
          title: "Async/Await and Promises",
          description: "Master asynchronous JavaScript programming",
          date: new Date("2024-02-01T19:00:00Z"),
          duration: 120,
          instructor: "instructor_id_here",
          materials: [
            {
              title: "Async Programming Slides",
              file_url: "https://example.com/async-slides.pdf",
              type: "presentation"
            }
          ]
        }
      ],
      resources: [
        {
          title: "JavaScript Reference Guide",
          file_url: "https://example.com/js-reference.pdf",
          type: "document"
        }
      ]
    }
  ],
  
  // Optional fields
  session_duration: 120,
  instructors: ["instructor_id_1", "instructor_id_2"],
  prerequisites: ["Basic programming knowledge", "Computer with internet"],
  certification: {
    is_certified: true,
    attendance_required: 80
  },
  
  // Pricing
  prices: [
    {
      currency: "USD",
      individual: 599,
      batch: 499,
      min_batch_size: 5,
      max_batch_size: 15,
      early_bird_discount: 15,
      group_discount: 20,
      is_active: true
    }
  ],
  
  // Additional content
  tools_technologies: [
    {
      name: "Node.js",
      category: "platform",
      description: "JavaScript runtime environment"
    },
    {
      name: "React",
      category: "framework",
      description: "UI library for building interfaces"
    }
  ],
  
  status: "Published"
};
```

## Blended Course (blended)

Blended courses combine self-paced learning with scheduled doubt sessions and instructor support.

### Specific Required Fields

```typescript
interface BlendedCourseRequired {
  course_duration: string;                   // "8 weeks", "3 months"
  session_duration: string;                  // "2 hours", "90 minutes"
  doubt_session_schedule: {
    frequency: "daily" | "weekly" | "bi-weekly" | "monthly" | "on-demand";
    preferred_days?: string[];               // Days of the week
    preferred_time_slots?: TimeSlot[];       // Available time slots
  };
}
```

### Additional Validation
- Must have either `curriculum` (inherited) OR `course_modules` with content

### Specific Optional Fields

```typescript
interface BlendedCourseOptional {
  course_modules?: CurriculumSection[];      // Blended-specific modules
}

interface CurriculumSection {
  id?: string;                               // Auto-generated
  title: string;                             // Required
  description?: string;                      // Optional
  order: number;                             // Required, min: 0
  lessons: SectionLesson[];                  // Lessons in this section
  resources: SectionResource[];              // Section resources
}

interface TimeSlot {
  start_time: string;                        // Required, "2:00 PM"
  end_time: string;                          // Required, "4:00 PM"
  timezone: string;                          // Required, "UTC"
}
```

### Blended Course Example

```javascript
const blendedCourseExample = {
  // Base required fields
  course_type: "blended",
  course_category: "Data Science",
  course_title: "Python Data Analysis Bootcamp",
  course_level: "Intermediate",
  course_image: "https://example.com/python-data.jpg",
  course_description: {
    program_overview: "Learn data analysis with Python through self-paced modules and live doubt sessions",
    benefits: "Master pandas, numpy, matplotlib, and real-world data analysis",
    learning_objectives: [
      "Analyze data with pandas and numpy",
      "Create visualizations with matplotlib and seaborn",
      "Build data analysis projects"
    ],
    course_requirements: ["Basic Python knowledge", "Statistics fundamentals"],
    target_audience: ["Python developers", "Data analysts", "Business analysts"]
  },
  
  // Blended-specific required fields
  course_duration: "10 weeks",
  session_duration: "90 minutes",
  doubt_session_schedule: {
    frequency: "weekly",
    preferred_days: ["Saturday", "Sunday"],
    preferred_time_slots: [
      {
        start_time: "10:00 AM",
        end_time: "11:30 AM",
        timezone: "America/New_York"
      },
      {
        start_time: "2:00 PM",
        end_time: "3:30 PM",
        timezone: "America/New_York"
      }
    ]
  },
  
  // Course modules (alternative to curriculum)
  course_modules: [
    {
      title: "Data Manipulation with Pandas",
      description: "Learn to clean, transform, and analyze data",
      order: 1,
      lessons: [
        {
          title: "Introduction to Pandas",
          description: "Getting started with pandas library",
          duration: 45,
          content_type: "video",
          content_url: "https://example.com/pandas-intro.mp4",
          is_preview: true,
          order: 1
        },
        {
          title: "Data Cleaning Techniques",
          description: "Handle missing data and outliers",
          duration: 60,
          content_type: "video",
          content_url: "https://example.com/data-cleaning.mp4",
          is_preview: false,
          order: 2
        }
      ],
      resources: [
        {
          title: "Pandas Cheat Sheet",
          description: "Quick reference for pandas functions",
          fileUrl: "https://example.com/pandas-cheat-sheet.pdf",
          type: "pdf"
        }
      ]
    }
  ],
  
  // Pricing
  prices: [
    {
      currency: "USD",
      individual: 299,
      batch: 249,
      min_batch_size: 3,
      max_batch_size: 12,
      early_bird_discount: 10,
      group_discount: 15,
      is_active: true
    }
  ],
  
  // Additional content
  tools_technologies: [
    {
      name: "Python",
      category: "programming_language",
      description: "Programming language for data analysis"
    },
    {
      name: "Jupyter Notebook",
      category: "tool",
      description: "Interactive development environment"
    }
  ],
  
  status: "Published"
};
```

## Free Course (free)

Free courses are self-paced with optional time limits and completion certificates. They provide accessible learning opportunities without financial barriers, often serving as introductory content or community resources.

### Specific Required Fields

#### `estimated_duration` (String, Required)
- **Purpose**: Estimated time to complete the entire course
- **Format**: Human-readable duration string
- **Examples**:
  - `"4 hours"` - Short introductory course
  - `"2 weeks"` - Medium-length course with daily practice
  - `"1 month"` - Comprehensive self-paced course
  - `"6-8 hours"` - Range for flexibility
- **Validation**: Non-empty string
- **Use Cases**: 
  - Setting student expectations
  - Course comparison and filtering
  - Learning path planning
- **Business Logic**: Should align with actual lesson content and duration

#### `lessons` (Array of FreeLesson, Required)
- **Purpose**: Individual learning units that make up the course
- **Validation**: Must contain at least one lesson
- **Structure**: Sequential lessons with various content types
- **Auto-IDs**: Automatic ID generation for lessons
- **Progress Tracking**: Used for completion percentage calculation
- **Details**: See [Free Lesson Structure](#free-lesson-structure) section

### Specific Optional Fields

#### `resources` (Array of FreeCourseResource, Optional)
- **Purpose**: Additional materials beyond core lessons
- **Structure**: Downloadable or external resources
- **Types**: PDFs, links, videos, other materials
- **Use Cases**: Reference materials, practice exercises, supplementary content
- **Details**: See [Free Course Resource Structure](#free-course-resource-structure) section

#### `access_type` (String, Optional)
- **Values**: `"unlimited"`, `"time-limited"`
- **Default**: `"unlimited"`
- **Purpose**: Defines how long students can access the course
- **Business Logic**:
  - `"unlimited"`: Permanent access to course content
  - `"time-limited"`: Access expires after specified duration
- **Use Cases**: 
  - Course monetization strategies
  - Limited-time promotional courses
  - Trial versions of paid content

#### `access_duration` (Number, Optional)
- **Purpose**: Number of days before access expires
- **Required When**: `access_type` is set to `"time-limited"`
- **Validation**: 
  - Minimum value: 1 day
  - Must be positive integer
- **Examples**:
  - `7` - One week access
  - `30` - One month access
  - `90` - Three month access
- **Business Logic**: Countdown starts from enrollment date
- **Use Cases**: Trial periods, promotional campaigns

#### `prerequisites` (Array of Strings, Optional)
- **Purpose**: Knowledge or skills required before starting the course
- **Format**: Array of prerequisite statements
- **Examples**:
  ```javascript
  [
    "Basic computer literacy",
    "No prior programming experience needed",
    "Willingness to learn",
    "High school mathematics"
  ]
  ```
- **Use Cases**: Setting proper expectations, course recommendations

#### `target_skills` (Array of Strings, Optional)
- **Purpose**: Specific skills students will acquire
- **Format**: Array of skill names or descriptions
- **Examples**:
  ```javascript
  [
    "HTML markup",
    "CSS styling",
    "Responsive design",
    "Web development fundamentals"
  ]
  ```
- **Use Cases**: 
  - Skill-based course recommendations
  - Learning path construction
  - Resume building guidance

#### `completion_certificate` (Object, Optional)
- **Purpose**: Configuration for course completion certificates
- **Structure**:
  ```typescript
  interface CompletionCertificate {
    is_available?: boolean;                  // Default: false
    requirements?: {
      min_lessons_completed?: number;        // 0-100%, default: 100
    };
  }
  ```

##### `is_available` (Boolean, Optional)
- **Default**: `false`
- **Purpose**: Whether certificate is offered upon completion
- **Business Logic**: Affects course value proposition and student motivation
- **Use Cases**: Professional development, portfolio building

##### `requirements.min_lessons_completed` (Number, Optional)
- **Default**: `100`
- **Range**: 0-100 (percentage)
- **Purpose**: Minimum lesson completion required for certificate
- **Validation**: Must be between 0 and 100
- **Examples**:
  - `100` - Must complete all lessons
  - `80` - Must complete 80% of lessons
  - `90` - Must complete 90% of lessons
- **Use Cases**: Certificate eligibility logic, progress tracking

### Free Lesson Structure

#### `title` (String, Required)
- **Purpose**: Name of the individual lesson
- **Length**: Recommended 5-100 characters
- **Examples**: 
  - `"Introduction to HTML"`
  - `"CSS Basics and Selectors"`
  - `"Building Your First Webpage"`
- **Use Cases**: Lesson navigation, progress tracking

#### `description` (String, Required)
- **Purpose**: Detailed explanation of lesson content
- **Length**: Recommended 20-500 characters
- **Examples**: 
  - `"Learn HTML basics and document structure"`
  - `"Understand CSS selectors and how to style elements"`
- **Use Cases**: Lesson preview, content organization

#### `content_type` (String, Required)
- **Values**: `"video"`, `"text"`, `"pdf"`, `"link"`
- **Purpose**: Defines the format of the lesson content
- **Validation**: Must be one of the four supported types
- **Business Logic**:
  - `"video"`: Requires duration field
  - `"text"`: Content stored as text/HTML
  - `"pdf"`: Content is a PDF document URL
  - `"link"`: External resource link

#### `content` (String, Required)
- **Purpose**: The actual content or URL for the lesson
- **Format Varies by Type**:
  - **Video**: Video file URL or streaming link
  - **Text**: HTML content or plain text
  - **PDF**: Direct link to PDF file
  - **Link**: External website or resource URL
- **Examples**:
  ```javascript
  // Video lesson
  content: "https://example.com/videos/html-intro.mp4"
  
  // Text lesson
  content: "<h2>HTML Basics</h2><p>HTML stands for...</p>"
  
  // PDF lesson
  content: "https://example.com/pdfs/css-guide.pdf"
  
  // Link lesson
  content: "https://developer.mozilla.org/en-US/docs/Web/HTML"
  ```

#### `duration` (Number, Optional)
- **Purpose**: Length of the lesson in minutes
- **Required When**: `content_type` is `"video"`
- **Validation**: 
  - Positive number
  - Minimum: 1 minute for videos
- **Examples**:
  - `15` - 15-minute video lesson
  - `45` - 45-minute comprehensive video
- **Use Cases**: Progress estimation, course planning

#### `order` (Number, Required)
- **Purpose**: Sequential order of lessons within the course
- **Validation**: 
  - Positive integer
  - Should be unique within the course
- **Examples**: `1`, `2`, `3`, `4`
- **Use Cases**: Lesson sequencing, progress tracking, navigation

#### `is_preview` (Boolean, Optional)
- **Default**: `true`
- **Purpose**: Whether lesson is accessible without enrollment
- **Business Logic**: 
  - `true`: Available as course preview
  - `false`: Requires course enrollment
- **Use Cases**: Course marketing, free samples, enrollment incentives

### Free Course Resource Structure

#### `title` (String, Required)
- **Purpose**: Name of the resource
- **Examples**: 
  - `"HTML Reference Guide"`
  - `"Practice Exercises"`
  - `"Additional Reading"`

#### `description` (String, Optional)
- **Purpose**: Description of what the resource contains
- **Examples**: 
  - `"Complete HTML element reference"`
  - `"Hands-on coding exercises"`

#### `url` (String, Required)
- **Purpose**: Direct link to the resource
- **Validation**: Must be a valid URL
- **Examples**: 
  - `"https://example.com/html-reference.pdf"`
  - `"https://codepen.io/exercises"`

#### `type` (String, Optional)
- **Values**: `"pdf"`, `"link"`, `"video"`, `"other"`
- **Default**: `"other"`
- **Purpose**: Categorizes the resource type
- **Use Cases**: Resource filtering, appropriate display icons

```typescript
interface FreeCourseRequired {
  estimated_duration: string;
  lessons: FreeLesson[];
}

interface FreeCourseOptional {
  resources?: FreeCourseResource[];
  access_type?: "unlimited" | "time-limited";
  access_duration?: number;
  prerequisites?: string[];
  target_skills?: string[];
  completion_certificate?: {
    is_available?: boolean;
    requirements?: {
      min_lessons_completed?: number;
    };
  };
}

interface FreeLesson {
  title: string;
  description: string;
  content_type: "video" | "text" | "pdf" | "link";
  content: string;
  duration?: number;
  order: number;
  is_preview?: boolean;
}

interface FreeCourseResource {
  title: string;
  description?: string;
  url: string;
  type?: "pdf" | "link" | "video" | "other";
}
```

### Free Course Example

```javascript
const freeCourseExample = {
  // Base required fields
  course_type: "free",
  course_category: "Web Development",
  course_title: "HTML & CSS Fundamentals",
  course_level: "Beginner",
  course_image: "https://example.com/html-css.jpg",
  course_description: {
    program_overview: "Learn the basics of HTML and CSS to build your first websites",
    benefits: "Create responsive websites, understand web structure, style with CSS",
    learning_objectives: [
      "Write semantic HTML markup",
      "Style websites with CSS",
      "Create responsive layouts"
    ],
    course_requirements: ["Basic computer knowledge", "Text editor"],
    target_audience: ["Complete beginners", "Career changers", "Students"]
  },
  
  // Free-specific required fields
  estimated_duration: "6 hours",
  lessons: [
    {
      title: "Introduction to HTML",
      description: "Learn HTML basics and document structure",
      content_type: "video",
      content: "https://example.com/html-intro.mp4",
      duration: 30,
      order: 1,
      is_preview: true
    },
    {
      title: "HTML Elements and Tags",
      description: "Common HTML elements and their usage",
      content_type: "video",
      content: "https://example.com/html-elements.mp4",
      duration: 45,
      order: 2,
      is_preview: false
    },
    {
      title: "CSS Basics",
      description: "Introduction to CSS styling",
      content_type: "video",
      content: "https://example.com/css-basics.mp4",
      duration: 40,
      order: 3,
      is_preview: false
    },
    {
      title: "CSS Layout",
      description: "Creating layouts with CSS",
      content_type: "pdf",
      content: "https://example.com/css-layout-guide.pdf",
      order: 4,
      is_preview: false
    }
  ],
  
  // Free-specific optional fields
  resources: [
    {
      title: "HTML Reference Guide",
      description: "Complete HTML element reference",
      url: "https://example.com/html-reference.pdf",
      type: "pdf"
    },
    {
      title: "CSS Properties Cheat Sheet",
      description: "Quick reference for CSS properties",
      url: "https://example.com/css-cheat-sheet.pdf",
      type: "pdf"
    },
    {
      title: "Practice Exercises",
      description: "Hands-on coding exercises",
      url: "https://example.com/exercises",
      type: "link"
    }
  ],
  
  access_type: "unlimited",
  prerequisites: ["None"],
  target_skills: ["HTML", "CSS", "Web Development"],
  
  completion_certificate: {
    is_available: true,
    requirements: {
      min_lessons_completed: 100
    }
  },
  
  // No pricing for free courses
  prices: [],
  
  // Additional content
  tools_technologies: [
    {
      name: "HTML",
      category: "programming_language",
      description: "Markup language for web pages"
    },
    {
      name: "CSS",
      category: "programming_language",
      description: "Styling language for web pages"
    }
  ],
  
  status: "Published"
};
```

## Curriculum Structure

All course types inherit a week-based curriculum structure from `BaseCourse`:

### Curriculum Week Structure

```typescript
interface CurriculumWeek {
  id?: string;                               // Auto-generated: "week_1", "week_2"
  weekTitle: string;                         // Required
  weekDescription?: string;                  // Optional
  topics?: string[];                         // Week topics
  lessons?: CurriculumLesson[];              // Direct lessons under week
  liveClasses?: LiveClass[];                 // Live classes for this week
  sections?: CurriculumSection[];            // Organized sections within week
}

interface CurriculumLesson {
  id?: string;                               // Auto-generated: "lesson_w1_1"
  title: string;                             // Required
  description?: string;                      // Optional
  duration: number;                          // Required (minutes)
  content_type: "video" | "document" | "quiz" | "assignment"; // Required
  content_url?: string;                      // Content URL
  is_preview?: boolean;                      // Default: false
  order: number;                             // Required
  resources?: LessonResource[];              // Lesson resources
}

interface LiveClass {
  id?: string;                               // Auto-generated: "live_w1_1"
  title: string;                             // Required
  description?: string;                      // Optional
  scheduled_at: Date;                        // Required
  duration: number;                          // Required (minutes)
  instructor?: ObjectId;                     // Optional
  meeting_link?: string;                     // Optional
  order: number;                             // Required
}
```

### Curriculum Example

```javascript
const curriculumExample = [
  {
    weekTitle: "Foundation Week",
    weekDescription: "Introduction to core concepts",
    topics: ["Basic concepts", "Setup", "First project"],
    lessons: [
      {
        title: "Course Introduction",
        description: "Welcome and overview",
        duration: 15,
        content_type: "video",
        content_url: "https://example.com/intro.mp4",
        is_preview: true,
        order: 1
      }
    ],
    liveClasses: [
      {
        title: "Welcome Session",
        description: "Meet your instructor and classmates",
        scheduled_at: new Date("2024-02-01T19:00:00Z"),
        duration: 60,
        order: 1
      }
    ],
    sections: [
      {
        title: "Getting Started",
        description: "Initial setup and basics",
        order: 1,
        lessons: [
          {
            title: "Environment Setup",
            duration: 30,
            content_type: "document",
            content_url: "https://example.com/setup.pdf",
            order: 1
          }
        ]
      }
    ]
  }
];
```

## Pricing Structure

All course types use the same comprehensive pricing structure that supports multiple currencies, individual and batch pricing, and various discount mechanisms.

### Price Object Fields

#### `currency` (String, Required)
- **Values**: `"USD"`, `"EUR"`, `"INR"`, `"GBP"`, `"AUD"`, `"CAD"`
- **Purpose**: Currency for all pricing in this price object
- **Validation**: Must be one of the supported currency codes
- **Uniqueness**: Only one price object per currency per course
- **Examples**:
  - `"USD"` - US Dollar
  - `"EUR"` - Euro
  - `"INR"` - Indian Rupee
  - `"GBP"` - British Pound
  - `"AUD"` - Australian Dollar
  - `"CAD"` - Canadian Dollar
- **Use Cases**: Multi-regional pricing, currency-specific displays

#### `individual` (Number, Required)
- **Purpose**: Price for individual student enrollment
- **Validation**: 
  - Minimum value: 0
  - Must be a non-negative number
- **Format**: Base currency unit (e.g., dollars, not cents)
- **Examples**:
  - `299` - $299 for USD
  - `24999` - ₹24,999 for INR
  - `0` - Free course (though empty prices array preferred)
- **Use Cases**: Standard single-student pricing, default pricing display

#### `batch` (Number, Required)
- **Purpose**: Price per student when enrolling as a batch/group
- **Validation**: 
  - Minimum value: 0
  - Should typically be less than or equal to individual price
- **Business Logic**: Encourages group enrollments
- **Examples**:
  - `249` - $249 per student in batch (vs $299 individual)
  - `19999` - ₹19,999 per student in batch
- **Use Cases**: Corporate training, group discounts, bulk enrollment

#### `min_batch_size` (Number, Required)
- **Purpose**: Minimum number of students required for batch pricing
- **Default**: `2`
- **Validation**: 
  - Minimum value: 2
  - Must be less than or equal to max_batch_size
- **Examples**:
  - `3` - Need at least 3 students for batch rate
  - `5` - Minimum 5 students for corporate discount
- **Use Cases**: Batch enrollment validation, pricing tier determination

#### `max_batch_size` (Number, Required)
- **Purpose**: Maximum number of students allowed in a single batch
- **Default**: `10`
- **Validation**: 
  - Minimum value: 2
  - Must be greater than or equal to min_batch_size
- **Business Logic**: Limits batch size to maintain quality
- **Examples**:
  - `10` - Maximum 10 students per batch
  - `20` - Larger batches for lecture-style courses
- **Use Cases**: Course capacity management, instructor workload control

#### `early_bird_discount` (Number, Required)
- **Purpose**: Percentage discount for early enrollments
- **Default**: `0`
- **Range**: 0-100 (percentage)
- **Validation**: Must be between 0 and 100
- **Application**: Applied to both individual and batch prices
- **Examples**:
  - `15` - 15% discount for early enrollment
  - `25` - 25% early bird special
  - `0` - No early bird discount
- **Use Cases**: 
  - Pre-launch course promotion
  - Encouraging early commitment
  - Revenue forecasting

#### `group_discount` (Number, Required)
- **Purpose**: Additional percentage discount for group enrollments
- **Default**: `0`
- **Range**: 0-100 (percentage)
- **Validation**: Must be between 0 and 100
- **Application**: Applied on top of batch pricing
- **Stacking**: Can combine with early bird discount
- **Examples**:
  - `20` - Additional 20% off batch pricing
  - `10` - 10% group discount
- **Use Cases**: Corporate partnerships, educational institutions

#### `is_active` (Boolean, Required)
- **Purpose**: Whether this pricing is currently available
- **Default**: `true`
- **Values**: 
  - `true` - Pricing is active and available
  - `false` - Pricing is disabled (historical/future pricing)
- **Use Cases**: 
  - Seasonal pricing changes
  - Promotional period management
  - A/B testing different price points
  - Temporary pricing suspension

### Pricing Structure Definition

```typescript
interface Price {
  currency: "USD" | "EUR" | "INR" | "GBP" | "AUD" | "CAD";
  individual: number;
  batch: number;
  min_batch_size: number;
  max_batch_size: number;
  early_bird_discount: number;
  group_discount: number;
  is_active: boolean;
}
```

### Pricing Calculation Examples

#### Example 1: Individual Enrollment
```javascript
const pricing = {
  currency: "USD",
  individual: 299,
  early_bird_discount: 15,
  is_active: true
};

// Early bird calculation:
// $299 - (15% of $299) = $299 - $44.85 = $254.15
```

#### Example 2: Batch Enrollment with Stacked Discounts
```javascript
const pricing = {
  currency: "USD",
  batch: 249,            // Base batch price per student
  early_bird_discount: 15,  // 15% early bird
  group_discount: 20,       // Additional 20% group discount
  is_active: true
};

// Calculation for 5 students:
// 1. Start with batch price: $249 per student
// 2. Apply early bird discount: $249 - 15% = $211.65
// 3. Apply group discount: $211.65 - 20% = $169.32 per student
// 4. Total for 5 students: $169.32 × 5 = $846.60
```

### Pricing Examples

#### Multi-Currency Pricing for Paid Courses
```javascript
const paidCoursePricing = [
  {
    currency: "USD",
    individual: 299,
    batch: 249,
    min_batch_size: 3,
    max_batch_size: 10,
    early_bird_discount: 15,
    group_discount: 20,
    is_active: true
  },
  {
    currency: "EUR",
    individual: 279,
    batch: 229,
    min_batch_size: 3,
    max_batch_size: 10,
    early_bird_discount: 15,
    group_discount: 20,
    is_active: true
  },
  {
    currency: "INR",
    individual: 24999,
    batch: 19999,
    min_batch_size: 3,
    max_batch_size: 10,
    early_bird_discount: 15,
    group_discount: 20,
    is_active: true
  }
];
```

#### Free Course Pricing
```javascript
// Free courses have empty pricing array
const freeCoursePricing = [];
```

#### Seasonal/Promotional Pricing
```javascript
const promotionalPricing = [
  {
    currency: "USD",
    individual: 199,        // Reduced from regular $299
    batch: 149,            // Reduced from regular $249
    min_batch_size: 2,     // Lower minimum for promotion
    max_batch_size: 15,    // Higher maximum for promotion
    early_bird_discount: 25, // Higher early bird discount
    group_discount: 30,    // Higher group discount
    is_active: true
  }
];
```

### Business Rules and Validation

#### Currency Validation
- Only one active price per currency per course
- Currency codes must be exactly 3 characters
- Must be one of the supported currencies

#### Price Validation
- All price amounts must be non-negative
- Batch price should typically be ≤ individual price
- Early bird and group discounts cannot exceed 100%

#### Batch Size Validation
- min_batch_size ≥ 2
- max_batch_size ≥ min_batch_size
- Practical maximum recommended: 50 students

#### Discount Stacking Rules
1. Early bird discount applied first to base price
2. Group discount applied to early bird adjusted price
3. Final price = base_price × (1 - early_bird/100) × (1 - group/100)

### Use Cases and Integration

#### Frontend Integration
- Display appropriate currency based on user location
- Show discount calculations in real-time
- Handle batch enrollment flows
- Support multi-currency comparison

#### Payment Processing
- Convert currencies if needed
- Apply discounts according to enrollment type
- Validate batch size requirements
- Track promotional code usage

#### Analytics and Reporting
- Revenue analysis by currency
- Discount effectiveness tracking
- Batch vs individual enrollment ratios
- Geographic pricing performance

## Validation Rules

### Common Validation Rules

1. **Required Fields**: All marked required fields must be provided
2. **Course Type**: Must be one of "live", "blended", "free"
3. **Course Level**: Must be one of "Beginner", "Intermediate", "Advanced", "All Levels"
4. **Status**: Must be one of "Draft", "Published", "Upcoming"
5. **URLs**: All URL fields must be valid URLs
6. **Dates**: End dates must be after start dates
7. **Numbers**: All numeric fields must be non-negative unless specified
8. **Pricing**: No duplicate currencies in prices array

### Course-Specific Validation

#### Live Course
- `total_sessions` ≥ 1
- `max_students` ≥ 1
- `course_schedule.end_date` > `course_schedule.start_date`
- At least one module with valid sessions
- Session duration ≥ 15 minutes if numeric

#### Blended Course
- Must have either `curriculum` OR `course_modules` with content
- `doubt_session_schedule.frequency` must be valid enum value
- Time slots must have valid start/end times

#### Free Course
- At least one lesson required
- Video lessons must have duration
- If `access_type` is "time-limited", `access_duration` is required
- `access_duration` ≥ 1 day if provided

## Migration Notes

### Legacy Compatibility

All course types maintain compatibility with legacy fields:

- `course_fee` → Maps to pricing structure
- `category_type` → Used for legacy categorization
- `class_type` → Maps to appropriate course type
- `is_Certification`, `is_Assignments`, etc. → Legacy feature flags
- `assigned_instructor` → Single instructor reference
- `isFree` → Auto-set based on pricing

### Auto-Generated IDs

The system automatically generates IDs for curriculum elements:

- Week IDs: `week_1`, `week_2`, etc.
- Lesson IDs: `lesson_w1_1`, `lesson_w2_1`, etc.
- Live Class IDs: `live_w1_1`, `live_w1_2`, etc.
- Section IDs: `section_1_1`, `section_2_1`, etc.
- Module IDs: `module_1`, `module_2`, etc. (for blended courses)

### Backward Compatibility Features

1. **Dual Schema Support**: Both new course-types and legacy Course model
2. **Field Mapping**: Automatic mapping between old and new field structures
3. **Type Detection**: Auto-detection of course type from legacy data
4. **Unified API**: Single endpoints work with both model types
5. **Gradual Migration**: Supports mixed environments during transition

This documentation provides a complete reference for implementing and working with the course types system while maintaining full backward compatibility with existing legacy courses. 