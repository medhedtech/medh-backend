import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

// Import User model
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  full_name: String,
  quick_login_keys: [{
    key_id: String,
    hashed_key: String,
    created_at: Date,
    last_used: Date,
    expires_at: Date,
    is_active: { type: Boolean, default: true }
  }]
}));

async function testUserById() {
  try {
    console.log('\n🔍 Testing User by ID');
    console.log('=====================');
    
    // Try to find user by ID
    const userId = '6800b0508c413e0442bf11e0';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`❌ User with ID ${userId} not found`);
      
      // Try to find by email
      const userByEmail = await User.findOne({ email: 'student@medh.co' });
      if (userByEmail) {
        console.log(`✅ Found user by email: ${userByEmail.email}`);
        console.log(`📊 User ID: ${userByEmail._id}`);
      } else {
        console.log('❌ User not found by email either');
        
        // List all users to see what's in the database
        const allUsers = await User.find({}).limit(5);
        console.log(`\n📊 Found ${allUsers.length} users in database:`);
        allUsers.forEach((u, index) => {
          console.log(`   ${index + 1}. ${u.email} (ID: ${u._id})`);
        });
      }
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 User ID: ${user._id}`);
    console.log(`📊 Quick login keys: ${user.quick_login_keys?.length || 0}`);
    
    if (user.quick_login_keys && user.quick_login_keys.length > 0) {
      const now = new Date();
      user.quick_login_keys.forEach((key, index) => {
        const isExpired = key.expires_at && now > key.expires_at;
        const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
        
        console.log(`\n🔑 Key ${index + 1}:`);
        console.log(`   ID: ${key.key_id}`);
        console.log(`   Active: ${key.is_active}`);
        console.log(`   Expires at: ${key.expires_at || 'No expiration'}`);
        console.log(`   Is expired: ${isExpired}`);
        console.log(`   Time until expiry: ${timeUntilExpiry} seconds`);
      });
    } else {
      console.log('   No quick login keys found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testUserById();
