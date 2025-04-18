import dotenv from 'dotenv';
import { createClient } from 'redis';

// Load environment variables
dotenv.config();

console.log("Testing Redis connection...");
console.log(`Host: ${process.env.REDIS_HOST || 'localhost'}`);
console.log(`Port: ${process.env.REDIS_PORT || 6379}`);
console.log(`Enabled: ${process.env.REDIS_ENABLED}`);

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD
});

client.on('error', err => console.error('Redis error:', err));
client.on('connect', () => console.log('Redis connected!'));
client.on('ready', () => console.log('Redis ready for commands'));

async function testConnection() {
  try {
    console.log('Attempting to connect to Redis...');
    await client.connect();
    console.log('Connected successfully');
    
    // Try a simple ping command
    const pingResult = await client.ping();
    console.log(`Ping result: ${pingResult}`);
    
    // Close the connection
    await client.disconnect();
    console.log('Disconnected from Redis');
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

// Run the test
testConnection()
  .catch(err => console.error('Unhandled error:', err))
  .finally(() => process.exit()); 