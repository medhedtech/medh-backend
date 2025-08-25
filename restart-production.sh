#!/bin/bash

# Production Restart Script
echo "🔄 Restarting production services..."

# Stop all PM2 processes
pm2 stop all

# Clear PM2 logs
pm2 flush

# Start the application
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Show status
pm2 status

echo "✅ Production services restarted successfully!"
echo "📊 Check logs with: pm2 logs"
