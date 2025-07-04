import dotenv from 'dotenv';
import { createClient } from 'redis';
import fs from 'fs';

// Load environment variables
dotenv.config();

console.log("===== ADVANCED REDIS CONNECTION TEST =====");
console.log("This test will compare different Redis connection methods");
console.log("\nEnvironment Variables:");
console.log(`REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);
console.log(`REDIS_HOST: ${process.env.REDIS_HOST}`);
console.log(`REDIS_PORT: ${process.env.REDIS_PORT}`);
console.log(`REDIS_PASSWORD is ${process.env.REDIS_PASSWORD ? 'set' : 'not set'}`);

// Write actual values to a file for debugging
fs.writeFileSync('redis-debug.json', JSON.stringify({
  REDIS_ENABLED: process.env.REDIS_ENABLED,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD_SET: !!process.env.REDIS_PASSWORD,
  NODE_ENV: process.env.NODE_ENV
}, null, 2));

console.log("\n----- TEST 1: Direct Redis Client -----");

const directClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD
});

directClient.on('error', err => console.error('Direct client error:', err));
directClient.on('connect', () => console.log('Direct client connected!'));
directClient.on('ready', () => console.log('Direct client ready'));

// Import the cache module for comparison
console.log("\n----- TEST 2: Cache Module Check -----");
import cache from './utils/cache.js';

// Get Redis connection status from cache
console.log("Cache module Redis status:", cache.getConnectionStatus());

async function runTests() {
  try {
    // Test direct client
    console.log("\nConnecting with direct client...");
    await directClient.connect();
    console.log("Direct client connected successfully");
    
    // Try a ping
    const pingResult = await directClient.ping();
    console.log(`Direct client ping result: ${pingResult}`);
    
    // Create another Redis connection with explicit parameters
    console.log("\n----- TEST 3: Alternative Connection Method -----");
    const alternativeClient = createClient({
      url: `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    
    alternativeClient.on('error', err => console.error('Alternative client error:', err));
    alternativeClient.on('connect', () => console.log('Alternative client connected!'));
    
    await alternativeClient.connect();
    const altPingResult = await alternativeClient.ping();
    console.log(`Alternative client ping result: ${altPingResult}`);
    
    // Compare cache implementation
    console.log("\n----- TEST 4: Cache Implementation Test -----");
    // Force cache to reinitialize
    await cache.init();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Updated cache module Redis status:", cache.getConnectionStatus());
    
    // Test get/set if connected
    if (cache.connected) {
      await cache.set('test-key', { success: true, timestamp: Date.now() });
      const result = await cache.get('test-key');
      console.log("Cache get/set test result:", result);
    }
    
    // Clean up
    await directClient.disconnect();
    await alternativeClient.disconnect();
    
    console.log("\n===== TEST COMPLETE =====");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the tests
runTests().catch(console.error); 