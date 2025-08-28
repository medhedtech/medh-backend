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

function logUserState(user) {
  const now = new Date();
  console.log(`\n👤 User: ${user.email}`);
  console.log(`📊 Quick login keys: ${user.quick_login_keys.length}`);
  
  if (user.quick_login_keys.length > 0) {
    user.quick_login_keys.forEach((key, index) => {
      const isExpired = key.expires_at && now > key.expires_at;
      const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
      
      console.log(`   Key ${index + 1}:`);
      console.log(`     ID: ${key.key_id}`);
      console.log(`     Active: ${key.is_active}`);
      console.log(`     Expires at: ${key.expires_at || 'No expiration'}`);
      console.log(`     Is expired: ${isExpired}`);
      console.log(`     Time until expiry: ${timeUntilExpiry} seconds`);
    });
  }
}

async function monitorQuickLogin() {
  try {
    console.log('\n🔍 Quick Login Real-Time Monitor');
    console.log('================================');
    console.log('This will monitor the database every 5 seconds...');
    console.log('Press Ctrl+C to stop monitoring');
    console.log('');
    
    let lastState = new Map();
    
    const checkDatabase = async () => {
      try {
        const users = await User.find({});
        const now = new Date();
        
        console.log(`\n⏰ ${now.toLocaleTimeString()} - Checking database...`);
        
        users.forEach(user => {
          const userKey = user.email;
          const currentState = JSON.stringify(user.quick_login_keys.map(key => ({
            key_id: key.key_id,
            is_active: key.is_active,
            expires_at: key.expires_at,
            is_expired: key.expires_at && now > key.expires_at
          })));
          
          if (!lastState.has(userKey) || lastState.get(userKey) !== currentState) {
            console.log(`\n🔄 CHANGE DETECTED for ${user.email}:`);
            logUserState(user);
            lastState.set(userKey, currentState);
          }
        });
        
        // Check for any active, non-expired keys
        const activeUsers = users.filter(user => 
          user.quick_login_keys.some(key => 
            key.is_active && (!key.expires_at || now <= key.expires_at)
          )
        );
        
        if (activeUsers.length > 0) {
          console.log(`\n✅ Users with active quick login keys: ${activeUsers.map(u => u.email).join(', ')}`);
        } else {
          console.log(`\n❌ No users with active quick login keys`);
        }
        
      } catch (error) {
        console.error('Error checking database:', error);
      }
    };
    
    // Initial check
    await checkDatabase();
    
    // Set up interval
    const interval = setInterval(checkDatabase, 5000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping monitor...');
      clearInterval(interval);
      mongoose.disconnect().then(() => {
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Monitor error:', error);
    await mongoose.disconnect();
  }
}

monitorQuickLogin();

