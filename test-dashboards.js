import mongoose from 'mongoose';
import Dashboard from './models/dashboard.model.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medh';

async function testDashboards() {
  try {
    console.log('🔍 Testing Dashboard Data...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if dashboards exist
    const dashboards = await Dashboard.find();
    console.log('📊 Found dashboards:', dashboards.length);
    
    if (dashboards.length > 0) {
      dashboards.forEach((dashboard, index) => {
        console.log(`${index + 1}. ${dashboard.name} (${dashboard.type})`);
      });
    } else {
      console.log('❌ No dashboards found in database');
      
      // Create the three required dashboards
      console.log('\n🔄 Creating required dashboards...');
      
      const dashboardData = [
        {
          name: 'Instructor',
          type: 'instructor',
          description: 'Dashboard for instructors to manage courses and students',
          features: ['course-management', 'student-progress', 'assignments', 'analytics'],
          permissions: ['read', 'write']
        },
        {
          name: 'Student',
          type: 'student',
          description: 'Main dashboard for students to view courses and progress',
          features: ['course-progress', 'assignments', 'grades', 'calendar'],
          permissions: ['read']
        },
        {
          name: 'Admin',
          type: 'admin',
          description: 'Administrative dashboard for system management',
          features: ['user-management', 'course-management', 'analytics', 'reports'],
          permissions: ['read', 'write', 'delete', 'admin']
        }
      ];

      for (const data of dashboardData) {
        const dashboard = await Dashboard.create(data);
        console.log(`   ✅ Created: ${dashboard.name} Dashboard`);
      }
      
      console.log('\n🎉 All dashboards created successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testDashboards();


