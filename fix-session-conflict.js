import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LiveSession from './models/liveSession.model.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medh');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixSessionConflict = async () => {
  try {
    console.log('🔧 Fixing session conflict issue...');
    
    // Step 1: Check current sessions
    console.log('\n📊 Step 1: Checking current sessions...');
    const currentSessions = await LiveSession.find({}).select('sessionNo sessionTitle createdAt');
    console.log(`Found ${currentSessions.length} sessions in database`);
    
    if (currentSessions.length > 0) {
      console.log('Current sessions:');
      currentSessions.forEach((session, index) => {
        console.log(`  ${index + 1}. Session No: "${session.sessionNo}" - "${session.sessionTitle}"`);
      });
    }
    
    // Step 2: Clear all sessions
    console.log('\n🧹 Step 2: Clearing all sessions...');
    const deleteResult = await LiveSession.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} sessions`);
    
    // Step 3: Verify database is clean
    console.log('\n🔍 Step 3: Verifying database is clean...');
    const remainingSessions = await LiveSession.find({});
    console.log(`Remaining sessions: ${remainingSessions.length}`);
    
    if (remainingSessions.length === 0) {
      console.log('✅ Database is now clean!');
      console.log('🎉 You can now create new sessions with any session number');
      console.log('💡 Try using session numbers like: 1001, 1002, 1003, etc.');
    } else {
      console.log('⚠️ Some sessions still remain in database');
    }
    
    // Step 4: Test session creation
    console.log('\n🧪 Step 4: Testing session creation...');
    const testSession = new LiveSession({
      sessionTitle: 'Test Session',
      sessionNo: '999',
      students: ['507f1f77bcf86cd799439011'],
      grades: ['507f1f77bcf86cd799439012'],
      dashboard: '507f1f77bcf86cd799439013',
      instructorId: '507f1f77bcf86cd799439014',
      date: '2024-01-01',
      summary: {
        title: 'Test Summary',
        description: 'Test Description',
        items: []
      },
      status: 'scheduled'
    });
    
    await testSession.save();
    console.log('✅ Test session created successfully');
    
    // Clean up test session
    await LiveSession.deleteOne({ sessionNo: '999' });
    console.log('🧹 Test session cleaned up');
    
  } catch (error) {
    console.error('❌ Error fixing session conflict:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
connectDB().then(fixSessionConflict);
