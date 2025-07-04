#!/bin/bash

# Fix Production Environment Variables for MEDH Backend
# This script adds the missing AWS environment variables that are causing the application to crash

set -e

echo "🔧 Fixing MEDH Backend Environment Variables..."

# Define the deployment directory
DEPLOY_DIR="/home/ubuntu/actions-runner/_work/medh-backend/medh-backend"

# Check if the directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "❌ Deployment directory not found: $DEPLOY_DIR"
    exit 1
fi

cd "$DEPLOY_DIR"

# Create or update the .env file with required variables
echo "📝 Adding missing AWS environment variables..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in $DEPLOY_DIR"
    echo "Creating basic .env file..."
    cat > .env << EOF
# Core Application Configuration
NODE_ENV=production
PORT=8080

# Database Configuration
MONGODB_URL=mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB

# JWT Configuration
JWT_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://medh.co,https://www.medh.co,https://api.medh.co

# AWS Configuration
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=medhdocuments

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=api.medh.co
REDIS_PORT=6379
REDIS_PASSWORD=Medh&567%@

# Email Configuration
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=465
EMAIL_USER=AKIAU6VTTMQEWBXKX5ZS
EMAIL_PASS=BBqpvqKF5HS2+PHWBparjgjallqQU4Bu5GPj/UPrk465
EMAIL_FROM=Medh No-Reply <noreply@medh.co>
EOF
fi

# Add the missing IM_AWS_ACCESS_KEY and IM_AWS_SECRET_KEY if they don't exist
if ! grep -q "IM_AWS_ACCESS_KEY" .env; then
    echo "Adding IM_AWS_ACCESS_KEY to .env..."
    echo "" >> .env
    echo "# Image/Media AWS Configuration (Required by backend)" >> .env
    echo "IM_AWS_ACCESS_KEY=AKIAU6VTTMQEZIR67CE6" >> .env
    echo "IM_AWS_SECRET_KEY=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" >> .env
else
    echo "✅ IM_AWS_ACCESS_KEY already exists in .env"
fi

# Verify the required variables are now present
echo "🔍 Verifying environment variables..."

required_vars=("IM_AWS_ACCESS_KEY" "IM_AWS_SECRET_KEY" "AWS_REGION" "AWS_S3_BUCKET_NAME")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required AWS environment variables are present"
else
    echo "❌ Still missing variables: ${missing_vars[*]}"
    exit 1
fi

# Set proper permissions
chmod 600 .env
echo "🔒 Set secure permissions on .env file"

# Update PM2 ecosystem config to use environment file
echo "📋 Updating PM2 configuration..."

# Create updated ecosystem config that uses .env file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'medh-backend',
      script: 'index.js',
      cwd: '/home/ubuntu/actions-runner/_work/medh-backend/medh-backend',
      instances: 1,
      exec_mode: 'fork',
      
      // Use .env file for environment variables
      env_file: '.env',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      
      // Logging configuration
      log_file: '/home/ubuntu/.pm2/logs/medh-backend-combined.log',
      out_file: '/home/ubuntu/.pm2/logs/medh-backend-out.log',
      error_file: '/home/ubuntu/.pm2/logs/medh-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // Restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Source configuration
      source_map_support: true,
      
      // Additional process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Advanced restart strategies
      exp_backoff_restart_delay: 100,
      
      // Process cleanup
      force: false,
      
      // Ignore specific signals
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups', 'coverage'],
      
      // Process title for easier identification
      name: 'medh-api-server',
      
      // Error handling
      combine_logs: true,
      
      // Node.js specific options
      node_args: '--max-old-space-size=1024 --unhandled-rejections=strict',
      
      // Graceful shutdown
      shutdown_with_message: true,
    }
  ]
};
EOF

echo "✅ Updated ecosystem.config.js to use .env file"

# Restart PM2 with the updated configuration
echo "🔄 Restarting PM2 application..."
pm2 delete all || true
pm2 start ecosystem.config.js
pm2 save

echo "🎉 Environment fix completed!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 To verify the fix:"
echo "1. Check PM2 logs: pm2 logs"
echo "2. Check application health: curl http://localhost:8080/api/v1/health"
echo "3. Monitor for crashes: pm2 monit"

echo ""
echo "🔧 If you still see issues:"
echo "1. Check PM2 logs: pm2 logs index --lines 50"
echo "2. Verify .env file: cat .env | grep IM_AWS"
echo "3. Test AWS connectivity manually" 