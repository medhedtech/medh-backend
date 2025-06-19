# Enhanced Demo Booking API Documentation

## Overview
The enhanced demo booking API now captures comprehensive student details to provide personalized demo experiences and better preparation for instructors.

## API Endpoint
**POST** `/api/demo-booking`

## Enhanced Request Body

### Basic Information (Required)
```json
{
  "email": "student@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "timeSlot": "2025-01-20T15:00:00Z",
  "timezone": "America/New_York"
}
```

### Enhanced Student Details (Optional)

#### Personal Information
```json
{
  "age": 25,
  "gender": "male", // Options: male, female, non-binary, prefer-not-to-say, other
  "dateOfBirth": "1999-06-15"
}
```

#### Academic Information
```json
{
  "educationLevel": "undergraduate", // Options: high-school, diploma, undergraduate, graduate, postgraduate, phd, other
  "fieldOfStudy": "Computer Science",
  "currentOccupation": "Software Developer",
  "studentStatus": "working-professional" // Options: student, working-professional, job-seeker, entrepreneur, freelancer, other
}
```

#### Technical Information
```json
{
  "programmingExperience": "intermediate", // Options: beginner, basic, intermediate, advanced, expert
  "currentSkills": ["JavaScript", "Python", "HTML/CSS"],
  "interestedTechnologies": ["React", "Node.js", "Machine Learning"],
  "hasLaptop": true,
  "internetSpeed": "50 Mbps",
  "previousOnlineLearningExperience": "intermediate" // Options: none, basic, intermediate, extensive
}
```

#### Learning Preferences
```json
{
  "preferredLearningStyle": "hands-on", // Options: visual, auditory, hands-on, reading, mixed
  "learningGoals": ["Career Switch", "Skill Enhancement", "Freelancing"],
  "careerObjectives": "Become a Full Stack Developer",
  "availableTimePerWeek": 15, // Hours (1-168)
  "timelineExpectations": "6 months",
  "budgetRange": "$1000-$3000"
}
```

#### Contact Information
```json
{
  "preferredContactMethod": "whatsapp", // Options: email, phone, whatsapp, telegram, discord
  "socialMediaProfiles": {
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe",
    "twitter": "@johndoe"
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Sister",
    "phone": "+1234567891"
  }
}
```

#### Additional Information
```json
{
  "howDidYouHearAboutUs": "Google Search",
  "referralCode": "FRIEND2025",
  "specialRequirements": "Need closed captions for hearing accessibility"
}
```

## Complete Enhanced Request Example
```json
{
  // Basic Information
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "timeSlot": "2025-01-20T15:00:00Z",
  "timezone": "America/New_York",
  "demoType": "course_demo",
  "courseInterest": "Full Stack Development",
  
  // Personal Information
  "age": 25,
  "gender": "male",
  "dateOfBirth": "1999-06-15",
  
  // Academic Information
  "educationLevel": "undergraduate",
  "fieldOfStudy": "Computer Science",
  "currentOccupation": "Junior Developer",
  "studentStatus": "working-professional",
  
  // Technical Information
  "programmingExperience": "intermediate",
  "currentSkills": ["JavaScript", "Python", "HTML/CSS"],
  "interestedTechnologies": ["React", "Node.js", "Docker"],
  "hasLaptop": true,
  "internetSpeed": "100 Mbps",
  "previousOnlineLearningExperience": "intermediate",
  
  // Learning Preferences
  "preferredLearningStyle": "hands-on",
  "learningGoals": ["Career Advancement", "Skill Enhancement"],
  "careerObjectives": "Become a Senior Full Stack Developer",
  "availableTimePerWeek": 20,
  "timelineExpectations": "4-6 months",
  "budgetRange": "$2000-$4000",
  
  // Contact Information
  "preferredContactMethod": "whatsapp",
  "socialMediaProfiles": {
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe"
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Sister",
    "phone": "+1234567891"
  },
  
  // Additional Information
  "howDidYouHearAboutUs": "LinkedIn Ad",
  "referralCode": "FRIEND2025",
  "specialRequirements": "Prefer evening sessions due to work schedule",
  
  // Technical Settings
  "autoGenerateZoomMeeting": true,
  "source": "website"
}
```

## Enhanced Response Structure
```json
{
  "success": true,
  "message": "Demo booking created successfully",
  "data": {
    "booking": {
      "id": "booking_id_here",
      "userId": "user_id_here",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+1234567890",
      "scheduledDateTime": "2025-01-20T15:00:00Z",
      "timezone": "America/New_York",
      "status": "pending",
      "demoType": "course_demo",
      "courseInterest": "Full Stack Development",
      
      // Enhanced student details (organized structure)
      "studentDetails": {
        "personalInfo": {
          "age": 25,
          "gender": "male",
          "dateOfBirth": "1999-06-15T00:00:00Z"
        },
        "academicInfo": {
          "educationLevel": "undergraduate",
          "fieldOfStudy": "Computer Science",
          "currentOccupation": "Junior Developer",
          "studentStatus": "working-professional"
        },
        "technicalInfo": {
          "programmingExperience": "intermediate",
          "currentSkills": ["JavaScript", "Python", "HTML/CSS"],
          "interestedTechnologies": ["React", "Node.js", "Docker"],
          "hasLaptop": true,
          "internetSpeed": "100 Mbps",
          "previousOnlineLearningExperience": "intermediate"
        },
        "learningPreferences": {
          "preferredLearningStyle": "hands-on",
          "learningGoals": ["Career Advancement", "Skill Enhancement"],
          "careerObjectives": "Become a Senior Full Stack Developer",
          "availableTimePerWeek": 20,
          "timelineExpectations": "4-6 months",
          "budgetRange": "$2000-$4000"
        },
        "contactInfo": {
          "preferredContactMethod": "whatsapp",
          "socialMediaProfiles": {
            "linkedin": "https://linkedin.com/in/johndoe",
            "github": "https://github.com/johndoe"
          },
          "emergencyContact": {
            "name": "Jane Doe",
            "relationship": "Sister",
            "phone": "+1234567891"
          }
        },
        "additionalInfo": {
          "howDidYouHearAboutUs": "LinkedIn Ad",
          "referralCode": "FRIEND2025",
          "specialRequirements": "Prefer evening sessions due to work schedule"
        }
      },
      
      // Zoom meeting details
      "zoomMeeting": {
        "id": "zoom_meeting_id",
        "join_url": "https://zoom.us/j/123456789",
        "password": "password123",
        "start_time": "2025-01-20T15:00:00Z",
        "duration": 60
      },
      
      "canReschedule": true,
      "canCancel": true,
      "isUpcoming": true,
      "createdAt": "2025-01-19T10:00:00Z",
      "updatedAt": "2025-01-19T10:00:00Z"
    }
  }
}
```

## Validation Rules

### Age
- Must be between 13 and 100
- Optional field

### Gender
- Valid options: `male`, `female`, `non-binary`, `prefer-not-to-say`, `other`
- Case insensitive
- Optional field

### Education Level
- Valid options: `high-school`, `diploma`, `undergraduate`, `graduate`, `postgraduate`, `phd`, `other`
- Case insensitive
- Optional field

### Student Status
- Valid options: `student`, `working-professional`, `job-seeker`, `entrepreneur`, `freelancer`, `other`
- Case insensitive
- Optional field

### Programming Experience
- Valid options: `beginner`, `basic`, `intermediate`, `advanced`, `expert`
- Case insensitive
- Optional field, defaults to `beginner`

### Preferred Learning Style
- Valid options: `visual`, `auditory`, `hands-on`, `reading`, `mixed`
- Case insensitive
- Optional field, defaults to `mixed`

### Preferred Contact Method
- Valid options: `email`, `phone`, `whatsapp`, `telegram`, `discord`
- Case insensitive
- Optional field, defaults to `email`

### Available Time Per Week
- Must be between 1 and 168 hours
- Integer value
- Optional field

## Error Responses

### Validation Error Example
```json
{
  "success": false,
  "message": "Student details validation failed",
  "error_code": "STUDENT_DETAILS_VALIDATION_ERROR",
  "errors": [
    {
      "field": "age",
      "message": "Age must be between 13 and 100"
    },
    {
      "field": "gender",
      "message": "Invalid gender option"
    }
  ]
}
```

### Booking Date Error
```json
{
  "success": false,
  "message": "Demo bookings must be scheduled at least 1 day in advance. Please select a slot from tomorrow onwards.",
  "error_code": "INVALID_BOOKING_DATE",
  "data": {
    "requested_date": "2025-01-19T15:00:00Z",
    "minimum_date": "2025-01-20T00:00:00Z",
    "current_date": "2025-01-19T10:00:00Z"
  }
}
```

## Benefits of Enhanced Form

### For Students
- **Personalized Experience**: Demos tailored to their skill level and interests
- **Better Preparation**: Instructors can prepare relevant examples and materials
- **Improved Matching**: Better course recommendations based on goals and experience
- **Accessibility**: Special requirements can be accommodated

### For Instructors
- **Better Preparation**: Comprehensive student profile before the demo
- **Targeted Content**: Can focus on relevant technologies and use cases
- **Time Management**: Know student's available time for realistic course planning
- **Communication**: Use preferred contact methods for follow-ups

### For Business
- **Lead Quality**: Better qualified leads with detailed information
- **Conversion Tracking**: Track how students heard about the platform
- **Referral Program**: Support referral codes for growth
- **Analytics**: Rich data for improving marketing and course offerings

## Implementation Notes

1. **All enhanced fields are optional** - maintains backward compatibility
2. **Intelligent defaults** - system provides sensible defaults for missing fields
3. **Data validation** - comprehensive validation prevents invalid data
4. **Organized structure** - student details are grouped logically for easy access
5. **Privacy conscious** - sensitive information like emergency contacts are handled securely
6. **Scalable design** - easy to add new fields or categories in the future

## Frontend Integration Tips

### Progressive Form Design
```javascript
// Basic required fields first
const basicFields = ['email', 'fullName', 'phoneNumber', 'timeSlot'];

// Optional enhanced fields in sections
const enhancedSections = {
  personal: ['age', 'gender', 'dateOfBirth'],
  academic: ['educationLevel', 'fieldOfStudy', 'currentOccupation'],
  technical: ['programmingExperience', 'currentSkills', 'hasLaptop'],
  preferences: ['learningGoals', 'preferredLearningStyle', 'budgetRange']
};
```

### Smart Form Features
- **Auto-population**: If user is logged in, pre-fill known information
- **Progressive disclosure**: Show advanced fields based on user selections
- **Smart suggestions**: Suggest skills/technologies based on field of study
- **Validation feedback**: Real-time validation with helpful error messages
- **Save draft**: Allow users to save progress and return later 