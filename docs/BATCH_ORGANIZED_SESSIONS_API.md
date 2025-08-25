# Batch-Organized Recorded Sessions API

## Overview

The `/api/v1/batches/students/:studentId/recorded-lessons` endpoint has been updated to organize recorded sessions by batches instead of showing them in a flat structure.

## API Endpoint

```
GET /api/v1/batches/students/:studentId/recorded-lessons
```

### Authorization
- **Admin/Instructor/Super-Admin**: Can access any student's recorded lessons
- **Student**: Can only access their own recorded lessons

## New Response Structure

### Before (Old Structure)
```json
{
  "success": true,
  "data": {
    "personal_sessions": { ... },
    "scheduled_sessions": {
      "sessions": [
        // Flat list of sessions from all batches mixed together
      ]
    }
  }
}
```

### After (New Batch-Organized Structure)
```json
{
  "success": true,
  "count": 15,
  "data": {
    "personal_sessions": {
      "count": 5,
      "videos": [...],
      "description": "Personal Sessions • by Student Name",
      "type": "personal"
    },
    "batch_sessions": {
      "count": 3,
      "batches": [
        {
          "batch_id": "67bd596b8a56e7688dd02274",
          "batch_name": "React Development Batch A",
          "sessions": [
            {
              "session_id": "67bd596b8a56e7688dd02275",
              "session_day": "Monday",
              "session_start_time": "10:00",
              "session_end_time": "12:00",
              "recorded_lessons": [
                {
                  "title": "Introduction to React Hooks",
                  "url": "https://cdn.medh.co/signed-url...",
                  "recorded_date": "2024-01-15T10:00:00Z"
                }
              ],
              "videos_count": 1
            }
          ],
          "total_videos": 3,
          "description": "Recorded sessions from React Development Batch A"
        },
        {
          "batch_id": "67bd596b8a56e7688dd02276",
          "batch_name": "Node.js Backend Batch B",
          "sessions": [...],
          "total_videos": 7,
          "description": "Recorded sessions from Node.js Backend Batch B"
        }
      ],
      "total_videos": 10,
      "description": "Videos organized by batches you are enrolled in",
      "type": "batch_organized"
    }
  },
  "message": "Retrieved 15 recorded videos organized by 3 batches for student",
  "summary": {
    "personal_sessions": 5,
    "total_batches": 3,
    "total_batch_videos": 10,
    "total_videos": 15
  },
  "method": "Combined (S3 + Database)",
  "s3_available": true
}
```

## Key Improvements

### 1. **Batch Organization**
- Sessions are now grouped by the batch they belong to
- Each batch shows its name, ID, and description
- Easy to see which sessions belong to which batch

### 2. **Better Hierarchy**
```
📚 Batch Sessions
├── 🎓 React Development Batch A
│   ├── 📅 Monday Session (10:00-12:00)
│   │   └── 🎥 Introduction to React Hooks
│   └── 📅 Wednesday Session (14:00-16:00)
│       └── 🎥 Advanced React Patterns
├── 🎓 Node.js Backend Batch B
│   ├── 📅 Tuesday Session (09:00-11:00)
│   │   └── 🎥 Express.js Fundamentals
│   └── 📅 Thursday Session (15:00-17:00)
│       └── 🎥 Database Integration
```

### 3. **Enhanced Metadata**
- `total_videos` per batch
- `videos_count` per session
- Comprehensive summary statistics
- Clear descriptions for each batch

### 4. **Backward Compatibility**
- Personal sessions structure remains unchanged
- All existing fields are preserved
- Additional metadata enhances the response without breaking changes

## Frontend Integration

### Displaying Batch-Organized Sessions

```typescript
interface BatchSession {
  batch_id: string;
  batch_name: string;
  sessions: SessionData[];
  total_videos: number;
  description: string;
}

// Example usage
response.data.batch_sessions.batches.forEach(batch => {
  console.log(`Batch: ${batch.batch_name} (${batch.total_videos} videos)`);
  
  batch.sessions.forEach(session => {
    console.log(`  Session: ${session.session_day} ${session.session_start_time}-${session.session_end_time}`);
    
    session.recorded_lessons.forEach(lesson => {
      console.log(`    Video: ${lesson.title}`);
    });
  });
});
```

## Benefits

1. **Better Organization**: Students can easily find sessions from specific batches
2. **Improved UX**: Clear hierarchy makes navigation intuitive
3. **Scalability**: Works well even with many batches and sessions
4. **Analytics**: Easy to track video consumption per batch
5. **Flexibility**: Frontend can display data in various formats (list, cards, accordion, etc.)

## Testing

Use the provided test script to verify the new structure:

```bash
node test-batch-organized-sessions.js
```

Make sure to update the `studentId` in the test script with a real student ID from your database.
