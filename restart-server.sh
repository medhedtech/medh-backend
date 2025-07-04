#!/bin/bash

# Medh Backend Restart Script
# This script safely restarts the Medh backend application using PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Change to application directory
APP_DIR="/home/ubuntu/actions-runner/_work/medh-backend/medh-backend"
cd "$APP_DIR" || {
    error "Failed to change to application directory: $APP_DIR"
    exit 1
}

log "Starting Medh Backend Server Restart Process..."
info "Working directory: $(pwd)"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed or not in PATH"
    exit 1
fi

# Check if ecosystem config exists
if [ ! -f "ecosystem.config.js" ]; then
    error "ecosystem.config.js not found in current directory"
    exit 1
fi

# Stop existing PM2 processes
log "Stopping existing PM2 processes..."
pm2 stop all || warn "No PM2 processes were running"

# Delete existing PM2 processes
log "Deleting existing PM2 processes..."
pm2 delete all || warn "No PM2 processes to delete"

# Clear PM2 logs
log "Clearing PM2 logs..."
pm2 flush || warn "Failed to clear PM2 logs"

# Wait a moment for cleanup
sleep 2

# Start the application using ecosystem config
log "Starting application with PM2 ecosystem config..."
pm2 start ecosystem.config.js

# Wait for application to start
sleep 5

# Check PM2 status
log "Checking PM2 status..."
pm2 status

# Show recent logs
log "Showing recent application logs..."
pm2 logs --lines 20

# Save PM2 configuration
log "Saving PM2 configuration..."
pm2 save

log "Server restart completed successfully!"
info "To monitor logs in real-time, use: pm2 logs"
info "To check status, use: pm2 status"
info "To stop the server, use: pm2 stop all" 