import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

// Import User model
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  quick_login_keys: [{
    key_id: String,
    hashed_key: String,
    created_at: Date,
    last_used: Date,
    expires_at: Date,
    is_active: { type: Boolean, default: true }
  }]
}));

async function checkUsers() {
  try {
    // Find all users
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users in database`);
    
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}: ${user.email}`);
      console.log(`   Quick login keys: ${user.quick_login_keys.length}`);
      
      if (user.quick_login_keys.length > 0) {
        user.quick_login_keys.forEach((key, keyIndex) => {
          const now = new Date();
          const isExpired = key.expires_at && now > key.expires_at;
          console.log(`   Key ${keyIndex + 1}: ID=${key.key_id}, Active=${key.is_active}, Expires=${key.expires_at || 'No expiration'}, Expired=${isExpired}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkUsers();

