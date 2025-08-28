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
    console.log(`Before cleanup - Quick login keys count: ${user.quick_login_keys?.length || 0}`);
    
    // Filter out invalid keys (those without key_id or hashed_key)
    const validKeys = user.quick_login_keys.filter(key => 
      key.key_id && key.hashed_key
    );
    
    console.log(`Valid keys: ${validKeys.length}`);
    console.log(`Invalid keys to remove: ${user.quick_login_keys.length - validKeys.length}`);
    
    // Generate a new valid quick login key
    const newQuickLoginKey = crypto.randomBytes(32).toString('hex');
    const hashedQuickLoginKey = bcrypt.hashSync(newQuickLoginKey, 10);
    const keyId = crypto.randomBytes(16).toString('hex');
    
    // Add the new key to valid keys
    validKeys.push({
      key_id: keyId,
      hashed_key: hashedQuickLoginKey,
      created_at: new Date(),
      last_used: new Date(),
      is_active: true
    });
    
    // Update the user with only valid keys
    user.quick_login_keys = validKeys;
    await user.save();
    
    console.log(`After cleanup - Quick login keys count: ${user.quick_login_keys.length}`);
    console.log('\nGenerated new quick login key:');
    console.log('Key ID:', keyId);
    console.log('Quick Login Key:', newQuickLoginKey);
    console.log('Hashed Key:', hashedQuickLoginKey);
    
    // Test the bcrypt comparison
    const isValid = bcrypt.compareSync(newQuickLoginKey, hashedQuickLoginKey);
    console.log('Bcrypt test result:', isValid);
    
    console.log('\n✅ Quick login keys fixed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
});

