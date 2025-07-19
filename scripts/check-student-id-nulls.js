#!/usr/bin/env node

/**
 * Script to check for null student_id values in the database
 */

import mongoose from 'mongoose';
import { ENV_VARS } from '../config/envVars.js';

async function checkStudentIdNulls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Count users with null student_id
    const nullStudentIdCount = await usersCollection.countDocuments({
      student_id: null
    });
    console.log(`Users with student_id: null - ${nullStudentIdCount}`);

    // Count users with undefined student_id
    const undefinedStudentIdCount = await usersCollection.countDocuments({
      student_id: { $exists: false }
    });
    console.log(`Users with undefined student_id - ${undefinedStudentIdCount}`);

    // Count users with valid student_id
    const validStudentIdCount = await usersCollection.countDocuments({
      student_id: { $exists: true, $ne: null }
    });
    console.log(`Users with valid student_id - ${validStudentIdCount}`);

    // Show some examples of users with null student_id
    if (nullStudentIdCount > 0) {
      console.log('\nSample users with null student_id:');
      const sampleUsers = await usersCollection.find(
        { student_id: null },
        { projection: { email: 1, role: 1, student_id: 1, is_demo: 1 } }
      ).limit(5).toArray();
      
      sampleUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Demo: ${user.is_demo}, Student ID: ${user.student_id}`);
      });
    }

    // Try to create a test document with null student_id to see if it fails
    console.log('\nTesting duplicate null student_id insertion...');
    try {
      await usersCollection.insertOne({
        email: 'test-null-1@example.com',
        full_name: 'Test User 1',
        student_id: null,
        role: 'instructor',
        password: 'test123',
        created_at: new Date()
      });
      console.log('First null student_id insertion: SUCCESS');

      await usersCollection.insertOne({
        email: 'test-null-2@example.com',
        full_name: 'Test User 2',
        student_id: null,
        role: 'instructor', 
        password: 'test123',
        created_at: new Date()
      });
      console.log('Second null student_id insertion: SUCCESS (this should not happen with non-sparse index!)');
      
      // Clean up test documents
      await usersCollection.deleteMany({
        email: { $in: ['test-null-1@example.com', 'test-null-2@example.com'] }
      });
      console.log('Test documents cleaned up');
      
    } catch (error) {
      console.log('Duplicate null student_id insertion failed as expected:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking student_id nulls:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the check
checkStudentIdNulls().catch(console.error);