#!/usr/bin/env node

/**
 * Script to remove explicit null student_id values from users who shouldn't have them
 * This will convert student_id: null to undefined (field not present) for non-student users
 */

import mongoose from 'mongoose';
import { ENV_VARS } from '../config/envVars.js';

async function fixNullStudentIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // First, let's see which users have null student_id
    const usersWithNullStudentId = await usersCollection.find(
      { student_id: null },
      { projection: { email: 1, role: 1, student_id: 1, is_demo: 1 } }
    ).toArray();

    console.log(`Found ${usersWithNullStudentId.length} users with student_id: null`);

    // Define student roles
    const studentRoles = ['student', 'corporate-student'];
    
    // Separate users into those who should and shouldn't have student_id
    const shouldHaveStudentId = [];
    const shouldNotHaveStudentId = [];

    for (const user of usersWithNullStudentId) {
      const userRoles = Array.isArray(user.role) ? user.role : [user.role];
      const hasStudentRole = userRoles.some(role => studentRoles.includes(role)) || user.is_demo;
      
      if (hasStudentRole) {
        shouldHaveStudentId.push(user);
      } else {
        shouldNotHaveStudentId.push(user);
      }
    }

    console.log(`\nUsers who should have student_id (will keep null for now): ${shouldHaveStudentId.length}`);
    console.log(`Users who should NOT have student_id (will remove field): ${shouldNotHaveStudentId.length}`);

    if (shouldNotHaveStudentId.length > 0) {
      console.log('\nRemoving student_id field from non-student users...');
      
      // Remove the student_id field entirely for non-student users
      const result = await usersCollection.updateMany(
        { 
          _id: { $in: shouldNotHaveStudentId.map(u => u._id) },
          student_id: null
        },
        { 
          $unset: { student_id: "" } 
        }
      );
      
      console.log(`Updated ${result.modifiedCount} users - removed student_id field`);
    }

    // Show remaining users with null student_id (these should be students/demo users)
    const remainingNullStudentId = await usersCollection.countDocuments({
      student_id: null
    });
    console.log(`\nRemaining users with student_id: null: ${remainingNullStudentId}`);

    if (remainingNullStudentId > 0) {
      console.log('These users should have student IDs generated. Showing sample:');
      const samples = await usersCollection.find(
        { student_id: null },
        { projection: { email: 1, role: 1, is_demo: 1 } }
      ).limit(3).toArray();
      
      samples.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Demo: ${user.is_demo}`);
      });
    }

    console.log('\nFix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing null student_id values:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixNullStudentIds().catch(console.error);