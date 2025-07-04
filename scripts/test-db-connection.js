#!/usr/bin/env node

import { ENV_VARS } from '../config/envVars.js';
import connectDB from '../config/db.js';
import User from '../models/user-modal.js';
import dbUtils from '../utils/dbUtils.js';
import logger from '../utils/logger.js';

/**
 * Test database connection and operations
 */
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection and operations...\n');

  try {
    // Test 1: Connect to database
    console.log('1. Testing database connection...');
    await connectDB();
    console.log('✅ Database connection successful\n');

    // Test 2: Check connection health
    console.log('2. Testing connection health check...');
    const health = await dbUtils.checkConnectionHealth();
    console.log('✅ Health check result:', JSON.stringify(health, null, 2));
    console.log('');

    // Test 3: Test basic find operation
    console.log('3. Testing basic find operation...');
    const userCount = await dbUtils.countDocuments(User, {});
    console.log('✅ Total users in database:', userCount);
    console.log('');

    // Test 4: Test find operation with timeout
    console.log('4. Testing find operation with retry logic...');
    const testUser = await dbUtils.findOne(User, { email: { $exists: true } });
    if (testUser) {
      console.log('✅ Found test user:', testUser.email);
    } else {
      console.log('ℹ️  No users found in database');
    }
    console.log('');

    // Test 5: Test error handling with invalid query
    console.log('5. Testing error handling...');
    try {
      await dbUtils.findById(User, 'invalid-id');
      console.log('❌ Should have thrown an error for invalid ID');
    } catch (error) {
      console.log('✅ Error handling works:', error.message);
    }
    console.log('');

    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  }
}

/**
 * Test login operation specifically
 */
async function testLoginOperation() {
  console.log('🔍 Testing login operation...\n');

  try {
    await connectDB();
    
    console.log('Testing user lookup by email...');
    const testEmail = 'test@example.com';
    
    // Test the exact operation that was failing
    const user = await dbUtils.findOne(User, { email: testEmail.toLowerCase() });
    
    if (user) {
      console.log('✅ User found:', user.email);
    } else {
      console.log('ℹ️  User not found (this is expected for test email)');
    }
    
    console.log('✅ Login operation test completed successfully');
    
  } catch (error) {
    console.error('❌ Login operation test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  }
}

// Run tests based on command line argument
const testType = process.argv[2] || 'all';

if (testType === 'login') {
  testLoginOperation();
} else {
  testDatabaseConnection();
} 