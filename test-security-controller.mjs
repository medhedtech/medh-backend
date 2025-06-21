import securityController from './controllers/securityController.js';

console.log('Security Controller:', typeof securityController);
console.log('Methods:', Object.getOwnPropertyNames(securityController));
console.log('getEnhancedActiveSessions:', typeof securityController.getEnhancedActiveSessions);

// Test the method
console.log('Testing with empty user...');
try {
  const result = securityController.getEnhancedActiveSessions({ sessions: [] });
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error.message);
} 