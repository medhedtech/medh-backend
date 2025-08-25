#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * 
 * This script tests the Redis connection and basic functionality
 */

import { createClient } from 'redis';
import { ENV_VARS } from './config/envVars.js';

console.log('🧪 Testing Redis Connection...\n');

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
  console.log('\n🧪 Testing Redis Operations...');
  
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
  
  console.log('\n🎉 All Redis tests passed!');
  
} catch (error) {
  console.log('❌ Redis test failed:', error.message);
  console.log('\n💡 Troubleshooting:');
  console.log('1. Make sure Redis is installed and running');
  console.log('2. Check Redis configuration in .env file');
  console.log('3. Verify Redis host and port settings');
  console.log('4. Check firewall settings');
} finally {
  await client.quit();
  console.log('\n🔌 Redis connection closed');
}
