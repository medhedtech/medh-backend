const mongoose = require('mongoose');
const User = require('./models/user-modal.js');

async function checkUserPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/MedhDB');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({email: 'student@medh.co'});
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found');
    console.log('Email:', user.email);
    console.log('Password exists:', !!user.password);
    console.log('Password hash:', user.password ? user.password.substring(0, 20) + '...' : 'No password');
    console.log('Is demo:', user.is_demo);
    console.log('Password set:', user.password_set);
    console.log('Last password change:', user.last_password_change);
    
    // Test password comparison
    if (user.password) {
      const bcrypt = require('bcryptjs');
      const testPasswords = ['Medh123', 'MEDH123456', 'MEDH12345678'];
      
      for (const testPassword of testPasswords) {
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`Password "${testPassword}" is valid:`, isValid);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserPassword();
