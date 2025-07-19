#!/usr/bin/env node

/**
 * Script to inspect user documents structure
 */

import mongoose from 'mongoose';
import { ENV_VARS } from '../config/envVars.js';

async function inspectUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get a few sample users to see their structure
    console.log('Sample users with null student_id:');
    const sampleUsers = await usersCollection.find(
      { student_id: null },
      { projection: { email: 1, role: 1, student_id: 1, is_demo: 1 } }
    ).limit(3).toArray();
    
    sampleUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`, JSON.stringify(user, null, 2));
    });

    // Now let's try to update one specific user to test
    const testUser = sampleUsers[0];
    if (testUser) {
      console.log(`\nTesting update on user: ${testUser.email}`);
      
      // Check current value
      const beforeUpdate = await usersCollection.findOne({ _id: testUser._id });
      console.log('Before update - student_id:', beforeUpdate.student_id);
      console.log('Before update - has student_id field:', beforeUpdate.hasOwnProperty('student_id'));
      
      // Try to unset the field
      const updateResult = await usersCollection.updateOne(
        { _id: testUser._id },
        { $unset: { student_id: "" } }
      );
      console.log('Update result:', updateResult);
      
      // Check after update
      const afterUpdate = await usersCollection.findOne({ _id: testUser._id });
      console.log('After update - student_id:', afterUpdate.student_id);
      console.log('After update - has student_id field:', afterUpdate.hasOwnProperty('student_id'));
    }
    
  } catch (error) {
    console.error('Error inspecting users:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the inspection
inspectUsers().catch(console.error);