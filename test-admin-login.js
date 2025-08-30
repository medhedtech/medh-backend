import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const testAdminLogin = async (email, password, name) => {
  console.log(`\nÌ¥ê Testing admin login for: ${name} (${email})`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin-auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`‚úÖ SUCCESS: ${name} login successful`);
      console.log(`   - Token: ${result.data?.token ? 'Generated' : 'Missing'}`);
      console.log(`   - Admin Role: ${result.data?.admin?.admin_role}`);
      console.log(`   - Permissions: ${result.data?.admin?.permissions?.length || 0} permissions`);
      return true;
    } else {
      console.log(`‚ùå FAILED: ${name} login failed`);
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Message: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.log(`‚ùå ERROR: ${name} login error - ${error.message}`);
    return false;
  }
};

const runTests = async () => {
  console.log('Ì∫Ä STARTING ADMIN LOGIN TESTS...');
  
  // Test all admin users from database
  const adminUsers = [
    { name: 'Neeraj Narain', email: 'neeraj@esampark.biz', password: 'original_password' },
    { name: 'Harsh Patel', email: 'superadmin@medh.com', password: 'original_password' },
    { name: 'Super Admin', email: 'superadmin@medh.co', password: 'original_password' }
  ];
  
  let successCount = 0;
  
  for (const user of adminUsers) {
    const success = await testAdminLogin(user.email, user.password, user.name);
    if (success) successCount++;
  }
  
  console.log(`\nÌ≥ä RESULTS: ${successCount}/${adminUsers.length} admin logins successful`);
  
  if (successCount === adminUsers.length) {
    console.log('Ìæâ ALL ADMIN USERS CAN LOGIN SUCCESSFULLY!');
  } else {
    console.log('‚ö†Ô∏è Some admin users have login issues - check passwords');
  }
};

runTests().catch(console.error);
