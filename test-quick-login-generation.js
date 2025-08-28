import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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
    console.log(`Current quick_login_keys: ${user.quick_login_keys?.length || 0}`);
    
    // Generate a new quick login key
    const newQuickLoginKey = crypto.randomBytes(32).toString('hex');
    const hashedQuickLoginKey = bcrypt.hashSync(newQuickLoginKey, 10);
    const keyId = crypto.randomBytes(16).toString('hex');
    
    // Add the new key to the user
    if (!user.quick_login_keys) {
      user.quick_login_keys = [];
    }
    
    user.quick_login_keys.push({
      key_id: keyId,
      hashed_key: hashedQuickLoginKey,
      created_at: new Date(),
      last_used: new Date(),
      is_active: true
    });
    
    await user.save();
    
    console.log('Generated new quick login key:');
    console.log('Key ID:', keyId);
    console.log('Quick Login Key:', newQuickLoginKey);
    console.log('Hashed Key:', hashedQuickLoginKey);
    
    // Test the bcrypt comparison
    const isValid = bcrypt.compareSync(newQuickLoginKey, hashedQuickLoginKey);
    console.log('Bcrypt test result:', isValid);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
});
