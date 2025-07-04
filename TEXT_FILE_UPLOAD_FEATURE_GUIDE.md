# Text File Upload Feature for Recorded Lessons

## Overview
The recorded lesson upload endpoint now supports optional text file attachments, allowing instructors to include supplementary materials such as lesson notes, transcripts, code snippets, or additional resources alongside their video recordings.

## Endpoint
```
POST /api/v1/batches/{batchId}/schedule/{sessionId}/upload-recorded-lesson
```

## Text File Support

### Supported File Types
- `.txt` - Plain text files
- `.md` - Markdown files
- `.rtf` - Rich Text Format
- `.doc` - Microsoft Word documents
- `.docx` - Microsoft Word documents (newer format)

### Limitations
- **Size Limit**: 1MB maximum content size
- **Optional**: Text files are completely optional - videos can be uploaded without them
- **Content**: Must include both `content` and `filename` if providing a text file

### Request Format

#### Basic Upload (Video Only)
```json
{
  "base64String": "data:video/mp4;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
  "title": "Introduction to React Hooks",
  "recorded_date": "2025-01-07T14:30:00Z"
}
```

#### Upload with Text File
```json
{
  "base64String": "data:video/mp4;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
  "title": "Introduction to React Hooks",
  "recorded_date": "2025-01-07T14:30:00Z",
  "textFile": {
    "content": "# Lesson Notes\n\n## Topics Covered\n1. useState Hook\n2. useEffect Hook\n3. Custom Hooks\n\n## Code Examples\n```javascript\nconst [count, setCount] = useState(0);\n```",
    "filename": "react-hooks-lesson.md",
    "description": "Comprehensive notes covering React Hooks with code examples"
  }
}
```

### Text File Object Structure
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes* | The actual text content of the file |
| `filename` | string | Yes* | Filename with extension (determines file type) |
| `description` | string | No | Optional description of the text file's purpose |

*Required only if `textFile` object is included in the request.

### Response Format
```json
{
  "success": true,
  "message": "Upload started successfully",
  "status": "uploading",
  "data": {
    "batchId": "68557a9d841fabd88f839df0",
    "sessionId": "68557a9d841fabd88f839df1",
    "title": "Introduction to React Hooks",
    "uploadStatus": "in_progress",
    "hasTextFile": true
  }
}
```

## Storage Structure
When text files are uploaded, they are stored in the following directory structure:
```
videos/
  {batchId}/
    documents/
      {generated-filename}.txt
```

For individual batches:
```
videos/
  student/
    {studentId}/
      documents/
        {generated-filename}.txt
```

## Database Schema
The recorded lesson document includes text file information:
```javascript
{
  title: "Introduction to React Hooks",
  url: "https://cdn.medh.co/videos/batch123/lesson-video.mp4",
  recorded_date: "2025-01-07T14:30:00Z",
  created_by: "user_id",
  text_file: {
    url: "https://cdn.medh.co/videos/batch123/documents/lesson-notes.txt",
    filename: "react-hooks-lesson.md",
    description: "Comprehensive notes covering React Hooks",
    uploaded_at: "2025-01-07T14:31:00Z"
  }
}
```

## Use Cases

### 1. Lesson Transcripts
Upload video recordings with full transcripts for accessibility:
```json
{
  "textFile": {
    "content": "Welcome to today's lesson on React Hooks...\n[Complete transcript]",
    "filename": "lesson-transcript.txt",
    "description": "Full transcript of the lesson for accessibility"
  }
}
```

### 2. Code Examples and Resources
Include code snippets and additional resources:
```json
{
  "textFile": {
    "content": "# Code Examples\n\n## useState Example\n```javascript\nconst [state, setState] = useState(initialValue);\n```",
    "filename": "code-examples.md",
    "description": "Code examples demonstrated in the lesson"
  }
}
```

### 3. Assignment Instructions
Provide follow-up assignments or exercises:
```json
{
  "textFile": {
    "content": "## Assignment: Build a Counter App\n\n1. Create a new React component\n2. Use useState hook...",
    "filename": "assignment.md",
    "description": "Practice assignment for this lesson"
  }
}
```

## Error Handling

### Validation Errors
```json
{
  "success": false,
  "message": "Text file must include both content and filename"
}
```

```json
{
  "success": false,
  "message": "Text file must be one of: .txt, .md, .rtf, .doc, .docx"
}
```

```json
{
  "success": false,
  "message": "Text file content cannot exceed 1MB"
}
```

### Upload Failures
If the text file upload fails, the video upload will continue and succeed. Text file upload failures are logged but do not block the primary video upload process.

## Frontend Integration

### React Hook Example
```javascript
const useRecordedLessonUpload = () => {
  const [uploading, setUploading] = useState(false);
  
  const uploadLesson = async (batchId, sessionId, videoFile, textContent = null, textFilename = null) => {
    setUploading(true);
    
    try {
      const videoBase64 = await convertFileToBase64(videoFile);
      
      const payload = {
        base64String: videoBase64,
        title: videoFile.name.replace(/\.[^/.]+$/, ""), // Remove extension
        recorded_date: new Date().toISOString()
      };
      
      if (textContent && textFilename) {
        payload.textFile = {
          content: textContent,
          filename: textFilename,
          description: `Supplementary materials for ${payload.title}`
        };
      }
      
      const response = await fetch(`/api/v1/batches/${batchId}/schedule/${sessionId}/upload-recorded-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return await response.json();
    } finally {
      setUploading(false);
    }
  };
  
  return { uploadLesson, uploading };
};
```

## Best Practices

1. **File Naming**: Use descriptive filenames that indicate the content type
   - `lesson-transcript.txt`
   - `code-examples.md`
   - `assignment-instructions.txt`

2. **Content Structure**: For markdown files, use proper heading structure
   ```markdown
   # Main Topic
   ## Subtopic
   ### Details
   ```

3. **Size Optimization**: Keep text files concise and focused
   - Remove unnecessary formatting
   - Use markdown for structure instead of complex formatting

4. **Error Handling**: Always handle text file upload failures gracefully
   - Video upload should succeed even if text file fails
   - Provide user feedback about partial success

5. **Content Guidelines**: Include relevant and valuable supplementary content
   - Lesson summaries
   - Key points and takeaways
   - Additional resources and links
   - Practice exercises

## Testing
Use the provided test script to verify functionality:
```bash
node test-recorded-lesson-with-text-file.js
```

This will test various scenarios including validation and error handling.
