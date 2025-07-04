# Text File Upload Feature - Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Verification
- [ ] Verify AWS S3 credentials are configured
- [ ] Confirm upload permissions for documents subdirectory
- [ ] Test CloudFront CDN access for new file paths
- [ ] Validate environment variables are set

### 2. Testing
- [ ] Run test suite: `node test-recorded-lesson-with-text-file.js`
- [ ] Test validation endpoints manually
- [ ] Verify existing video upload functionality still works
- [ ] Check database schema compatibility

### 3. Staging Deployment
```bash
# Deploy to staging environment
git add .
git commit -m "feat: Add optional text file upload support for recorded lessons"
git push origin main

# Test on staging
curl -X POST https://staging.medh.co/api/v1/batches/TEST_BATCH_ID/schedule/TEST_SESSION_ID/upload-recorded-lesson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STAGING_TOKEN" \
  -d '{
    "base64String": "data:video/mp4;base64,AAAA...",
    "title": "Test Lesson",
    "textFile": {
      "content": "Test content",
      "filename": "test.txt",
      "description": "Test file"
    }
  }'
```

## Production Deployment Steps

### 1. Code Deployment
```bash
# Ensure all changes are committed
git status

# Deploy to production
git push production main

# Or if using PM2
pm2 reload ecosystem.config.js --update-env
```

### 2. Verification
```bash
# Check server status
pm2 status

# Monitor logs for any issues
pm2 logs medh-backend --lines 100

# Test the endpoint
curl -X GET https://api.medh.co/api/v1/health
```

### 3. Feature Testing
Test the new functionality with a minimal payload:
```json
{
  "base64String": "data:video/mp4;base64,UklGRnoo...",
  "title": "Production Test",
  "textFile": {
    "content": "Production test content",
    "filename": "prod-test.txt"
  }
}
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Upload Success Rate**: Both video and text file uploads
2. **Storage Usage**: Monitor S3 storage growth in documents folders
3. **Error Rates**: Text file validation and upload failures
4. **Response Times**: Ensure background processing doesn't impact performance

### Log Monitoring
Watch for these log patterns:
```bash
# Successful text file uploads
grep "Text file uploaded:" /var/log/medh-backend.log

# Text file upload failures
grep "Failed to upload text file:" /var/log/medh-backend.log

# Validation errors
grep "Text file must" /var/log/medh-backend.log
```

## Rollback Plan

### If Issues Arise
1. **Feature Flag**: Temporarily disable text file processing
2. **Partial Rollback**: Video uploads will continue working
3. **Full Rollback**: Revert to previous version if critical issues

### Emergency Rollback Commands
```bash
# Quick feature disable (if needed)
export DISABLE_TEXT_FILE_UPLOAD=true
pm2 reload medh-backend

# Full rollback
git revert HEAD
git push production main
pm2 reload medh-backend
```

## Frontend Integration Timeline

### Phase 1: Backend Deployment (Week 1)
- [ ] Deploy backend changes
- [ ] Verify API functionality
- [ ] Update API documentation
- [ ] Notify frontend teams

### Phase 2: Frontend Integration (Week 2-3)
- [ ] Update React components to support text file input
- [ ] Add UI for text file upload
- [ ] Implement client-side validation
- [ ] Add progress indicators

### Phase 3: User Training (Week 4)
- [ ] Create instructor training materials
- [ ] Conduct training sessions
- [ ] Provide feature documentation
- [ ] Collect initial feedback

## Support Documentation

### For Support Team
Common issues and solutions:

**Issue**: "Text file validation failed"
**Solution**: Check file extension and size limits
```
Supported: .txt, .md, .rtf, .doc, .docx
Max size: 1MB
```

**Issue**: "Upload succeeded but no text file in lesson"
**Solution**: Check background processing logs
```bash
grep "Failed to upload text file" /var/log/medh-backend.log
```

**Issue**: "Text file URL not accessible"
**Solution**: Verify CloudFront distribution includes documents path

### For Instructors
Quick reference guide:

1. **Text File Format**: Use .txt or .md for best compatibility
2. **Content Size**: Keep under 1MB (approximately 500 pages of text)
3. **Best Practices**: Include lesson summaries, code examples, or transcripts
4. **Troubleshooting**: If text file fails, video upload will still succeed

## Success Criteria

### Week 1 (Post-Deployment)
- [ ] 0 critical errors in production logs
- [ ] All existing video uploads continue working
- [ ] Text file validation working correctly

### Week 2-4 (Adoption Phase)
- [ ] 10+ successful text file uploads
- [ ] Positive feedback from instructor beta testers
- [ ] Storage and performance metrics within expected ranges

### Month 1 (Full Adoption)
- [ ] 50+ lessons with text files uploaded
- [ ] Feature adoption rate >25% of recorded lessons
- [ ] User satisfaction score >4/5

## Contact Information

### Technical Issues
- **Backend Team**: backend-team@medh.co
- **DevOps**: devops@medh.co
- **Emergency**: +91-XXXX-XXXX-XX

### Feature Questions
- **Product Team**: product@medh.co
- **Training Team**: training@medh.co

## Additional Resources

- [Text File Upload Feature Guide](./TEXT_FILE_UPLOAD_FEATURE_GUIDE.md)
- [Implementation Summary](./TEXT_FILE_UPLOAD_IMPLEMENTATION_SUMMARY.md)
- [API Documentation](./RECORDED_LESSON_UPLOAD_SERVICE.md)
- [Test Suite](./test-recorded-lesson-with-text-file.js)
