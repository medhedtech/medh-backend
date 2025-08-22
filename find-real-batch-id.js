// Script to find a real batch ID from the database
import { config } from 'dotenv';
import mongoose from 'mongoose';
import Batch from './models/course-model.js';

// Load environment variables
config();

console.log('🔍 Finding Real Batch ID from Database...\n');

async function findRealBatchId() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Find all batches
    console.log('🔍 Finding all batches in database...');
    const batches = await Batch.find({}).limit(10);
    
    if (batches.length === 0) {
      console.log('❌ No batches found in database');
      return;
    }
    
    console.log(`✅ Found ${batches.length} batches in database`);
    console.log('');
    
    console.log('📋 Available Batches:');
    batches.forEach((batch, index) => {
      console.log(`   ${index + 1}. Batch ID: ${batch._id}`);
      console.log(`      - Name: ${batch.batch_name || 'Not set'}`);
      console.log(`      - Type: ${batch.batch_type || 'Not set'}`);
      console.log(`      - Capacity: ${batch.capacity || 'Not set'}`);
      console.log(`      - Enrolled: ${batch.enrolled_students || 0}`);
      console.log('');
    });

    // Find a batch with available capacity
    console.log('🔍 Finding batch with available capacity...');
    const availableBatch = batches.find(batch => 
      (batch.enrolled_students || 0) < (batch.capacity || 1)
    );
    
    if (availableBatch) {
      console.log('✅ Found batch with available capacity:');
      console.log(`   - Batch ID: ${availableBatch._id}`);
      console.log(`   - Name: ${availableBatch.batch_name || 'Not set'}`);
      console.log(`   - Type: ${availableBatch.batch_type || 'Not set'}`);
      console.log(`   - Capacity: ${availableBatch.capacity || 'Not set'}`);
      console.log(`   - Enrolled: ${availableBatch.enrolled_students || 0}`);
      console.log(`   - Available: ${(availableBatch.capacity || 1) - (availableBatch.enrolled_students || 0)}`);
    } else {
      console.log('❌ No batches with available capacity found');
    }
    console.log('');

    console.log('📝 Use one of these batch IDs for testing:');
    batches.forEach((batch, index) => {
      console.log(`   ${index + 1}. ${batch._id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
findRealBatchId().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});


















