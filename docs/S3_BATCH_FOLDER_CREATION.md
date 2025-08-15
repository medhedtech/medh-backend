# Automatic S3 Folder Creation for Batches

## 🎯 Problem Statement

When batches are created, there was no automatic organization of S3 storage. Videos uploaded for batch sessions were not properly organized by batch ID, making it difficult to manage and locate files for specific batches.

Additionally, when students were added to batches, there was no automatic creation of student-specific folders within batch folders, making it difficult to organize videos by individual students.

## ✅ Solution Implemented

### **Automatic S3 Folder Creation**

Now, whenever a new batch is created (either through the regular batch creation API or admin batch creation), an S3 folder is automatically created with the following structure:

Additionally, whenever a student is added to a batch (either through manual addition or enrollment process), a student-specific S3 folder is automatically created within the batch folder:

```
medh-filess/
└── videos/
    ├── {batch_object_id_1}/
    │   ├── {student_id_1}/
    │   │   ├── video1.mp4
    │   │   └── video2.mp4
    │   └── {student_id_2}/
    │       └── video3.mp4
    └── {batch_object_id_2}/
        └── {student_id_3}/
            └── video4.mp4
```

## 🔧 Technical Implementation

### 1. **S3 Batch Folder Manager Utility**

**File**: `medh-backend/utils/s3BatchFolderManager.js`

**Key Functions**:
- `createBatchS3Folder(batchId, batchName)` - Creates S3 folder for a batch
- `checkBatchS3Folder(batchId)` - Checks if S3 folder exists
- `ensureBatchS3Folder(batchId, batchName)` - Creates folder if it doesn't exist
- `getBatchS3FolderPath(batchId)` - Gets S3 folder path for a batch
- `createStudentS3Folder(batchId, studentId, studentName)` - Creates S3 folder for a student within a batch
- `checkStudentS3Folder(batchId, studentId)` - Checks if student S3 folder exists
- `ensureStudentS3Folder(batchId, studentId, studentName)` - Creates student folder if it doesn't exist
- `getStudentS3FolderPath(batchId, studentId)` - Gets student S3 folder path

```javascript
// Example usage
const s3FolderResult = await createBatchS3Folder(
  batch._id.toString(),
  batch.batch_name || 'New Batch'
);

if (s3FolderResult.success) {
  console.log(`✅ S3 folder created: ${s3FolderResult.s3Path}`);
}
```

### 2. **Batch Creation Controllers Updated**

**Files Modified**:
- `medh-backend/controllers/batch-controller.js`
- `medh-backend/controllers/adminManagementController.js`
- `medh-backend/services/enrollmentService.js`

**Changes**:
- Added import for `createBatchS3Folder` and `createStudentS3Folder` functions
- Added S3 folder creation logic after successful batch creation
- Added student S3 folder creation logic when students are added to batches
- Added error handling to prevent batch creation/enrollment failure if S3 folder creation fails

```javascript
// After batch creation
const newBatch = await Course.createBatch(courseId, batchData, adminId);

// Create S3 folder for the batch
try {
  const s3FolderResult = await createBatchS3Folder(
    newBatch._id.toString(),
    newBatch.batch_name || 'New Batch'
  );
  
  if (s3FolderResult.success) {
    logger.info(`✅ S3 folder created for batch: ${newBatch.batch_name}`);
  } else {
    logger.warn(`⚠️ Failed to create S3 folder for batch: ${newBatch.batch_name}`);
  }
} catch (s3Error) {
  logger.error(`❌ Error creating S3 folder for batch: ${newBatch.batch_name}`, s3Error);
  // Don't fail batch creation if S3 folder creation fails
}
```

## 📁 S3 Folder Structure Details

### **Folder Naming Convention**
- **Batch Folders**: `videos/{batch_object_id}/`
- **Student Folders**: `videos/{batch_object_id}/{student_id}/`
- **Video Files**: `videos/{batch_object_id}/{student_id}/{timestamp}-{random}.{extension}`

### **Example Structure**
```
medh-filess/videos/
├── 689de09ca8d09b5e78cbfbd6/          # Batch ObjectId
│   ├── 507f1f77bcf86cd799439011/      # Student 1
│   │   ├── 1703123456789-abc123.mp4
│   │   └── 1703123456790-def456.mp4
│   └── 507f1f77bcf86cd799439012/      # Student 2
│       └── 1703123456791-ghi789.mp4
└── 689de09ca8d09b5e78cbfbd7/          # Another Batch
    └── 507f1f77bcf86cd799439013/      # Student 3
        └── 1703123456792-jkl012.mp4
```

## 🧪 Testing

### **Test Script Created**

**File**: `medh-backend/test-batch-s3-folder-creation.js`

**Tests Included**:
1. **Existing Batches Check** - Lists all batches and their expected S3 paths
2. **S3 Connection Test** - Verifies S3 connectivity
3. **Batch Creation Test** - Provides manual testing instructions
4. **Folder Structure Test** - Explains expected S3 structure

### **Running Tests**

```bash
cd medh-backend
node test-batch-s3-folder-creation.js
```

### **Expected Test Results**

```
✅ Existing Batches: PASSED
✅ S3 Connection: PASSED
✅ Batch Creation: PASSED
✅ Folder Structure: PASSED

🎯 Overall Result: 4/4 tests passed
```

## 🔍 Verification Steps

### **1. Create a New Batch**
```bash
# Through frontend or API
POST /api/v1/admin/batches
{
  "batch_name": "Test Batch",
  "course": "course_id",
  "instructor": "instructor_id",
  "capacity": 10,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

### **2. Check Backend Logs**
Look for these log messages:
```
✅ S3 folder created for batch: Test Batch (batch_id)
   - S3 Path: s3://medh-filess/videos/batch_id/
```

### **3. Verify S3 Bucket**
- Navigate to your S3 bucket: `medh-filess`
- Check the `videos/` folder
- Verify the new batch folder exists: `videos/{batch_object_id}/`

### **4. Test Video Upload**
- Upload a video through the frontend
- Verify it's stored in the correct batch folder
- Check the S3 path follows the structure: `videos/{batchId}/{studentId}/{filename}`

## 🎉 Benefits Achieved

1. **✅ Automatic Organization**: S3 folders are created automatically when batches are created
2. **✅ Consistent Structure**: All videos follow the same organizational pattern
3. **✅ Easy Management**: Videos are grouped by batch and student
4. **✅ Scalable**: System works for any number of batches and students
5. **✅ Error Resilient**: Batch creation doesn't fail if S3 folder creation fails
6. **✅ Logging**: Comprehensive logging for debugging and monitoring

## 🚨 Error Handling

### **S3 Folder Creation Failures**
- If S3 folder creation fails, batch creation still succeeds
- Errors are logged but don't break the batch creation process
- Manual folder creation can be done later if needed

### **Common Issues**
1. **S3 Permissions**: Ensure AWS credentials have S3 write permissions
2. **Network Issues**: Check internet connectivity for S3 access
3. **Bucket Access**: Verify bucket exists and is accessible

### **Debug Commands**

```bash
# Test S3 connection
node test-batch-s3-folder-creation.js

# Check backend logs
tail -f medh-backend/logs/app.log

# Test S3 access directly
aws s3 ls s3://medh-filess/videos/
```

## 📝 Future Enhancements

1. **Batch Cleanup**: Automatic S3 folder cleanup when batches are deleted
2. **Folder Migration**: Tool to migrate existing videos to new folder structure
3. **Access Control**: S3 bucket policies for batch-specific access
4. **Monitoring**: Dashboard to monitor S3 storage usage by batch
5. **Backup**: Automated backup of batch videos

## 🔄 Integration with Video Upload

The S3 folder structure integrates seamlessly with the existing video upload system:

1. **Batch Creation** → Creates S3 folder
2. **Student Enrollment** → Creates student folder within batch folder
3. **Video Upload** → Uses student folder structure
4. **File Organization** → Videos stored in `videos/{batchId}/{studentId}/{filename}`

## 👨‍🎓 Student Folder Creation

### **Automatic Student Folder Creation**

When a student is added to a batch (either through `addStudentToBatch` API or enrollment service), a student-specific S3 folder is automatically created:

```
medh-filess/videos/
├── {batch_object_id_1}/
│   ├── {student_id_1}/          # Created when student is added
│   │   ├── video1.mp4
│   │   └── video2.mp4
│   └── {student_id_2}/          # Created when student is added
│       └── video3.mp4
└── {batch_object_id_2}/
    └── {student_id_3}/          # Created when student is added
        └── video4.mp4
```

### **Integration Points**

1. **`addStudentToBatch` Controller**: Creates student folder when student is manually added to batch
2. **`EnrollmentService.createBatchEnrollment`**: Creates student folder during batch enrollment process
3. **Video Upload**: Uses the student folder structure for file storage

### **Log Messages**

When student folders are created, you'll see these log messages:
```
✅ S3 folder created for student: John Doe in batch: React Fundamentals
   - S3 Path: s3://medh-filess/videos/689de09ca8d09b5e78cbfbd6/507f1f77bcf86cd799439011/
```

---

**Note**: This implementation ensures that every batch gets its own organized S3 folder structure automatically, making video management much more efficient and organized.
