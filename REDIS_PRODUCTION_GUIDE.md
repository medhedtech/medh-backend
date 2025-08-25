# Redis Production Configuration Guide

## Current Status
- Redis is currently **DISABLED** to prevent timeout errors
- Email queuing is disabled
- Cache is disabled

## Options to Re-enable Redis

### Option 1: Install Redis on Production Server

1. Install Redis:
   ```bash
   sudo apt update
   sudo apt install redis-server
   ```

2. Configure Redis:
   ```bash
   sudo nano /etc/redis/redis.conf
   ```

3. Update configuration:
   ```
   bind 127.0.0.1
   port 6379
   timeout 300
   tcp-keepalive 60
   ```

4. Start Redis:
   ```bash
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   ```

5. Test connection:
   ```bash
   redis-cli ping
   ```

6. Update .env file:
   ```
   REDIS_ENABLED=true
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Option 2: Use Cloud Redis Service

#### AWS ElastiCache
1. Create Redis cluster in AWS ElastiCache
2. Update .env file:
   ```
   REDIS_ENABLED=true
   REDIS_HOST=your-elasticache-endpoint.redis.amazonaws.com
   REDIS_PORT=6379
   ```

#### Redis Cloud
1. Sign up at https://redis.com/
2. Create database
3. Update .env file with provided credentials

#### Upstash Redis
1. Sign up at https://upstash.com/
2. Create Redis database
3. Update .env file with provided credentials

## Environment Variables

```
# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DATABASE=0

# Redis Timeout Settings
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_MAX_RECONNECT_ATTEMPTS=3

# Redis Pool Settings
REDIS_POOL_SIZE=5
REDIS_PING_INTERVAL=30000
```

## Testing Redis Connection

1. Test from command line:
   ```bash
   redis-cli -h your-host -p your-port ping
   ```

2. Test from Node.js:
   ```javascript
   import { createClient } from 'redis';
   
   const client = createClient({
     socket: {
       host: process.env.REDIS_HOST,
       port: process.env.REDIS_PORT
     }
   });
   
   await client.connect();
   const result = await client.ping();
   console.log('Redis ping result:', result);
   ```

## Troubleshooting

### Common Issues:
1. **Connection timeout**: Check firewall settings
2. **Authentication failed**: Verify password
3. **Host not found**: Check DNS resolution
4. **Port not accessible**: Check port configuration

### Debug Commands:
```bash
# Check Redis status
sudo systemctl status redis-server

# Check Redis logs
sudo journalctl -u redis-server

# Test Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor
```

## Performance Optimization

1. **Connection Pooling**: Already configured in the application
2. **Pipelining**: Enabled for better performance
3. **Memory Management**: Configure maxmemory policy
4. **Persistence**: Configure RDB/AOF as needed

## Security Considerations

1. **Authentication**: Always use strong passwords
2. **Network Security**: Use VPC/private networks
3. **Encryption**: Enable TLS for sensitive data
4. **Access Control**: Limit access to Redis port
