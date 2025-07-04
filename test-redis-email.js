import dotenv from "dotenv";
import EmailService from "./services/emailService.js";
import logger from "./utils/logger.js";
import cache from "./utils/cache.js";
import readline from "readline";

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Test Redis email queue functionality
 */
async function testRedisEmailQueue() {
  console.log("Starting Redis email queue test...");
  
  // Check Redis connection
  const redisStatus = cache.getConnectionStatus();
  console.log("\nRedis status:", redisStatus);
  
  // If Redis is enabled but not connected, give options
  if (!redisStatus.connected && redisStatus.enabled) {
    console.log("\n⚠️ Redis is enabled but not connected.");
    console.log("Options:");
    console.log("1. Continue with direct email sending (bypass Redis queue)");
    console.log("2. Try to fix Redis connection first");
    console.log("3. Quit test");
    
    const choice = await question("\nEnter your choice (1-3): ");
    
    if (choice === "1") {
      console.log("\nContinuing with direct email sending...");
      // Set REDIS_ENABLED to false to force direct sending
      process.env.REDIS_ENABLED = "false";
    } else if (choice === "2") {
      console.log("\nPlease check your Redis configuration and try again.");
      console.log("Suggestions:");
      console.log("- Verify Redis server is running");
      console.log("- Check connection settings in .env file");
      console.log("- Run 'node redis-test.js' to test connection separately");
      rl.close();
      process.exit(0);
    } else {
      console.log("\nExiting test.");
      rl.close();
      process.exit(0);
    }
  }
  
  // Initialize email service
  const emailService = new EmailService();
  
  // Wait for email service to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Get the test recipient email
    const testEmail = process.env.TEST_EMAIL;
    if (!testEmail) {
      const inputEmail = await question("\nPlease enter an email address for testing: ");
      process.env.TEST_EMAIL = inputEmail;
      console.log(`Using ${inputEmail} for testing.`);
    } else {
      console.log(`\nUsing ${testEmail} for testing. To change, set TEST_EMAIL in .env`);
    }
    
    // Test 1: Get queue stats
    console.log("\n--- Test 1: Queue Stats ---");
    const queueStats = await emailService.getQueueStats();
    console.log("Queue stats:", JSON.stringify(queueStats, null, 2));
    
    // Test 2: Send a test email via queue (high priority)
    console.log("\n--- Test 2: High Priority Email ---");
    const highPriorityResult = await emailService.sendEmail({
      to: process.env.TEST_EMAIL,
      subject: "High Priority Test Email",
      html: "<h1>High Priority Test</h1><p>This is a test email sent with high priority.</p>"
    }, {
      priority: "high",
      useQueue: redisStatus.connected
    });
    console.log("High priority email result:", highPriorityResult);
    
    // Test 3: Send a test email via queue (normal priority)
    console.log("\n--- Test 3: Normal Priority Email ---");
    const normalPriorityResult = await emailService.sendEmail({
      to: process.env.TEST_EMAIL,
      subject: "Normal Priority Test Email",
      html: "<h1>Normal Priority Test</h1><p>This is a test email sent with normal priority.</p>"
    }, {
      priority: "normal",
      useQueue: redisStatus.connected
    });
    console.log("Normal priority email result:", normalPriorityResult);
    
    // Test 4: Send a test email via queue (low priority)
    console.log("\n--- Test 4: Low Priority Email ---");
    const lowPriorityResult = await emailService.sendEmail({
      to: process.env.TEST_EMAIL,
      subject: "Low Priority Test Email",
      html: "<h1>Low Priority Test</h1><p>This is a test email sent with low priority.</p>"
    }, {
      priority: "low",
      useQueue: redisStatus.connected
    });
    console.log("Low priority email result:", lowPriorityResult);
    
    // Test 5: Send a test email with template
    console.log("\n--- Test 5: Templated Email ---");
    const templateResult = await emailService.sendNotificationEmail(
      process.env.TEST_EMAIL,
      "Test Notification with Template",
      "This is a test notification message using a template.",
      {
        details: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development",
          test: "Email Service Test"
        },
        actionUrl: "https://medh.co",
        actionText: "Visit Medh Platform",
        email: process.env.TEST_EMAIL
      }
    );
    console.log("Template email result:", templateResult);
    
    // If Redis is connected, test queue-specific features
    if (redisStatus.connected) {
      // Test 6: Check updated queue stats
      console.log("\n--- Test 6: Updated Queue Stats ---");
      const updatedQueueStats = await emailService.getQueueStats();
      console.log("Updated queue stats:", JSON.stringify(updatedQueueStats, null, 2));
      
      // Test 7: Bulk email test (small batch)
      console.log("\n--- Test 7: Bulk Email Test ---");
      const testEmails = [
        process.env.TEST_EMAIL,
        process.env.TEST_EMAIL,
        process.env.TEST_EMAIL
      ];
      
      const bulkResult = await emailService.sendBulkEmail(
        testEmails,
        "Test Bulk Email",
        "notification",
        {
          message: "This is a test bulk email message.",
          details: {
            purpose: "Testing bulk email functionality"
          }
        }
      );
      console.log("Bulk email result:", bulkResult);
      
      // Wait for job processing
      console.log("\n--- Waiting for jobs to process ---");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test 8: Final queue stats
      console.log("\n--- Test 8: Final Queue Stats ---");
      const finalQueueStats = await emailService.getQueueStats();
      console.log("Final queue stats:", JSON.stringify(finalQueueStats, null, 2));
    } else {
      console.log("\n--- Skipping queue-specific tests since Redis is not connected ---");
      
      // Test 7: Bulk email test (small batch) - direct sending
      console.log("\n--- Test 7: Bulk Email Test (Direct Sending) ---");
      const testEmails = [
        process.env.TEST_EMAIL,
        process.env.TEST_EMAIL
      ];
      
      const bulkResult = await emailService.sendBulkEmail(
        testEmails,
        "Test Bulk Email (Direct)",
        "notification",
        {
          message: "This is a test bulk email message (direct sending).",
          details: {
            purpose: "Testing bulk email functionality"
          }
        }
      );
      console.log("Bulk email result:", bulkResult);
    }
    
    console.log("\nTests completed successfully!");
  } catch (error) {
    console.error("Error during testing:", error);
  } finally {
    // Allow time for logging to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    rl.close();
    process.exit(0);
  }
}

// Run the test
testRedisEmailQueue().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
}); 