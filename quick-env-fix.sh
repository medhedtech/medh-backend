#!/bin/bash

# Quick fix for missing AWS environment variables on production server
# Run this on the production server as the ubuntu user

echo "🚀 Quick Environment Fix for MEDH Backend"

# Navigate to the deployment directory
cd /home/ubuntu/actions-runner/_work/medh-backend/medh-backend

# Add missing environment variables to .env file
echo "" >> .env
echo "# Image/Media AWS Configuration (Required by backend)" >> .env
echo "IM_AWS_ACCESS_KEY=AKIAU6VTTMQEZIR67CE6" >> .env
echo "IM_AWS_SECRET_KEY=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" >> .env

echo "✅ Added missing AWS environment variables"

# Set proper permissions
chmod 600 .env

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart all

echo "🎉 Quick fix applied! Check PM2 status:"
pm2 status

echo ""
echo "Monitor logs with: pm2 logs" 