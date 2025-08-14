// Disable Redis to avoid connection issues
process.env.REDIS_ENABLED = "false";

// Start the server
import('./index.js');
