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

const clearSessions = async () => {
  try {
    console.log('🧹 Clearing all live sessions...');
    
    const result = await LiveSession.deleteMany({});
    
    console.log(`✅ Cleared ${result.deletedCount} sessions successfully`);
    console.log('🎉 You can now create new sessions with any session number');
    
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
connectDB().then(clearSessions);
