// Setup file for Zoom API tests
import { spawn } from "child_process";
import { promisify } from "util";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Global variables to store server process
let server;

// Before all tests, start the server
beforeAll(async () => {
  console.log("Starting server for Zoom API tests...");

  // Start server as a child process
  server = spawn("npm", ["run", "dev"], {
    stdio: "pipe",
    shell: true,
    detached: true,
  });

  // Log server output for debugging
  server.stdout.on("data", (data) => {
    console.log(`Server: ${data}`);
  });

  server.stderr.on("data", (data) => {
    console.error(`Server error: ${data}`);
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("Server should be running now");
});

// After all tests, stop the server
afterAll(async () => {
  console.log("Shutting down server...");

  // Kill server process and its children
  if (server) {
    process.kill(-server.pid, "SIGTERM");
  }

  // Wait for server to stop
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Server stopped");
});
