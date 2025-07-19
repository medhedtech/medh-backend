#!/usr/bin/env node

/**
 * Script to fix the student_id index issue
 * This script drops the existing non-sparse unique index and recreates it as sparse
 */

import mongoose from 'mongoose';
import { ENV_VARS } from '../config/envVars.js';

async function fixStudentIdIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get current indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:');
    indexes.forEach(index => {
      if (index.name.includes('student_id')) {
        console.log(`- ${index.name}:`, index);
      }
    });

    // Check if student_id_1 index exists and is not sparse
    const studentIdIndex = indexes.find(index => index.name === 'student_id_1');
    
    if (studentIdIndex && !studentIdIndex.sparse) {
      console.log('\nDropping existing non-sparse student_id index...');
      await usersCollection.dropIndex('student_id_1');
      console.log('Index dropped successfully');

      console.log('Creating new sparse unique index for student_id...');
      await usersCollection.createIndex(
        { student_id: 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: 'student_id_1'
        }
      );
      console.log('Sparse unique index created successfully');
    } else if (studentIdIndex && studentIdIndex.sparse) {
      console.log('student_id index is already sparse, no changes needed');
    } else {
      console.log('Creating sparse unique index for student_id...');
      await usersCollection.createIndex(
        { student_id: 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: 'student_id_1'
        }
      );
      console.log('Sparse unique index created successfully');
    }

    // Verify the new index
    const newIndexes = await usersCollection.indexes();
    const newStudentIdIndex = newIndexes.find(index => index.name === 'student_id_1');
    console.log('\nNew student_id index:', newStudentIdIndex);

    console.log('\nIndex fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing student_id index:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixStudentIdIndex().catch(console.error);