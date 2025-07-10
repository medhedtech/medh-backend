import { createClient } from "redis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testRedisConnection() {
  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log("🔍 Testing Redis Connection...");
  console.log(`📍 Host: ${redisHost}`);
  console.log(`🔌 Port: ${redisPort}`);
  console.log(`🔐 Password: ${redisPassword ? "*** (set)" : "Not set"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const client = createClient({
    socket: {
      host: redisHost,
      port: redisPort,
      connectTimeout: 10000, // 10 seconds timeout
      lazyConnect: true,
    },
    password: redisPassword || undefined,
  });

  client.on("error", (err) => {
    console.error(`❌ Redis Error: ${err.message}`);
    console.error(`🔍 Error Code: ${err.code || "Unknown"}`);
    console.error(`📋 Error Stack: ${err.stack || "No stack trace"}`);
  });

  client.on("connect", () => {
    console.log("✅ Redis connected successfully!");
  });

  client.on("ready", () => {
    console.log("🚀 Redis client ready!");
  });

  client.on("reconnecting", () => {
    console.log("🔄 Redis reconnecting...");
  });

  client.on("end", () => {
    console.log("📤 Redis connection ended");
  });

  try {
    console.log("⏳ Attempting to connect...");
    await client.connect();

    console.log("✅ Connection successful!");

    // Test basic operations
    console.log("🧪 Testing basic operations...");
    await client.set("test-key", "test-value");
    const value = await client.get("test-key");
    console.log(
      `📝 Test write/read: ${value === "test-value" ? "✅ SUCCESS" : "❌ FAILED"}`,
    );

    await client.del("test-key");
    console.log("🧹 Test cleanup completed");
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error(`🔍 Error: ${error.message}`);
    console.error(`📋 Error Code: ${error.code || "Unknown"}`);
    console.error(`🔗 Error Cause: ${error.cause || "Unknown"}`);

    // Additional diagnostics
    console.log("\n🔍 Diagnostic Information:");
    console.log(`📊 Node.js Version: ${process.version}`);
    console.log(`🖥️  Platform: ${process.platform}`);
    console.log(`🏗️  Architecture: ${process.arch}`);

    // Check if it's a DNS resolution issue
    if (error.code === "ENOTFOUND") {
      console.log("🌐 DNS Resolution Issue - Host not found");
      console.log("💡 Suggestions:");
      console.log("   1. Check if the Redis server hostname is correct");
      console.log("   2. Verify DNS resolution");
      console.log("   3. Try using IP address instead of hostname");
    }

    // Check if it's a connection timeout
    if (error.code === "ETIMEDOUT") {
      console.log("⏰ Connection Timeout - Redis server not responding");
      console.log("💡 Suggestions:");
      console.log("   1. Check if Redis server is running");
      console.log("   2. Verify firewall settings");
      console.log("   3. Check network connectivity");
    }

    // Check if it's an authentication issue
    if (error.message.includes("WRONGPASS") || error.message.includes("AUTH")) {
      console.log("🔑 Authentication Issue - Invalid credentials");
      console.log("💡 Suggestions:");
      console.log("   1. Check Redis password in .env file");
      console.log("   2. Verify Redis server auth configuration");
    }
  } finally {
    try {
      await client.disconnect();
      console.log("🔌 Redis client disconnected");
    } catch (disconnectError) {
      console.error("❌ Error during disconnect:", disconnectError.message);
    }
  }
}

// Run the test
testRedisConnection().catch((error) => {
  console.error("💥 Test script error:", error);
  process.exit(1);
});
