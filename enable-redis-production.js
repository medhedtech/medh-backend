#!/usr/bin/env node

/**
 * Enable Redis Production Script
 * 
 * This script properly configures Redis for production use with:
 * 1. Email queuing enabled
 * 2. Caching enabled
 * 3. Proper connection settings
 * 
 * Usage:
 * node enable-redis-production.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔴 Enabling Redis for Production...\n');

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

// Provide Redis configuration options
console.log('\n🔧 Redis Configuration Options:');
console.log(`
1. Local Redis (Recommended for single server)
   - Install Redis on the same server
   - Use localhost:6379
   - Simple setup, good performance

2. Cloud Redis Service
   - AWS ElastiCache
   - Redis Cloud
   - Upstash Redis
   - Managed service, better scalability

3. Remote Redis Server
   - Dedicated Redis server
   - Custom host and port
   - More complex setup
`);

// For now, let's configure for local Redis (most common)
console.log('\n🚀 Configuring for Local Redis...');

let updatedEnvContent = envContent;

// Update Redis configuration for local setup
const redisConfig = {
  enabled: 'REDIS_ENABLED=true',
  host: 'REDIS_HOST=localhost',
  port: 'REDIS_PORT=6379',
  password: 'REDIS_PASSWORD=',
  database: 'REDIS_DATABASE=0',
  emailDb: 'REDIS_EMAIL_DB=1',
  connectTimeout: 'REDIS_CONNECT_TIMEOUT=10000',
  commandTimeout: 'REDIS_COMMAND_TIMEOUT=5000',
  maxReconnectAttempts: 'REDIS_MAX_RECONNECT_ATTEMPTS=5',
  poolSize: 'REDIS_POOL_SIZE=10',
  pingInterval: 'REDIS_PING_INTERVAL=30000',
  keyPrefix: 'REDIS_KEY_PREFIX=medh:',
  clusterEnabled: 'REDIS_CLUSTER_ENABLED=false'
};

// Update or add Redis configuration
Object.entries(redisConfig).forEach(([key, value]) => {
  const regex = new RegExp(`^${key.split('=')[0]}=.*`, 'm');
  if (envContent.match(regex)) {
    updatedEnvContent = updatedEnvContent.replace(regex, value);
  } else {
    // Add to the end of the file
    updatedEnvContent += `\n${value}`;
  }
});

// Add email queue configuration
const emailQueueConfig = {
  emailQueueConcurrency: 'EMAIL_QUEUE_CONCURRENCY=10',
  emailRetryAttempts: 'EMAIL_RETRY_ATTEMPTS=5',
  emailRetryDelay: 'EMAIL_RETRY_DELAY=30000',
  emailJobTimeout: 'EMAIL_JOB_TIMEOUT=60000',
  emailRateLimitMax: 'EMAIL_RATE_LIMIT_MAX=100',
  emailRateLimitWindow: 'EMAIL_RATE_LIMIT_WINDOW=60000',
  emailBatchSize: 'EMAIL_BATCH_SIZE=50',
  emailKeepCompleted: 'EMAIL_KEEP_COMPLETED=100',
  emailKeepFailed: 'EMAIL_KEEP_FAILED=50'
};

// Add email queue configuration
Object.entries(emailQueueConfig).forEach(([key, value]) => {
  const regex = new RegExp(`^${key.split('=')[0]}=.*`, 'm');
  if (!envContent.match(regex)) {
    updatedEnvContent += `\n${value}`;
  }
});

// Write updated .env file
try {
  fs.writeFileSync(envPath, updatedEnvContent);
  console.log('✅ Updated .env file with Redis configuration');
} catch (error) {
  console.log('❌ Failed to update .env file:', error.message);
  process.exit(1);
}

// Create Redis installation script
console.log('\n📦 Creating Redis Installation Script...');

const installRedisPath = path.join(__dirname, 'install-redis.sh');
const installRedisContent = `#!/bin/bash

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
`;

try {
  fs.writeFileSync(installRedisPath, installRedisContent);
  fs.chmodSync(installRedisPath, '755');
  console.log('✅ Created Redis installation script: install-redis.sh');
} catch (error) {
  console.log('❌ Failed to create Redis installation script:', error.message);
}

// Create Redis test script
console.log('\n🧪 Creating Redis Test Script...');

const testRedisPath = path.join(__dirname, 'test-redis.js');
const testRedisContent = `#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * 
 * This script tests the Redis connection and basic functionality
 */

import { createClient } from 'redis';
import { ENV_VARS } from './config/envVars.js';

console.log('🧪 Testing Redis Connection...\\n');

const redisConfig = {
  socket: {
    host: ENV_VARS.REDIS_HOST || 'localhost',
    port: ENV_VARS.REDIS_PORT || 6379,
    connectTimeout: parseInt(ENV_VARS.REDIS_CONNECT_TIMEOUT, 10) || 10000,
    commandTimeout: parseInt(ENV_VARS.REDIS_COMMAND_TIMEOUT, 10) || 5000,
  },
  password: ENV_VARS.REDIS_PASSWORD || undefined,
  database: parseInt(ENV_VARS.REDIS_DATABASE, 10) || 0,
};

console.log('🔧 Redis Configuration:', {
  host: redisConfig.socket.host,
  port: redisConfig.socket.port,
  database: redisConfig.database,
  hasPassword: !!redisConfig.password
});

const client = createClient(redisConfig);

client.on('connect', () => {
  console.log('✅ Redis client connected');
});

client.on('ready', () => {
  console.log('✅ Redis client ready');
});

client.on('error', (err) => {
  console.log('❌ Redis client error:', err.message);
});

client.on('end', () => {
  console.log('🔌 Redis client disconnected');
});

try {
  await client.connect();
  
  // Test basic operations
  console.log('\\n🧪 Testing Redis Operations...');
  
  // Test SET/GET
  await client.set('test:key', 'test:value');
  const value = await client.get('test:key');
  console.log('✅ SET/GET test:', value === 'test:value' ? 'PASSED' : 'FAILED');
  
  // Test DELETE
  await client.del('test:key');
  const deletedValue = await client.get('test:key');
  console.log('✅ DELETE test:', deletedValue === null ? 'PASSED' : 'FAILED');
  
  // Test PING
  const pingResult = await client.ping();
  console.log('✅ PING test:', pingResult === 'PONG' ? 'PASSED' : 'FAILED');
  
  // Test INFO
  const info = await client.info();
  console.log('✅ INFO test: PASSED');
  
  console.log('\\n🎉 All Redis tests passed!');
  
} catch (error) {
  console.log('❌ Redis test failed:', error.message);
  console.log('\\n💡 Troubleshooting:');
  console.log('1. Make sure Redis is installed and running');
  console.log('2. Check Redis configuration in .env file');
  console.log('3. Verify Redis host and port settings');
  console.log('4. Check firewall settings');
} finally {
  await client.quit();
  console.log('\\n🔌 Redis connection closed');
}
`;

try {
  fs.writeFileSync(testRedisPath, testRedisContent);
  fs.chmodSync(testRedisPath, '755');
  console.log('✅ Created Redis test script: test-redis.js');
} catch (error) {
  console.log('❌ Failed to create Redis test script:', error.message);
}

// Create PM2 restart script with Redis
console.log('\n⚙️ Creating PM2 Restart Script...');

const pm2RestartPath = path.join(__dirname, 'restart-with-redis.sh');
const pm2RestartContent = `#!/bin/bash

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
`;

try {
  fs.writeFileSync(pm2RestartPath, pm2RestartContent);
  fs.chmodSync(pm2RestartPath, '755');
  console.log('✅ Created PM2 restart script: restart-with-redis.sh');
} catch (error) {
  console.log('❌ Failed to create PM2 restart script:', error.message);
}

console.log('\n✅ Redis production setup completed!');
console.log(`
📋 Next Steps:

1. Install Redis on your production server:
   chmod +x install-redis.sh
   ./install-redis.sh

2. Test Redis connection:
   node test-redis.js

3. Restart the application with Redis:
   chmod +x restart-with-redis.sh
   ./restart-with-redis.sh

4. Verify functionality:
   - Check PM2 logs: pm2 logs
   - Test email queuing
   - Test caching functionality
   - Monitor Redis performance

🔧 Redis Configuration:
   - Host: localhost
   - Port: 6379
   - Database: 0 (main), 1 (email queue)
   - Connection Pool: 10 connections
   - Timeout: 10 seconds connect, 5 seconds command

📧 Email Queue Configuration:
   - Concurrency: 10 workers
   - Retry attempts: 5
   - Retry delay: 30 seconds
   - Job timeout: 60 seconds
   - Rate limit: 100 emails per minute

💡 If you prefer a cloud Redis service:
   - Follow the guide in REDIS_PRODUCTION_GUIDE.md
   - Update the .env file with cloud credentials
   - Restart the application
`);
