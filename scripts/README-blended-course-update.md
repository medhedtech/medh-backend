# Blended Course Duration Update Scripts

This directory contains scripts to update the `course_duration` field for all courses with `class_type: "Blended Courses"` to set it to `"self paced"`.

## Scripts Overview

### 1. `test-blended-course-update.js` - Dry Run Analysis
**Purpose**: Analyze courses that would be affected without making any changes.

**Features**:
- Shows how many courses have `class_type: "Blended Courses"`
- Displays current `course_duration` distribution
- Lists detailed information for each affected course
- Shows impact analysis (how many courses would change)
- Displays the exact MongoDB query that would be executed

### 2. `update-blended-course-duration.js` - Actual Update
**Purpose**: Performs the actual bulk update operation.

**Features**:
- Updates all courses with `class_type: "Blended Courses"`
- Sets their `course_duration` to `"self paced"`
- Updates the `meta.lastUpdated` timestamp
- Provides detailed logging and verification
- Creates an audit trail in application logs

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file has the correct `MONGO_URI` configured
2. **Database Access**: Make sure you have write access to the MongoDB database
3. **Backup**: Consider backing up your database before running the update script

## Usage Instructions

### Step 1: Analyze the Impact (Recommended)
```bash
# Run the test script to see what would be changed
node scripts/test-blended-course-update.js
```

This will show you:
- How many courses would be affected
- Current values of `course_duration` for these courses
- Detailed breakdown of the impact

### Step 2: Execute the Update
```bash
# Run the actual update script
node scripts/update-blended-course-duration.js
```

This will:
- Connect to your MongoDB database
- Find all courses with `class_type: "Blended Courses"`
- Update their `course_duration` to `"self paced"`
- Update the `meta.lastUpdated` timestamp
- Verify the changes were applied correctly
- Close the database connection

## Expected Output

### Test Script Output Example:
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB successfully

🔍 Analyzing courses with class_type 'Blended Courses'...
📊 Analysis Results:
   Total courses with class_type 'Blended Courses': 5

📈 Current course_duration distribution:
   "6 weeks": 3 courses
   "8 weeks": 1 courses
   "self paced": 1 courses

🔄 Impact Analysis:
   Courses that will be updated: 4
   Courses already with "self paced": 1

📝 Courses that would be updated:
1. Advanced JavaScript Course
   FROM: "6 weeks"
   TO: "self paced"
...
```

### Update Script Output Example:
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB successfully

🔍 Finding courses with class_type 'Blended Courses'...
📊 Found 4 courses with class_type 'Blended Courses':

🚀 Proceeding with bulk update...

✅ Bulk update completed successfully!
📈 Update Result:
   - Matched documents: 4
   - Modified documents: 4
   - Acknowledged: true

🔍 Verifying update...
📊 Verification - Found 4 courses after update:
1. Advanced JavaScript Course
   Updated course_duration: "self paced"
...
```

## Database Query Executed

The script performs the following MongoDB operation:

```javascript
db.courses.updateMany(
  { "class_type": "Blended Courses" },
  {
    $set: {
      "course_duration": "self paced",
      "meta.lastUpdated": new Date()
    }
  }
)
```

## Safety Features

### Built-in Safeguards:
1. **Dry Run First**: Test script allows you to see impact before making changes
2. **Verification**: Update script verifies changes after execution
3. **Logging**: All operations are logged for audit trail
4. **Connection Management**: Proper database connection handling
5. **Error Handling**: Comprehensive error handling with detailed messages

### Rollback Considerations:
If you need to rollback changes, you would need to:
1. Identify the original `course_duration` values (check logs or database backups)
2. Create a custom rollback script with the original values
3. Or restore from a database backup taken before the update

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**:
   - Check your `MONGO_URI` in `.env` file
   - Ensure database is accessible
   - Verify credentials

2. **No Courses Found**:
   - Check if there are courses with `class_type: "Blended Courses"`
   - Verify the exact string format (case-sensitive)

3. **Permission Errors**:
   - Ensure your database user has write permissions
   - Check if collection is locked or read-only

### Debugging:
- Enable mongoose debugging by setting `MONGOOSE_DEBUG=true` in your environment
- Check application logs for detailed error information
- Use the test script first to diagnose issues

## Important Notes

⚠️ **Production Usage**:
- Always run the test script first in production
- Consider running during maintenance windows
- Ensure you have a recent database backup
- Test the scripts in a staging environment first

📝 **Audit Trail**:
- All operations are logged with timestamps
- The `meta.lastUpdated` field tracks when courses were modified
- Check application logs for detailed execution records

🔒 **Data Integrity**:
- The script only updates the specified fields
- No other course data is modified
- Updates are atomic and consistent 