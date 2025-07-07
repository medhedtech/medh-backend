# Image Migration System Documentation

## Overview

The image migration system has been implemented to move images from the `medh-filess` S3 bucket to the `medhdocuments` S3 bucket. This system provides both automatic migration for new uploads and manual migration for existing images.

## Key Features

### 1. Automatic Bucket Selection
- **Images**: Automatically uploaded to `medhdocuments` bucket
- **Documents**: Automatically uploaded to `medhdocuments` bucket  
- **Videos**: Continue to use `medh-filess` bucket
- **Default**: Falls back to `medh-filess` bucket for unknown types

### 2. Manual Migration APIs
- Single image migration endpoint
- Bulk image migration endpoint (up to 50 images per request)
- Migration script for command-line operations

### 3. Smart Migration Logic
- Only migrates images from `medh-filess` bucket
- Skips images already in the correct bucket
- Preserves original file structure and naming
- Provides detailed migration status and error reporting

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# S3 Bucket Configuration
AWS_S3_BUCKET_NAME=medh-filess
AWS_S3_IMAGES_BUCKET=medhdocuments
AWS_S3_DOCUMENTS_BUCKET=medhdocuments
AWS_S3_VIDEOS_BUCKET=medh-filess

# AWS Configuration
AWS_REGION=ap-south-1
IM_AWS_ACCESS_KEY=your_access_key
IM_AWS_SECRET_KEY=your_secret_key
```

### Bucket Mapping

| File Type | MIME Type | Destination Bucket |
|-----------|-----------|-------------------|
| Images | `image/*` | `medhdocuments` |
| Documents | `application/*` | `medhdocuments` |
| Videos | `video/*` | `medh-filess` |
| Others | Any other | `medh-filess` |

## API Endpoints

### 1. Single Image Migration

**Endpoint:** `POST /api/v1/upload/migrate-image`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "imageUrl": "https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg",
  "newKey": "optional/new/path/example.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image migrated successfully",
  "data": {
    "originalUrl": "https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg",
    "newUrl": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/example.jpg",
    "migrated": true,
    "sourceBucket": "medh-filess",
    "sourceKey": "images/example.jpg",
    "destinationBucket": "medhdocuments",
    "destinationKey": "images/example.jpg"
  }
}
```

### 2. Bulk Image Migration

**Endpoint:** `POST /api/v1/upload/migrate-images-bulk`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "imageUrls": [
    "https://medh-filess.s3.ap-south-1.amazonaws.com/images/image1.jpg",
    "https://medh-filess.s3.ap-south-1.amazonaws.com/images/image2.jpg",
    "https://medh-filess.s3.ap-south-1.amazonaws.com/images/image3.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk migration completed. 2 migrated, 1 skipped, 0 failed",
  "data": {
    "total": 3,
    "migrated": 2,
    "skipped": 1,
    "failed": 0,
    "results": [
      {
        "originalUrl": "https://medh-filess.s3.ap-south-1.amazonaws.com/images/image1.jpg",
        "newUrl": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/image1.jpg",
        "success": true,
        "migrated": true,
        "message": "Image migrated successfully"
      },
      {
        "originalUrl": "https://medh-filess.s3.ap-south-1.amazonaws.com/images/image2.jpg",
        "newUrl": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/image2.jpg",
        "success": true,
        "migrated": true,
        "message": "Image migrated successfully"
      },
      {
        "originalUrl": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/image3.jpg",
        "success": true,
        "migrated": false,
        "message": "Image is not from the old bucket, skipping"
      }
    ]
  }
}
```

## Command Line Script

### Usage

```bash
# Show help
node scripts/migrate-images-to-documents.js --help

# Dry run (show what would be migrated)
node scripts/migrate-images-to-documents.js --dry-run --source-url="https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg"

# Migrate a specific image
node scripts/migrate-images-to-documents.js --source-url="https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg"

# Set custom batch size
node scripts/migrate-images-to-documents.js --batch-size=5 --source-url="https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg"
```

### Example Output

```
🔄 Image Migration Script
========================
Source Bucket: medh-filess
Destination Bucket: medhdocuments
Dry Run: No
Batch Size: 10

🎯 Migrating specific image: https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg

🔍 Checking image: https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg
🚀 Migrating image...
✅ Successfully migrated to: https://medhdocuments.s3.ap-south-1.amazonaws.com/images/example.jpg

✅ Migration completed successfully!
New URL: https://medhdocuments.s3.ap-south-1.amazonaws.com/images/example.jpg
```

## Automatic Migration

### New Uploads

When you upload images using the existing endpoints, they will automatically be uploaded to the `medhdocuments` bucket:

- `POST /api/v1/upload/base64` - Images go to `medhdocuments`
- `POST /api/v1/upload` - Images go to `medhdocuments`
- Course image uploads - Images go to `medhdocuments`

### Existing Images

Existing images in the `medh-filess` bucket will remain there until manually migrated using:

1. **API endpoints** (recommended for programmatic migration)
2. **Command line script** (recommended for one-off migrations)
3. **Bulk migration** (recommended for large-scale migrations)

## Error Handling

### Common Error Scenarios

1. **Image not from old bucket**
   ```json
   {
     "success": true,
     "message": "Image is not from the old bucket, no migration needed",
     "data": {
       "originalUrl": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/example.jpg",
       "migrated": false
     }
   }
   ```

2. **Invalid S3 URL format**
   ```json
   {
     "success": false,
     "message": "Invalid S3 URL format: invalid-url",
     "error": "INVALID_S3_URL"
   }
   ```

3. **AWS permissions error**
   ```json
   {
     "success": false,
     "message": "Access denied to S3 bucket - check permissions",
     "error": "ACCESS_DENIED"
   }
   ```

## Best Practices

### 1. Migration Strategy

1. **Start with dry runs** to see what would be migrated
2. **Migrate in small batches** to avoid overwhelming the system
3. **Monitor the migration process** for any errors
4. **Update your application** to use the new URLs after migration

### 2. Application Updates

After migrating images, update your application to:

1. **Use the new URLs** in your database
2. **Update any hardcoded bucket references**
3. **Test the new image URLs** to ensure they work correctly

### 3. Monitoring

Monitor the migration process by:

1. **Checking the response status** of migration requests
2. **Reviewing the logs** for any errors
3. **Verifying the new URLs** are accessible
4. **Testing image loading** in your application

## Security Considerations

1. **AWS Permissions**: Ensure your AWS credentials have permissions for both buckets
2. **Authentication**: All migration endpoints require authentication
3. **Rate Limiting**: Bulk migration is limited to 50 images per request
4. **Error Handling**: Failed migrations don't affect successful ones

## Troubleshooting

### Common Issues

1. **"Access Denied" errors**
   - Check AWS credentials and permissions
   - Ensure both buckets are accessible

2. **"NoSuchBucket" errors**
   - Verify bucket names are correct
   - Check AWS region configuration

3. **"Invalid S3 URL" errors**
   - Ensure URLs are properly formatted S3 URLs
   - Check that URLs are from the expected bucket

### Debug Mode

Enable debug logging by setting the log level in your environment:

```env
LOG_LEVEL=debug
```

This will provide detailed information about the migration process, including:
- S3 operation details
- Bucket selection logic
- Error details and stack traces 