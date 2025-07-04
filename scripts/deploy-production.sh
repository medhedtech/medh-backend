#!/bin/bash

echo "=== Production Deployment Script ==="
echo "Deploying Medh Backend with AWS Credential Verification"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if environment variable is set
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name is not set${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    fi
}

# Check required environment variables
echo "🔍 Checking Environment Variables..."
env_check_failed=false

check_env_var "IM_AWS_ACCESS_KEY" || env_check_failed=true
check_env_var "IM_AWS_SECRET_KEY" || env_check_failed=true
check_env_var "AWS_S3_BUCKET_NAME" || env_check_failed=true
check_env_var "AWS_REGION" || env_check_failed=true
check_env_var "MONGODB_URL" || env_check_failed=true
check_env_var "JWT_SECRET_KEY" || env_check_failed=true

if [ "$env_check_failed" = true ]; then
    echo -e "${RED}❌ Environment variable check failed!${NC}"
    echo "Please set all required environment variables before deployment."
    echo
    echo "Required variables:"
    echo "  IM_AWS_ACCESS_KEY=AKIA..."
    echo "  IM_AWS_SECRET_KEY=your_secret_key"
    echo "  AWS_S3_BUCKET_NAME=medhdocuments"
    echo "  AWS_REGION=ap-south-1"
    echo "  MONGODB_URL=mongodb://..."
    echo "  JWT_SECRET_KEY=your_jwt_secret"
    exit 1
fi

echo -e "${GREEN}✅ All environment variables are set${NC}"
echo

# Test AWS credentials
echo "🔐 Testing AWS Credentials..."
node fix-aws-credentials.js > /tmp/aws-test.log 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ AWS credentials test passed${NC}"
else
    echo -e "${RED}❌ AWS credentials test failed${NC}"
    echo "Check the log output:"
    cat /tmp/aws-test.log
    exit 1
fi

echo

# Install dependencies
echo "📦 Installing Dependencies..."
npm install --production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo

# Restart the application
echo "🔄 Restarting Application..."

if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart ecosystem.config.js --update-env
    echo -e "${GREEN}✅ Application restarted with PM2${NC}"
elif command -v docker-compose &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose restart
    echo -e "${GREEN}✅ Application restarted with Docker Compose${NC}"
elif command -v systemctl &> /dev/null; then
    echo "Using systemctl..."
    sudo systemctl restart medh-backend
    echo -e "${GREEN}✅ Application restarted with systemctl${NC}"
else
    echo -e "${YELLOW}⚠️  No process manager detected. Please restart your application manually.${NC}"
fi

echo

# Wait a moment for the application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Test the health endpoint
echo "🏥 Testing Application Health..."
if command -v curl &> /dev/null; then
    health_response=$(curl -s -w "%{http_code}" http://localhost:8080/health -o /dev/null)
    
    if [ "$health_response" = "200" ]; then
        echo -e "${GREEN}✅ Application is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check returned: $health_response${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping health check${NC}"
fi

echo
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo
echo "📋 Next Steps:"
echo "1. Test the course image upload endpoint"
echo "2. Monitor application logs for any errors"
echo "3. Verify all API endpoints are working correctly"
echo
echo "🔍 Troubleshooting:"
echo "- Check logs: pm2 logs (if using PM2)"
echo "- Test AWS: node fix-aws-credentials.js"
echo "- Check environment: printenv | grep -E '(AWS|MONGO|JWT)'" 