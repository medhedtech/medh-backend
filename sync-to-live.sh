#!/bin/bash

# MEDH Backend - Sync Local Changes to Live Server
# This script syncs all the latest changes from local backend to live production server

echo "🚀 ========== MEDH BACKEND SYNC SCRIPT =========="
echo "📅 Sync Date: $(date)"
echo "👤 User: $(whoami)"
echo ""

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LIVE_SERVER="your-live-server-ip-or-domain"
LIVE_USER="your-live-server-username"
LIVE_PATH="/path/to/your/live/backend"
LOCAL_PATH="$(pwd)"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Local Path: $LOCAL_PATH"
echo "   Live Server: $LIVE_SERVER"
echo "   Live Path: $LIVE_PATH"
echo ""

# Function to print section headers
print_section() {
    echo -e "${YELLOW}🔸 $1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_section "Step 1: Checking Local Changes"

# Check if we have all the latest changes
if [ ! -f "controllers/liveClassesController.js" ]; then
    print_error "liveClassesController.js not found!"
    exit 1
fi

if [ ! -f "routes/liveClassesRoutes.js" ]; then
    print_error "liveClassesRoutes.js not found!"
    exit 1
fi

if [ ! -f "config/aws-config.js" ]; then
    print_error "aws-config.js not found!"
    exit 1
fi

print_success "All required files found locally"

print_section "Step 2: Creating Backup of Live Server"

# Create backup directory with timestamp
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

echo "📦 Creating backup directory: $BACKUP_DIR"

# Key files that need to be synced
FILES_TO_SYNC=(
    "controllers/liveClassesController.js"
    "routes/liveClassesRoutes.js"
    "config/aws-config.js"
    "middleware/upload.js"
    "utils/s3BucketManager.js"
    "package.json"
    "index.js"
)

print_section "Step 3: Files to be Synced"
for file in "${FILES_TO_SYNC[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ⚠️  $file (not found)"
    fi
done

print_section "Step 4: Key Changes Summary"

echo "🔧 Major Changes in this sync:"
echo "   • Enhanced video upload with detailed progress tracking"
echo "   • Improved error handling and logging"
echo "   • Fixed S3 path structure (removed duplicate bucket name)"
echo "   • Added batch data fetching from database"
echo "   • Enhanced Multer configuration for large file uploads"
echo "   • Added comprehensive AWS configuration validation"
echo "   • Improved instructor data fetching"
echo "   • Added session edit/update functionality"
echo "   • Fixed network error handling"
echo ""

echo "📋 Environment Variables Required on Live Server:"
echo "   AWS_ACCESS_KEY_ID=your_aws_access_key"
echo "   AWS_SECRET_ACCESS_KEY=your_aws_secret_key"
echo "   AWS_S3_BUCKET_NAME=medh-filess"
echo "   AWS_REGION=ap-south-1"
echo "   MONGODB_URL=your_mongodb_connection_string"
echo "   JWT_SECRET_KEY=your_jwt_secret"
echo ""

print_section "Step 5: Manual Deployment Instructions"

echo "🔄 To deploy these changes to live server:"
echo ""
echo "1. 📁 Copy these files to your live server:"
for file in "${FILES_TO_SYNC[@]}"; do
    if [ -f "$file" ]; then
        echo "   scp $file $LIVE_USER@$LIVE_SERVER:$LIVE_PATH/$file"
    fi
done

echo ""
echo "2. 🔧 Update environment variables on live server:"
echo "   • Check .env file has all required AWS credentials"
echo "   • Verify MongoDB connection string"
echo "   • Ensure JWT secret is set"

echo ""
echo "3. 📦 Install/update dependencies:"
echo "   npm install"

echo ""
echo "4. 🔄 Restart the live server:"
echo "   pm2 restart medh-backend"
echo "   # OR"
echo "   systemctl restart your-backend-service"

echo ""
echo "5. ✅ Test the deployment:"
echo "   curl http://your-live-server:8080/api/v1/live-classes/batches"
echo "   curl -X POST http://your-live-server:8080/api/v1/live-classes/test-upload"

print_section "Step 6: Critical Updates in Controllers"

echo "🔧 liveClassesController.js changes:"
echo "   • Enhanced uploadVideos function with detailed error handling"
echo "   • Fixed S3 path structure (line 383): videos/batch_id/student_id(name)/session-number/"
echo "   • Added getAllBatches function (lines 960-990)"
echo "   • Improved instructor fetching with fallback logic"
echo "   • Added session edit/update functions"
echo "   • Enhanced AWS validation and error messages"

echo ""
echo "🔧 liveClassesRoutes.js changes:"
echo "   • Enhanced video upload route with better error handling (lines 67-107)"
echo "   • Added batch fetching route (line 124)"
echo "   • Improved Multer middleware integration"
echo "   • Added test endpoints for debugging"

echo ""
echo "🔧 aws-config.js changes:"
echo "   • Fixed UPLOAD_PATH_PREFIX to 'videos' (line 118)"
echo "   • Enhanced AWS validation function"
echo "   • Added comprehensive error logging"
echo "   • Improved S3 client creation with better error handling"

print_section "Step 7: Testing Checklist"

echo "✅ After deployment, test these endpoints:"
echo "   1. GET /api/v1/live-classes/batches - Should return batch data"
echo "   2. GET /api/v1/live-classes/instructors - Should return instructor data"
echo "   3. POST /api/v1/live-classes/upload-videos - Should handle video uploads"
echo "   4. GET /api/v1/live-classes/sessions - Should return session data"
echo "   5. POST /api/v1/live-classes/test-upload - Should return success message"

echo ""
print_section "Step 8: Monitoring"

echo "📊 Monitor these logs after deployment:"
echo "   • Check for AWS connection errors"
echo "   • Verify MongoDB connection"
echo "   • Monitor video upload success/failure rates"
echo "   • Check API response times"

echo ""
echo -e "${GREEN}🎉 Sync preparation completed!${NC}"
echo -e "${YELLOW}⚠️  This script prepared the sync plan. Execute the manual steps above to deploy.${NC}"
echo ""
echo "📞 Need help? Contact the development team."
echo "🔗 Documentation: https://your-docs-link.com"
echo ""
echo "========== END OF SYNC SCRIPT =========="










