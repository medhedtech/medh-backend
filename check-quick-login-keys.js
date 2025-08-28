import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user-modal.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/medh');

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Find the test user
    const user = await User.findOne({ email: 'student@medh.co' });
    
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    console.log(`Found user: ${user.email}`);
    console.log(`Quick login keys count: ${user.quick_login_keys?.length || 0}`);
    
    if (user.quick_login_keys && user.quick_login_keys.length > 0) {
      user.quick_login_keys.forEach((key, index) => {
        console.log(`Key ${index + 1}:`);
        console.log(`  Key ID: ${key.key_id}`);
        console.log(`  Hashed Key exists: ${!!key.hashed_key}`);
        console.log(`  Created at: ${key.created_at}`);
        console.log(`  Last used: ${key.last_used}`);
        console.log(`  Is active: ${key.is_active}`);
        console.log('---');
      });
    } else {
      console.log('No quick login keys found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
});
