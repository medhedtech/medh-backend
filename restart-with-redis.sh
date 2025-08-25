#!/bin/bash

# Production Restart Script with Redis
echo "🔄 Restarting production services with Redis..."

# Check Redis status
echo "🔍 Checking Redis status..."
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis is running"
else
    echo "⚠️  Redis is not running, starting it..."
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
fi

# Stop all PM2 processes
echo "🛑 Stopping PM2 processes..."
pm2 stop all

# Clear PM2 logs
echo "🧹 Clearing PM2 logs..."
pm2 flush

# Start the application
echo "🚀 Starting application..."
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "✅ Production services restarted with Redis!"
echo "📊 Check logs with: pm2 logs"
echo "🧪 Test Redis with: node test-redis.js"
