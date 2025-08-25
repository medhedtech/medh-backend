# Redis Enablement Guide for Production

## 🎯 Overview

This guide will help you enable Redis, email queuing, and caching in your production environment. Redis will provide:

- ✅ **Email Queuing**: Asynchronous email processing
- ✅ **Caching**: Improved performance and reduced database load
- ✅ **Session Storage**: Better session management
- ✅ **Rate Limiting**: Enhanced security and performance

## 🚀 Quick Start

### Step 1: Install Redis on Production Server

```bash
# Make the installation script executable
chmod +x install-redis.sh

# Run the installation script
./install-redis.sh
```

### Step 2: Test Redis Connection

```bash
# Test Redis connection and functionality
node test-redis.js
```

### Step 3: Restart Application with Redis

```bash
# Make the restart script executable
chmod +x restart-with-redis.sh

# Restart the application with Redis enabled
./restart-with-redis.sh
```

## 📋 Current Configuration

### Redis Settings
- **Host**: `localhost`
- **Port**: `6379`
- **Password**: None (local installation)
- **Database**: 
  - `0` - Main application cache
  - `1` - Email queue
- **Connection Pool**: 10 connections
- **Timeouts**: 10s connect, 5s command

### Email Queue Settings
- **Concurrency**: 10 workers
- **Retry Attempts**: 5
- **Retry Delay**: 30 seconds
- **Job Timeout**: 60 seconds
- **Rate Limit**: 100 emails per minute
- **Batch Size**: 50 emails

## 🔧 Manual Installation (Alternative)

If the automated script doesn't work, follow these manual steps:

### 1. Install Redis

```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test installation
redis-cli ping
```

### 2. Configure Redis

```bash
# Backup original config
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

Add these settings to `/etc/redis/redis.conf`:

```conf
# Basic settings
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60

# Performance settings
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### 3. Restart Redis

```bash
sudo systemctl restart redis-server
sudo systemctl status redis-server
```

## 🧪 Testing Redis

### 1. Command Line Test

```bash
# Test basic connection
redis-cli ping

# Test basic operations
redis-cli set test:key "Hello Redis"
redis-cli get test:key
redis-cli del test:key

# Check Redis info
redis-cli info
```

### 2. Node.js Test

```bash
# Run the test script
node test-redis.js
```

Expected output:
```
🧪 Testing Redis Connection...

🔧 Redis Configuration: { host: 'localhost', port: 6379, database: 0, hasPassword: false }
✅ Redis client connected
✅ Redis client ready

🧪 Testing Redis Operations...
✅ SET/GET test: PASSED
✅ DELETE test: PASSED
✅ PING test: PASSED
✅ INFO test: PASSED

🎉 All Redis tests passed!
```

## 📧 Email Queue Testing

### 1. Check Email Queue Status

```bash
# Check PM2 logs for email queue
pm2 logs | grep -i email

# Check Redis for email queue data
redis-cli -n 1 keys "*email*"
```

### 2. Test Email Functionality

1. Try to register a new user
2. Check if confirmation email is sent
3. Monitor email queue logs

### 3. Email Queue Monitoring

```bash
# Monitor email queue in real-time
redis-cli -n 1 monitor

# Check email queue statistics
redis-cli -n 1 info keyspace
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Redis Connection Failed

**Error**: `Redis connection failed: connect ECONNREFUSED`

**Solution**:
```bash
# Check if Redis is running
sudo systemctl status redis-server

# Start Redis if not running
sudo systemctl start redis-server

# Check Redis logs
sudo journalctl -u redis-server
```

#### 2. Redis Authentication Failed

**Error**: `Redis authentication failed`

**Solution**:
```bash
# Check if password is set in .env
grep REDIS_PASSWORD .env

# If password is set but not needed for local Redis, remove it
# Edit .env file and set: REDIS_PASSWORD=
```

#### 3. Email Queue Not Working

**Error**: `Email queue error`

**Solution**:
```bash
# Check email queue configuration
grep EMAIL_QUEUE .env

# Restart the application
pm2 restart all

# Check email service logs
pm2 logs | grep -i email
```

#### 4. High Memory Usage

**Error**: `Redis memory usage high`

**Solution**:
```bash
# Check Redis memory usage
redis-cli info memory

# Clear old cache data
redis-cli flushdb

# Adjust maxmemory in redis.conf
sudo nano /etc/redis/redis.conf
# Set: maxmemory 512mb
```

### Debug Commands

```bash
# Check Redis status
sudo systemctl status redis-server

# Check Redis logs
sudo journalctl -u redis-server -f

# Monitor Redis commands
redis-cli monitor

# Check Redis memory
redis-cli info memory

# Check Redis clients
redis-cli client list

# Check PM2 logs
pm2 logs

# Check application logs
pm2 logs | grep -i redis
```

## 📊 Monitoring

### 1. Redis Performance

```bash
# Monitor Redis performance
redis-cli info stats

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients
```

### 2. Email Queue Performance

```bash
# Check email queue size
redis-cli -n 1 llen email-queue

# Check failed jobs
redis-cli -n 1 llen email-queue:failed

# Monitor email processing
pm2 logs | grep -i email
```

### 3. Application Performance

```bash
# Check application status
pm2 status

# Monitor application logs
pm2 logs

# Check system resources
htop
```

## 🔄 Maintenance

### 1. Regular Cleanup

```bash
# Clear old cache data (run weekly)
redis-cli flushdb

# Clear old email queue data (run daily)
redis-cli -n 1 flushdb

# Restart Redis (run monthly)
sudo systemctl restart redis-server
```

### 2. Backup Redis Data

```bash
# Create backup directory
sudo mkdir -p /var/backups/redis

# Backup Redis data
sudo cp /var/lib/redis/dump.rdb /var/backups/redis/dump-$(date +%Y%m%d).rdb

# Backup Redis configuration
sudo cp /etc/redis/redis.conf /var/backups/redis/redis-$(date +%Y%m%d).conf
```

### 3. Update Redis

```bash
# Update Redis (when needed)
sudo apt update
sudo apt upgrade redis-server

# Restart Redis after update
sudo systemctl restart redis-server
```

## 🚨 Security Considerations

### 1. Network Security

- Redis is bound to `127.0.0.1` (localhost only)
- No external access by default
- Use firewall rules if needed

### 2. Authentication

- No password for local Redis (recommended for single server)
- Use strong passwords for remote Redis
- Consider Redis ACLs for advanced security

### 3. Data Protection

- Regular backups
- Monitor memory usage
- Set appropriate maxmemory policy

## 📈 Performance Optimization

### 1. Redis Configuration

```conf
# Optimize for performance
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### 2. Application Configuration

```bash
# Optimize connection pool
REDIS_POOL_SIZE=20

# Optimize timeouts
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000

# Optimize email queue
EMAIL_QUEUE_CONCURRENCY=20
EMAIL_BATCH_SIZE=100
```

## ✅ Verification Checklist

After enabling Redis, verify these items:

- [ ] Redis server is running (`sudo systemctl status redis-server`)
- [ ] Redis connection test passes (`node test-redis.js`)
- [ ] Application starts without Redis errors (`pm2 logs`)
- [ ] Email queue is working (test user registration)
- [ ] Caching is working (check response times)
- [ ] Memory usage is reasonable (`redis-cli info memory`)
- [ ] No timeout errors in logs (`pm2 logs | grep timeout`)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Redis logs: `sudo journalctl -u redis-server`
3. Review application logs: `pm2 logs`
4. Test Redis connection: `node test-redis.js`
5. Check system resources: `htop`

---

**Status**: ✅ Redis Enabled for Production
**Last Updated**: August 25, 2025
**Next Review**: After deployment verification
