#!/bin/bash

# Redis Installation Script for Ubuntu/Debian
echo "🔴 Installing Redis for production..."

# Update package list
sudo apt update

# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Update Redis configuration
sudo tee /etc/redis/redis.conf > /dev/null << 'EOF'
# Redis configuration for production
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
EOF

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
echo "🧪 Testing Redis connection..."
redis-cli ping

# Show Redis status
echo "📊 Redis status:"
sudo systemctl status redis-server

echo "✅ Redis installation completed!"
echo "💡 Redis is now running on localhost:6379"
