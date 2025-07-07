# Filename Preservation Guide

## Overview

The upload system now preserves and displays the original filenames of uploaded documents, images, and videos. This makes it easier to identify files and provides a better user experience.

## Key Features

### 1. Original Filename Preservation

- **S3 Key Format**: `{folder}/{timestamp}-{randomString}-{originalFilename}.{extension}`
- **Response Data**: Includes both `originalFilename` and `filename` fields
- **Filename Cleaning**: Automatically removes special characters and spaces for S3 compatibility

### 2. Supported Upload Methods

- **Base64 Upload**: Accepts `originalFilename` in request body
- **File Upload**: Automatically extracts filename from uploaded file
- **Multiple File Upload**: Preserves filenames for all uploaded files

### 3. Filename Cleaning Rules

- Replaces special characters with underscores
- Removes multiple consecutive underscores
- Trims leading/trailing underscores
- Preserves file extensions

## API Usage

### 1. Base64 Upload with Original Filename

**Endpoint:** `POST /api/v1/upload/base64`

**Request Body:**

```json
{
  "base64String": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "fileType": "image",
  "originalFilename": "My Vacation Photo.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/1703123456789-abc123-My_Vacation_Photo.jpg",
    "key": "images/1703123456789-abc123-My_Vacation_Photo.jpg",
    "bucket": "medhdocuments",
    "contentType": "image/jpeg",
    "uploadTime": 245,
    "decodeTime": 12,
    "fileSize": 245760,
    "originalFilename": "My Vacation Photo.jpg",
    "filename": "My Vacation Photo.jpg"
  }
}
```

### 2. File Upload (Multipart Form Data)

**Endpoint:** `POST /api/v1/upload`

**Form Data:**

```
file: [binary file data]
```

**Response:**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://medhdocuments.s3.ap-south-1.amazonaws.com/documents/1703123456789-abc123-Project_Report.pdf",
    "key": "documents/1703123456789-abc123-Project_Report.pdf",
    "bucket": "medhdocuments",
    "contentType": "application/pdf",
    "originalFilename": "Project Report.pdf",
    "filename": "Project Report.pdf"
  }
}
```

### 3. Multiple File Upload

**Endpoint:** `POST /api/v1/upload/multiple`

**Form Data:**

```
files: [multiple binary file data]
```

**Response:**

```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": [
    {
      "url": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/1703123456789-abc123-Photo_1.jpg",
      "key": "images/1703123456789-abc123-Photo_1.jpg",
      "bucket": "medhdocuments",
      "contentType": "image/jpeg",
      "originalFilename": "Photo 1.jpg",
      "filename": "Photo 1.jpg"
    },
    {
      "url": "https://medhdocuments.s3.ap-south-1.amazonaws.com/documents/1703123456789-def456-Document_1.pdf",
      "key": "documents/1703123456789-def456-Document_1.pdf",
      "bucket": "medhdocuments",
      "contentType": "application/pdf",
      "originalFilename": "Document 1.pdf",
      "filename": "Document 1.pdf"
    }
  ]
}
```

## Filename Cleaning Examples

| Original Filename  | Cleaned Filename   | S3 Key Example                                    |
| ------------------ | ------------------ | ------------------------------------------------- |
| `My Document.pdf`  | `My_Document.pdf`  | `documents/1703123456789-abc123-My_Document.pdf`  |
| `Photo (1).jpg`    | `Photo_1_.jpg`     | `images/1703123456789-def456-Photo_1_.jpg`        |
| `Report@2024.docx` | `Report_2024.docx` | `documents/1703123456789-ghi789-Report_2024.docx` |
| `Video File.mp4`   | `Video_File.mp4`   | `videos/1703123456789-jkl012-Video_File.mp4`      |

## Response Fields

### Standard Response Fields

- `url`: Complete S3 URL to access the file
- `key`: S3 object key (path within bucket)
- `bucket`: Destination bucket name
- `contentType`: MIME type of the file
- `fileSize`: Size of the file in bytes

### New Filename Fields

- `originalFilename`: The original filename as provided by the user
- `filename`: The display filename (same as originalFilename if provided, otherwise extracted from key)

### Performance Fields (Base64 Uploads)

- `uploadTime`: Time taken to upload to S3 (milliseconds)
- `decodeTime`: Time taken to decode base64 (milliseconds)
- `processingMethod`: Processing method used ("chunked" for large files)

## Bucket Strategy

Based on the current configuration:

| File Type | MIME Type       | Destination Bucket | Filename Example                            |
| --------- | --------------- | ------------------ | ------------------------------------------- |
| Images    | `image/*`       | `medhdocuments`    | `images/1703123456789-abc123-Photo.jpg`     |
| Documents | `application/*` | `medhdocuments`    | `documents/1703123456789-def456-Report.pdf` |
| Videos    | `video/*`       | `medh-filess`      | `videos/1703123456789-ghi789-Movie.mp4`     |

## Best Practices

### 1. Frontend Implementation

```javascript
// Example: Upload file with original filename
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/v1/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();

  // Display the original filename to user
  console.log(`Uploaded: ${result.data.originalFilename}`);
  console.log(`URL: ${result.data.url}`);
};
```

### 2. Base64 Upload with Filename

```javascript
// Example: Base64 upload with original filename
const uploadBase64 = async (base64String, originalFilename) => {
  const response = await fetch("/api/v1/upload/base64", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      base64String,
      fileType: "image",
      originalFilename,
    }),
  });

  const result = await response.json();
  return result.data;
};
```

### 3. Display Uploaded Files

```javascript
// Example: Display uploaded files with original names
const displayUploadedFiles = (uploadedFiles) => {
  uploadedFiles.forEach((file) => {
    const fileElement = document.createElement("div");
    fileElement.innerHTML = `
      <p><strong>${file.originalFilename}</strong></p>
      <p>Size: ${(file.fileSize / 1024).toFixed(2)} KB</p>
      <p>Type: ${file.contentType}</p>
      <a href="${file.url}" target="_blank">View File</a>
    `;
    document.getElementById("uploaded-files").appendChild(fileElement);
  });
};
```

## Error Handling

### Common Filename-Related Errors

1. **Invalid Characters**: Special characters are automatically cleaned
2. **Empty Filename**: System generates timestamp-based filename
3. **Duplicate Filenames**: Random string ensures uniqueness

### Error Response Example

```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 10GB",
  "error": "FILE_TOO_LARGE"
}
```

## Migration Notes

### For Existing Systems

- **Backward Compatibility**: Existing uploads without filenames continue to work
- **Optional Field**: `originalFilename` is optional in base64 uploads
- **Automatic Extraction**: File uploads automatically extract original filenames

### Database Updates

If you store file information in a database, consider adding:

- `original_filename` field to store the original filename
- `display_filename` field for user-friendly display
- `s3_key` field to store the S3 object key

## Security Considerations

1. **Filename Sanitization**: All filenames are cleaned to prevent path traversal attacks
2. **Extension Validation**: File extensions are validated against allowed MIME types
3. **Unique Keys**: Timestamp + random string ensures no filename collisions
4. **Bucket Isolation**: Different file types go to appropriate buckets
