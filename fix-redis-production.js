#!/usr/bin/env node

/**
 * Redis Production Fix Script
 * 
 * This script addresses Redis timeout errors in production by:
 * 1. Providing options to disable Redis
 * 2. Configuring Redis properly for production
 * 3. Updating environment variables
 * 
 * Usage:
 * node fix-redis-production.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔴 Fixing Redis Production Issues...\n');

// Check current environment
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found .env file');
} else {
  console.log('❌ .env file not found');
  process.exit(1);
}

// Check current Redis configuration
console.log('\n📊 Current Redis Configuration:');
const redisEnabled = envContent.includes('REDIS_ENABLED=true');
const redisHost = envContent.match(/REDIS_HOST=(.+)/)?.[1] || 'localhost';
const redisPort = envContent.match(/REDIS_PORT=(.+)/)?.[1] || '6379';

console.log(`   Redis Enabled: ${redisEnabled ? 'Yes' : 'No'}`);
console.log(`   Redis Host: ${redisHost}`);
console.log(`   Redis Port: ${redisPort}`);

// Provide options
console.log('\n🔧 Redis Configuration Options:');
console.log(`
1. Disable Redis (Recommended for quick fix)
   - This will disable Redis completely
   - Email queuing will be disabled
   - Cache will be disabled
   - Quick solution for timeout errors

2. Configure Redis properly
   - Install Redis on production server
   - Configure connection settings
   - More complex but full functionality

3. Use Cloud Redis service
   - AWS ElastiCache
   - Redis Cloud
   - Upstash Redis
   - Managed service solution
`);

// For now, let's implement the quick fix - disable Redis
console.log('\n🚀 Implementing Quick Fix: Disable Redis...');

let updatedEnvContent = envContent;

// Update Redis configuration
if (envContent.includes('REDIS_ENABLED=')) {
  updatedEnvContent = updatedEnvContent.replace(/REDIS_ENABLED=.+/, 'REDIS_ENABLED=false');
} else {
  updatedEnvContent += '\n# Redis Configuration (Disabled for production)\nREDIS_ENABLED=false\n';
}

// Add Redis timeout configurations for future use
if (!envContent.includes('REDIS_CONNECT_TIMEOUT=')) {
  updatedEnvContent += '\n# Redis Timeout Settings\n';
  updatedEnvContent += 'REDIS_CONNECT_TIMEOUT=10000\n';
  updatedEnvContent += 'REDIS_COMMAND_TIMEOUT=5000\n';
  updatedEnvContent += 'REDIS_MAX_RECONNECT_ATTEMPTS=3\n';
}

// Write updated .env file
try {
  fs.writeFileSync(envPath, updatedEnvContent);
  console.log('✅ Updated .env file with Redis disabled');
} catch (error) {
  console.log('❌ Failed to update .env file:', error.message);
  process.exit(1);
}

// Create Redis configuration guide
console.log('\n📚 Creating Redis Configuration Guide...');

const redisGuidePath = path.join(__dirname, 'REDIS_PRODUCTION_GUIDE.md');
const redisGuideContent = `# Redis Production Configuration Guide

## Current Status
- Redis is currently **DISABLED** to prevent timeout errors
- Email queuing is disabled
- Cache is disabled

## Options to Re-enable Redis

### Option 1: Install Redis on Production Server

1. Install Redis:
   \`\`\`bash
   sudo apt update
   sudo apt install redis-server
   \`\`\`

2. Configure Redis:
   \`\`\`bash
   sudo nano /etc/redis/redis.conf
   \`\`\`

3. Update configuration:
   \`\`\`
   bind 127.0.0.1
   port 6379
   timeout 300
   tcp-keepalive 60
   \`\`\`

4. Start Redis:
   \`\`\`bash
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   \`\`\`

5. Test connection:
   \`\`\`bash
   redis-cli ping
   \`\`\`

6. Update .env file:
   \`\`\`
   REDIS_ENABLED=true
   REDIS_HOST=localhost
   REDIS_PORT=6379
   \`\`\`

### Option 2: Use Cloud Redis Service

#### AWS ElastiCache
1. Create Redis cluster in AWS ElastiCache
2. Update .env file:
   \`\`\`
   REDIS_ENABLED=true
   REDIS_HOST=your-elasticache-endpoint.redis.amazonaws.com
   REDIS_PORT=6379
   \`\`\`

#### Redis Cloud
1. Sign up at https://redis.com/
2. Create database
3. Update .env file with provided credentials

#### Upstash Redis
1. Sign up at https://upstash.com/
2. Create Redis database
3. Update .env file with provided credentials

## Environment Variables

\`\`\`
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
\`\`\`

## Testing Redis Connection

1. Test from command line:
   \`\`\`bash
   redis-cli -h your-host -p your-port ping
   \`\`\`

2. Test from Node.js:
   \`\`\`javascript
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
   \`\`\`

## Troubleshooting

### Common Issues:
1. **Connection timeout**: Check firewall settings
2. **Authentication failed**: Verify password
3. **Host not found**: Check DNS resolution
4. **Port not accessible**: Check port configuration

### Debug Commands:
\`\`\`bash
# Check Redis status
sudo systemctl status redis-server

# Check Redis logs
sudo journalctl -u redis-server

# Test Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor
\`\`\`

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
`;

try {
  fs.writeFileSync(redisGuidePath, redisGuideContent);
  console.log('✅ Created Redis configuration guide: REDIS_PRODUCTION_GUIDE.md');
} catch (error) {
  console.log('❌ Failed to create Redis guide:', error.message);
}

// Create PM2 restart script
console.log('\n⚙️ Creating PM2 Restart Script...');

const pm2RestartPath = path.join(__dirname, 'restart-production.sh');
const pm2RestartContent = `#!/bin/bash

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
`;

try {
  fs.writeFileSync(pm2RestartPath, pm2RestartContent);
  fs.chmodSync(pm2RestartPath, '755');
  console.log('✅ Created PM2 restart script: restart-production.sh');
} catch (error) {
  console.log('❌ Failed to create PM2 restart script:', error.message);
}

console.log('\n✅ Redis production fix completed!');
console.log(`
📋 Next Steps:

1. Restart the backend server:
   pm2 restart all

2. Check the logs for Redis errors:
   pm2 logs

3. If you want to re-enable Redis later:
   - Follow the guide in REDIS_PRODUCTION_GUIDE.md
   - Update .env file with proper Redis configuration
   - Restart the server

4. Test the application:
   - Check if timeout errors are resolved
   - Test certificate generation functionality
   - Verify email functionality (may be disabled)

💡 Redis is now disabled to prevent timeout errors. 
   Email queuing and caching are disabled as a result.
`);
