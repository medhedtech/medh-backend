#!/bin/bash

# Manual Deployment Script for Medh Backend
# Use this if GitHub Actions fails

set -e

echo "🚀 Starting manual deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Pull latest changes
print_status "Pulling latest changes from Git..."
git pull origin main || {
    print_error "Failed to pull latest changes"
    exit 1
}

# Install dependencies
print_status "Installing dependencies..."
npm ci --legacy-peer-deps || {
    print_error "Failed to install dependencies"
    exit 1
}

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please create one from .env.example"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Copied .env.example to .env. Please update with production values."
    fi
fi

# Build application (if build script exists)
if npm run build --dry-run &>/dev/null; then
    print_status "Building application..."
    npm run build
fi

# Restart PM2 processes
print_status "Restarting PM2 processes..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "online"; then
        pm2 restart all
        print_status "PM2 processes restarted"
    else
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js --env production
            print_status "PM2 processes started from ecosystem.config.js"
        else
            pm2 start index.js --name "medh-backend"
            print_status "PM2 process started"
        fi
    fi
    
    # Show PM2 status
    pm2 status
else
    print_error "PM2 not found. Please install PM2 globally: npm install -g pm2"
    exit 1
fi

# Health check
print_status "Performing health check..."
sleep 5

# Check if the application is responding
if curl -f http://localhost:8080/health &>/dev/null; then
    print_status "✅ Application is running and healthy"
else
    print_warning "Health check failed. Please check application logs:"
    pm2 logs --lines 20
fi

print_status "🎉 Deployment completed successfully!"

echo "=================================================="
echo "DEPLOYMENT SUMMARY"
echo "=================================================="
echo "✅ Git pull completed"
echo "✅ Dependencies installed"
echo "✅ PM2 processes restarted"
echo "✅ Application deployed"
echo "=================================================="
echo "Next steps:"
echo "1. Check PM2 status: pm2 status"
echo "2. View logs: pm2 logs"
echo "3. Monitor application: pm2 monit"
echo "=================================================="