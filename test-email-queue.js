import dotenv from 'dotenv';
import EmailService from './services/emailService.js';

// Load environment variables
dotenv.config();

// After dotenv.config()
// Add direct debug output for .env and process.env

// Check and log the actual environment variable value
console.log('\n----- Environment Variable Debug -----');
console.log('Raw REDIS_ENABLED:', process.env.REDIS_ENABLED);
console.log('Raw REDIS_ENABLED type:', typeof process.env.REDIS_ENABLED);
console.log('Raw REDIS_ENABLED length:', process.env.REDIS_ENABLED?.length);
console.log('REDIS_ENABLED first 10 chars:', process.env.REDIS_ENABLED?.substring(0, 10));
console.log('REDIS_ENABLED charCodes:', [...(process.env.REDIS_ENABLED || '')].map(c => c.charCodeAt(0)));
console.log('----- End Debug -----\n');

async function testEmailQueue() {
  console.log("Testing direct email queue functionality...");
  console.log(`Redis Host: ${process.env.REDIS_HOST}`);
  console.log(`Redis Port: ${process.env.REDIS_PORT}`);
  console.log(`Redis Enabled: ${process.env.REDIS_ENABLED}`);
  
  // Create a new email service
  const emailService = new EmailService();
  
  // Wait for initialization
  console.log("Initializing email service...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Test if email queue is available
    const queueStats = await emailService.getQueueStats();
    console.log("Queue status:", queueStats);
    
    // Get test email from command line or use default
    const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';
    console.log(`Using test email: ${testEmail}`);
    
    // Send a test email through the queue
    console.log("\nSending high priority test email...");
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: "Queue Test Email",
      html: "<h1>Email Queue Test</h1><p>This email was sent through the Redis queue.</p>"
    }, {
      priority: "high",
      useQueue: true
    });
    
    console.log("Email result:", result);
    
    // Wait for processing
    console.log("\nWaiting for email processing...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check updated queue stats
    const updatedStats = await emailService.getQueueStats();
    console.log("Updated queue stats:", updatedStats);
    
    console.log("\nTest completed successfully");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testEmailQueue().catch(console.error); 