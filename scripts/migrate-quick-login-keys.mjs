import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import User from '../models/user-modal.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/medh', {
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Find all users with old quick_login_keys schema
    const users = await User.find({
      $or: [
        { 'quick_login_keys.key': { $exists: true } },
        { 'quick_login_keys.name': { $exists: true } }
      ]
    });
    
    console.log(`Found ${users.length} users with old quick_login_keys schema`);
    
    for (const user of users) {
      console.log(`Migrating user: ${user.email}`);
      
      // Convert old schema to new schema
      const newQuickLoginKeys = [];
      
      if (user.quick_login_keys && user.quick_login_keys.length > 0) {
        for (const oldKey of user.quick_login_keys) {
          if (oldKey.key) {
            // Generate new key_id and keep the existing hashed key
            const keyId = crypto.randomBytes(16).toString('hex');
            
            newQuickLoginKeys.push({
              key_id: keyId,
              hashed_key: oldKey.key, // The old 'key' field was already hashed
              created_at: oldKey.created_at || new Date(),
              last_used: oldKey.last_used,
              is_active: oldKey.is_active !== false // Default to true if not explicitly false
            });
          }
        }
      }
      
      // Update the user with new schema
      await User.updateOne(
        { _id: user._id },
        { 
          $set: { quick_login_keys: newQuickLoginKeys },
          $unset: { 'quick_login_keys.key': 1, 'quick_login_keys.name': 1 }
        }
      );
      
      console.log(`Migrated ${newQuickLoginKeys.length} quick login keys for user: ${user.email}`);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.connection.close();
  }
});

