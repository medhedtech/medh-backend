#!/usr/bin/env node

/**
 * Final Redis Configuration Cleanup
 * 
 * This script completely cleans up Redis configuration and sets the correct one
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧹 Final Redis Configuration Cleanup...\n');

const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found .env file');
} else {
  console.log('❌ .env file not found');
  process.exit(1);
}

// Split content into lines
let lines = envContent.split('\n');

// Remove all Redis-related lines
lines = lines.filter(line => {
  const trimmedLine = line.trim();
  return !trimmedLine.startsWith('REDIS_') && 
         !trimmedLine.startsWith('# Redis') &&
         !trimmedLine.startsWith('# # Redis');
});

// Add the correct Redis configuration
const correctRedisConfig = `

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0
REDIS_EMAIL_DB=1
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_MAX_RECONNECT_ATTEMPTS=5
REDIS_POOL_SIZE=10
REDIS_PING_INTERVAL=30000
REDIS_KEY_PREFIX=medh:
REDIS_CLUSTER_ENABLED=false

# Email Queue Configuration
EMAIL_QUEUE_CONCURRENCY=10
EMAIL_RETRY_ATTEMPTS=5
EMAIL_RETRY_DELAY=30000
EMAIL_JOB_TIMEOUT=60000
EMAIL_RATE_LIMIT_MAX=100
EMAIL_RATE_LIMIT_WINDOW=60000
EMAIL_BATCH_SIZE=50
EMAIL_KEEP_COMPLETED=100
EMAIL_KEEP_FAILED=50`;

// Add the correct configuration
lines.push(correctRedisConfig);

// Write cleaned content back
const cleanedContent = lines.join('\n');

try {
  fs.writeFileSync(envPath, cleanedContent);
  console.log('✅ Cleaned up .env file with correct Redis configuration');
} catch (error) {
  console.log('❌ Failed to clean up .env file:', error.message);
  process.exit(1);
}

// Verify the cleanup
console.log('\n📋 Final Redis Configuration:');
const finalContent = fs.readFileSync(envPath, 'utf8');
const redisLines = finalContent.split('\n').filter(line => line.includes('REDIS_') && !line.startsWith('#'));

redisLines.forEach(line => {
  console.log(`   ${line}`);
});

console.log('\n📧 Email Queue Configuration:');
const emailLines = finalContent.split('\n').filter(line => line.includes('EMAIL_') && !line.startsWith('#'));

emailLines.forEach(line => {
  console.log(`   ${line}`);
});

console.log('\n✅ Final Redis configuration cleanup completed!');
console.log('💡 Redis is now properly configured for localhost with email queuing enabled.');
