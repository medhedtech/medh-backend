import mongoose from 'mongoose';
import Dashboard from './models/dashboard.model.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medh';

async function fixDashboards() {
  try {
    console.log('🔧 Fixing Dashboard Status...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Update all dashboards to be active
    const result = await Dashboard.updateMany(
      { name: { $in: ['Instructor', 'Student', 'Admin'] } },
      { $set: { isActive: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} dashboards to active status`);

    // Verify the dashboards
    const dashboards = await Dashboard.find({ isActive: true });
    console.log('\n📊 Active dashboards:');
    dashboards.forEach((dashboard, index) => {
      console.log(`${index + 1}. ${dashboard.name} (${dashboard.type}) - Active: ${dashboard.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixDashboards();


