# Individual Batch with Student Assignment Guide

## Overview

This guide covers the enhanced individual batch creation feature that allows you to assign a student directly when creating an individual batch. This streamlines the process of setting up 1:1 learning sessions.

## ✨ New Feature: `student_id` Field

### What's New

When creating an **individual batch** (`batch_type: "individual"`), you can now include a `student_id` field to automatically enroll the student in the batch upon creation.

### Key Benefits

- **Streamlined Workflow**: Create batch and enroll student in one API call
- **Automatic Enrollment**: Student is immediately enrolled with proper pricing
- **Validation**: Ensures only one student per individual batch
- **Audit Trail**: Complete tracking of batch creation and enrollment

---

## 📋 API Usage

### Endpoint
```
POST /api/courses/:courseId/batches
```

### Enhanced Request Body

```json
{
  "batch_name": "John's Private Session",           // ✅ REQUIRED
  "batch_type": "individual",                       // ✅ REQUIRED (or defaults to 'group')
  "capacity": 1,                                    // ✅ REQUIRED (MUST be exactly 1 for individual)
  "start_date": "2024-01-15T10:00:00Z",            // ✅ REQUIRED
  "end_date": "2024-03-15T10:00:00Z",              // ✅ REQUIRED
  "assigned_instructor": "instructor_mongo_id",     // ✅ REQUIRED
  "student_id": "student_mongo_id",                 // 🆕 NEW: Auto-enroll student
  "schedule": [                                     // ✅ REQUIRED (array)
    {
      "day": "Monday",                              // ✅ REQUIRED
      "start_time": "10:00",                        // ✅ REQUIRED (HH:MM format)
      "end_time": "11:00"                           // ✅ REQUIRED (HH:MM format)
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "message": "Individual batch created and student enrolled successfully",
  "data": {
    "batch": {
      "_id": "batch_id",
      "batch_name": "John's Private Session",
      "batch_type": "individual",
      "capacity": 1,
      "enrolled_students": 1,
      "assigned_instructor": "instructor_mongo_id",
      "start_date": "2024-01-15T10:00:00Z",
      "end_date": "2024-03-15T10:00:00Z",
      "schedule": [...]
    },
    "enrollment": {
      "_id": "enrollment_id",
      "student": "student_mongo_id",
      "course": "course_id",
      "batch": "batch_id",
      "enrollment_type": "batch",
      "status": "active",
      "pricing_snapshot": {
        "original_price": 1000,
        "final_price": 1000,
        "currency": "INR",
        "pricing_type": "individual"
      }
    }
  }
}
```

---

## 🔧 Implementation Details

### Backend Processing Flow

1. **Batch Creation**: Creates individual batch with `capacity: 1`
2. **Student Validation**: Verifies student exists and is valid
3. **Auto-Enrollment**: Creates enrollment record with:
   - `enrollment_type: "batch"` (since it's a batch session)
   - `pricing_type: "individual"` (1:1 pricing)
   - `batch_size: 1` in batch_info
4. **Capacity Update**: Updates batch `enrolled_students` count

### Validation Rules

#### For `student_id` Field:
- **Optional**: Can be omitted for manual enrollment later
- **Valid ObjectId**: Must be a valid MongoDB ObjectId
- **Existing Student**: Student must exist in the database
- **Active Status**: Student must have active status
- **No Duplicate**: Student cannot already be enrolled in the same course

#### For Individual Batches:
- `batch_type` must be `"individual"`
- `capacity` must be exactly `1`
- `student_id` is optional but recommended
- Maximum 1 student enrollment allowed

---

## 📝 Usage Examples

### Example 1: Create Individual Batch with Student

```javascript
// Frontend API call
const response = await fetch('/api/courses/course_id/batches', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batch_name: "Sarah's Personal Coaching",
    batch_type: "individual",
    capacity: 1,
    start_date: "2024-02-01T09:00:00Z",
    end_date: "2024-04-01T09:00:00Z",
    assigned_instructor: "instructor_id",
    student_id: "student_id", // 🆕 Auto-enroll student
    schedule: [
      {
        day: "Tuesday",
        start_time: "09:00",
        end_time: "10:00"
      },
      {
        day: "Thursday", 
        start_time: "09:00",
        end_time: "10:00"
      }
    ]
  })
});
```

### Example 2: Create Individual Batch Without Student (Manual Enrollment Later)

```javascript
const response = await fetch('/api/courses/course_id/batches', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batch_name: "Available 1:1 Session Slot",
    batch_type: "individual",
    capacity: 1,
    start_date: "2024-02-01T14:00:00Z",
    end_date: "2024-04-01T14:00:00Z",
    assigned_instructor: "instructor_id",
    // student_id omitted - will enroll manually later
    schedule: [
      {
        day: "Wednesday",
        start_time: "14:00", 
        end_time: "15:00"
      }
    ]
  })
});

// Later, enroll student manually
await fetch(`/api/batches/${batchId}/students`, {
  method: 'POST',
  body: JSON.stringify({ student_id: "student_id" })
});
```

---

## ⚠️ Error Handling

### Common Errors

#### 400 Bad Request - Invalid Student ID
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "field": "student_id",
      "message": "Invalid Student ID format"
    }
  ]
}
```

#### 404 Not Found - Student Not Found
```json
{
  "success": false,
  "message": "Student not found"
}
```

#### 409 Conflict - Student Already Enrolled
```json
{
  "success": false,
  "message": "Student is already enrolled in this course"
}
```

#### 400 Bad Request - Individual Batch Validation
```json
{
  "success": false,
  "message": "Individual batches must have capacity = 1"
}
```

---

## 🎯 Frontend Integration

### Form Enhancement

```jsx
// React component example
const CreateBatchForm = () => {
  const [batchType, setBatchType] = useState('group');
  const [studentId, setStudentId] = useState('');

  return (
    <form onSubmit={handleSubmit}>
      {/* Existing fields */}
      <input name="batch_name" required />
      
      <select 
        name="batch_type" 
        value={batchType}
        onChange={(e) => setBatchType(e.target.value)}
      >
        <option value="group">Group Batch</option>
        <option value="individual">Individual Batch</option>
      </select>

      <input 
        name="capacity" 
        type="number"
        value={batchType === 'individual' ? 1 : ''}
        readOnly={batchType === 'individual'}
        required 
      />

      {/* 🆕 NEW: Student selection for individual batches */}
      {batchType === 'individual' && (
        <div className="student-selection">
          <label>Assign Student (Optional)</label>
          <StudentSelector 
            value={studentId}
            onChange={setStudentId}
            placeholder="Select student to auto-enroll"
          />
          <small>Leave empty to enroll student manually later</small>
        </div>
      )}

      {/* Rest of form fields */}
    </form>
  );
};
```

### UI/UX Recommendations

1. **Conditional Display**: Show student selector only for individual batches
2. **Optional Indicator**: Clearly mark student selection as optional
3. **Student Search**: Implement searchable student dropdown
4. **Validation Feedback**: Show real-time validation for student selection
5. **Success Confirmation**: Display enrollment confirmation after batch creation

---

## 🔍 Database Schema

### Enrollment Record Structure

```javascript
{
  _id: ObjectId,
  student: ObjectId,              // Reference to student
  course: ObjectId,               // Reference to course  
  batch: ObjectId,                // Reference to individual batch
  enrollment_type: "batch",       // Always "batch" for batch sessions
  enrollment_date: Date,
  status: "active",
  access_expiry_date: Date,
  
  // Pricing information
  pricing_snapshot: {
    original_price: Number,
    final_price: Number,
    currency: "INR",
    pricing_type: "individual",   // Individual pricing for 1:1 sessions
    discount_applied: 0
  },
  
  // Batch information
  batch_info: {
    batch_size: 1,                // Always 1 for individual batches
    is_batch_leader: true,
    batch_members: []             // Empty for individual batches
  },
  
  payment_plan: "full",
  total_amount_paid: Number,
  notes: "Auto-enrolled during individual batch creation",
  created_by: ObjectId
}
```

---

## 🧪 Testing

### Test Scenarios

1. **Successful Creation**: Create individual batch with valid student_id
2. **Without Student**: Create individual batch without student_id
3. **Invalid Student**: Test with non-existent student_id
4. **Duplicate Enrollment**: Test enrolling already enrolled student
5. **Group Batch**: Ensure student_id is ignored for group batches

### Sample Test Data

```javascript
// Valid test data
const testData = {
  batch_name: "Test Individual Session",
  batch_type: "individual", 
  capacity: 1,
  start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),  // 3 months from now
  assigned_instructor: "valid_instructor_id",
  student_id: "valid_student_id",
  schedule: [
    {
      day: "Monday",
      start_time: "10:00",
      end_time: "11:00"
    }
  ]
};
```

---

## 📊 Analytics Impact

### Metrics Tracking

The new feature affects these analytics:

1. **Batch Analytics**: Individual batches show in batch reports
2. **Enrollment Analytics**: Auto-enrollments tracked separately
3. **Instructor Workload**: Individual sessions count toward instructor capacity
4. **Revenue Analytics**: Individual pricing applied correctly

### Dashboard Updates

- Individual batch indicators in batch lists
- Auto-enrollment flags in enrollment reports
- 1:1 session metrics in instructor dashboards

---

## 🚀 Migration Notes

### Existing Data

- Existing individual batches remain unchanged
- No migration required for current enrollments
- New validation applies only to new enrollments

### Backward Compatibility

- API remains backward compatible
- `student_id` field is optional
- Existing batch creation workflows continue to work

---

## 📞 Support

For questions or issues with the individual batch student assignment feature:

1. Check validation error messages for specific issues
2. Verify student and instructor IDs are valid
3. Ensure batch_type and capacity are correctly set
4. Review enrollment status if student assignment fails

---

**Last Updated**: May 28, 2025  
**Version**: 1.0.0  
**Feature**: Individual Batch Student Assignment 