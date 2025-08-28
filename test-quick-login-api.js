import fetch from 'node-fetch';

async function testQuickLogin() {
  try {
    // Test with a valid quick login key (we'll use one from the database)
    const testData = {
      email: 'student@medh.co',
      quick_login_key: '60e78bb74c0a333f6ccb7fd09e23cb465c7319df88dc6f1b8f21ab1ce6300fbb'
    };

    console.log('Testing quick login with:', testData);

    const response = await fetch('http://localhost:8080/api/v1/auth/quick-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error testing quick login:', error);
  }
}

testQuickLogin();
