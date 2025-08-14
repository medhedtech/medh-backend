import mongoose from 'mongoose';
import Dashboard from './models/dashboard.model.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing Database Connection...\n');
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URL;
    console.log('MongoDB URI:', MONGODB_URI ? 'Found' : 'Not found');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!\n');
    
    // Test fetching dashboards
    console.log('📊 Fetching dashboards...');
    const dashboards = await Dashboard.find().select('_id name type description');
    console.log(`Found ${dashboards.length} dashboards:`);
    
    dashboards.forEach((dashboard, index) => {
      console.log(`${index + 1}. ${dashboard.name} (${dashboard.type})`);
    });
    
    if (dashboards.length === 0) {
      console.log('\n❌ No dashboards found. This might be the issue.');
    } else {
      console.log('\n✅ Dashboards found successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testConnection();


