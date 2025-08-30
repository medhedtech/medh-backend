const mongoose = require('mongoose');

// Connect to database
mongoose.connect('mongodb://localhost:27017/medhdb');

const AdminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.model('Admin', AdminSchema, 'admins');

async function checkAdmins() {
  try {
    const admins = await Admin.find({});
    console.log('📊 TOTAL ADMINS FOUND:', admins.length);
    
    admins.forEach((admin, index) => {
      console.log(`\n👨‍💼 ADMIN ${index + 1}:`);
      console.log('✅ Email:', admin.email);
      console.log('✅ Full Name:', admin.full_name);
      console.log('✅ Admin Role:', admin.admin_role);
      console.log('✅ User Type:', admin.user_type);
      console.log('✅ Department:', admin.department);
      console.log('✅ Designation:', admin.designation);
      console.log('✅ All Fields:', Object.keys(admin.toObject()));
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAdmins();
