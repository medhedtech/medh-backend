#!/usr/bin/env node

/**
 * Script to check if MongoDB is running locally and start it if needed
 * This is useful for development environments
 */

import { exec } from 'child_process';
import { platform } from 'os';

// Function to check if MongoDB is running
function checkIfMongoIsRunning() {
  return new Promise((resolve) => {
    const command = platform() === 'win32'
      ? 'netstat -ano | findstr 27017'
      : 'lsof -i:27017';
    
    exec(command, (error, stdout) => {
      if (error || !stdout) {
        console.log('MongoDB is not running');
        resolve(false);
      } else {
        console.log('MongoDB is already running');
        resolve(true);
      }
    });
  });
}

// Function to start MongoDB based on platform
function startMongoDB() {
  let command;
  
  switch (platform()) {
    case 'darwin': // macOS
      command = 'brew services start mongodb-community';
      break;
    case 'win32': // Windows
      command = 'net start MongoDB';
      break;
    default: // Linux and others
      command = 'sudo systemctl start mongod';
  }
  
  console.log(`Attempting to start MongoDB with command: ${command}`);
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Failed to start MongoDB: ${error.message}`);
        console.error('You may need to install MongoDB first:');
        console.error('- macOS: brew install mongodb-community');
        console.error('- Windows: Download from https://www.mongodb.com/try/download/community');
        console.error('- Linux: sudo apt install mongodb or equivalent for your distro');
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`Warning: ${stderr}`);
      }
      
      console.log(stdout || 'MongoDB started successfully');
      resolve(true);
    });
  });
}

// Main function
async function main() {
  try {
    const isMongoRunning = await checkIfMongoIsRunning();
    
    if (!isMongoRunning) {
      await startMongoDB();
      
      // Wait a bit for MongoDB to fully start
      console.log('Waiting for MongoDB to start...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check again if MongoDB is running
      const isRunningNow = await checkIfMongoIsRunning();
      
      if (!isRunningNow) {
        console.error('MongoDB failed to start. Please start it manually.');
        process.exit(1);
      }
    }
    
    console.log('MongoDB is ready. You can now run the application with:');
    console.log('npm run dev:local');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 