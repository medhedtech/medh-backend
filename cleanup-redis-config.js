#!/usr/bin/env node

/**
 * Cleanup Redis Configuration Script
 * 
 * This script removes duplicate Redis configuration entries from .env file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧹 Cleaning up Redis configuration...\n');

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

// Remove commented out Redis configuration
lines = lines.filter(line => !line.trim().startsWith('# # Redis Configuration'));

// Keep only the latest Redis configuration (the one we just added)
let redisSectionFound = false;
let cleanedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // If we find the start of Redis configuration
  if (line.includes('# Redis Configuration') && !line.startsWith('#')) {
    if (redisSectionFound) {
      // Skip this duplicate section
      console.log('🗑️  Removing duplicate Redis configuration...');
      continue;
    }
    redisSectionFound = true;
  }
  
  // If we're in a Redis configuration section, check if it's the old one
  if (redisSectionFound && line.includes('REDIS_HOST=api.medh.co')) {
    console.log('🗑️  Removing old Redis configuration with api.medh.co...');
    // Skip this old configuration
    continue;
  }
  
  // If we find the end of Redis configuration (empty line or new section)
  if (redisSectionFound && (line.trim() === '' || (line.startsWith('#') && !line.includes('Redis')))) {
    redisSectionFound = false;
  }
  
  cleanedLines.push(line);
}

// Write cleaned content back
const cleanedContent = cleanedLines.join('\n');

try {
  fs.writeFileSync(envPath, cleanedContent);
  console.log('✅ Cleaned up .env file');
} catch (error) {
  console.log('❌ Failed to clean up .env file:', error.message);
  process.exit(1);
}

// Verify the cleanup
console.log('\n📋 Current Redis Configuration:');
const finalContent = fs.readFileSync(envPath, 'utf8');
const redisLines = finalContent.split('\n').filter(line => line.includes('REDIS_') && !line.startsWith('#'));

redisLines.forEach(line => {
  console.log(`   ${line}`);
});

console.log('\n✅ Redis configuration cleanup completed!');
console.log('💡 The .env file now has clean, non-duplicate Redis configuration.');
