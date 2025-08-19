#!/usr/bin/env node

/**
 * MEDH Backend - Quick Deployment Script
 * Automates the deployment of local changes to live server
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  LIVE_SERVER: 'your-live-server-ip',
  LIVE_USER: 'your-username', 
  LIVE_PATH: '/path/to/your/live/backend',
  SSH_KEY: '~/.ssh/your-key', // Optional SSH key path
  PM2_APP_NAME: 'medh-backend'
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n🔸 ${title}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Files that need to be deployed
const FILES_TO_DEPLOY = [
  'controllers/liveClassesController.js',
  'routes/liveClassesRoutes.js', 
  'config/aws-config.js',
  'middleware/upload.js',
  'package.json',
  'index.js'
];

function checkLocalFiles() {
  logSection('Checking Local Files');
  
  const missingFiles = [];
  
  for (const file of FILES_TO_DEPLOY) {
    if (fs.existsSync(file)) {
      logSuccess(`Found: ${file}`);
    } else {
      logError(`Missing: ${file}`);
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    logError(`Missing ${missingFiles.length} required files. Deployment aborted.`);
    process.exit(1);
  }
  
  logSuccess('All required files found');
}

function validateConfig() {
  logSection('Validating Configuration');
  
  const requiredFields = ['LIVE_SERVER', 'LIVE_USER', 'LIVE_PATH'];
  const missingFields = requiredFields.filter(field => !CONFIG[field] || CONFIG[field].startsWith('your-'));
  
  if (missingFields.length > 0) {
    logError(`Please update these configuration fields in the script:`);
    missingFields.forEach(field => logError(`  - ${field}`));
    process.exit(1);
  }
  
  logSuccess('Configuration validated');
}

function createBackup() {
  logSection('Creating Backup on Live Server');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = `backup_${timestamp}`;
  
  try {
    const sshCmd = CONFIG.SSH_KEY ? `-i ${CONFIG.SSH_KEY}` : '';
    const backupCmd = `ssh ${sshCmd} ${CONFIG.LIVE_USER}@${CONFIG.LIVE_SERVER} "cd ${CONFIG.LIVE_PATH} && cp -r . ../backup_${timestamp}"`;
    
    logInfo(`Creating backup: ${backupDir}`);
    execSync(backupCmd, { stdio: 'inherit' });
    logSuccess(`Backup created: ${backupDir}`);
    
    return backupDir;
  } catch (error) {
    logError(`Backup failed: ${error.message}`);
    throw error;
  }
}

function deployFiles() {
  logSection('Deploying Files to Live Server');
  
  const sshCmd = CONFIG.SSH_KEY ? `-i ${CONFIG.SSH_KEY}` : '';
  
  for (const file of FILES_TO_DEPLOY) {
    try {
      logInfo(`Deploying: ${file}`);
      
      const targetDir = path.dirname(file);
      const scpCmd = `scp ${sshCmd} ${file} ${CONFIG.LIVE_USER}@${CONFIG.LIVE_SERVER}:${CONFIG.LIVE_PATH}/${file}`;
      
      execSync(scpCmd, { stdio: 'pipe' });
      logSuccess(`Deployed: ${file}`);
      
    } catch (error) {
      logError(`Failed to deploy ${file}: ${error.message}`);
      throw error;
    }
  }
  
  logSuccess('All files deployed successfully');
}

function updateDependencies() {
  logSection('Updating Dependencies on Live Server');
  
  try {
    const sshCmd = CONFIG.SSH_KEY ? `-i ${CONFIG.SSH_KEY}` : '';
    const npmCmd = `ssh ${sshCmd} ${CONFIG.LIVE_USER}@${CONFIG.LIVE_SERVER} "cd ${CONFIG.LIVE_PATH} && npm install"`;
    
    logInfo('Running npm install...');
    execSync(npmCmd, { stdio: 'inherit' });
    logSuccess('Dependencies updated');
    
  } catch (error) {
    logError(`Failed to update dependencies: ${error.message}`);
    throw error;
  }
}

function restartServer() {
  logSection('Restarting Live Server');
  
  try {
    const sshCmd = CONFIG.SSH_KEY ? `-i ${CONFIG.SSH_KEY}` : '';
    const restartCmd = `ssh ${sshCmd} ${CONFIG.LIVE_USER}@${CONFIG.LIVE_SERVER} "pm2 restart ${CONFIG.PM2_APP_NAME}"`;
    
    logInfo('Restarting PM2 application...');
    execSync(restartCmd, { stdio: 'inherit' });
    logSuccess('Server restarted successfully');
    
  } catch (error) {
    logError(`Failed to restart server: ${error.message}`);
    
    // Try alternative restart methods
    logInfo('Trying alternative restart methods...');
    
    try {
      const killCmd = `ssh ${sshCmd} ${CONFIG.LIVE_USER}@${CONFIG.LIVE_SERVER} "pkill -f 'node index.js' && cd ${CONFIG.LIVE_PATH} && nohup node index.js > server.log 2>&1 &"`;
      execSync(killCmd, { stdio: 'inherit' });
      logSuccess('Server restarted using alternative method');
    } catch (altError) {
      logError(`All restart methods failed: ${altError.message}`);
      throw altError;
    }
  }
}

function testDeployment() {
  logSection('Testing Deployment');
  
  const testEndpoints = [
    '/api/v1/live-classes/batches',
    '/api/v1/live-classes/instructors', 
    '/api/v1/live-classes/test-upload'
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      logInfo(`Testing: ${endpoint}`);
      
      const curlCmd = `curl -s -o /dev/null -w "%{http_code}" http://${CONFIG.LIVE_SERVER}:8080${endpoint}`;
      const statusCode = execSync(curlCmd, { encoding: 'utf8' }).trim();
      
      if (statusCode === '200') {
        logSuccess(`✅ ${endpoint} - Status: ${statusCode}`);
      } else {
        logError(`❌ ${endpoint} - Status: ${statusCode}`);
      }
      
    } catch (error) {
      logError(`Failed to test ${endpoint}: ${error.message}`);
    }
  }
}

function showSummary() {
  logSection('Deployment Summary');
  
  log('\n🎉 Deployment completed successfully!', 'green');
  log('\n📋 What was deployed:', 'cyan');
  FILES_TO_DEPLOY.forEach(file => log(`   • ${file}`, 'blue'));
  
  log('\n🔧 Key improvements:', 'cyan');
  log('   • Enhanced video upload with progress tracking', 'blue');
  log('   • Fixed batch data fetching from database', 'blue');
  log('   • Improved S3 path structure', 'blue');
  log('   • Better error handling and logging', 'blue');
  log('   • Increased file upload limits', 'blue');
  
  log('\n🌐 Test your deployment:', 'cyan');
  log(`   • Batches: http://${CONFIG.LIVE_SERVER}:8080/api/v1/live-classes/batches`, 'blue');
  log(`   • Upload: http://${CONFIG.LIVE_SERVER}:8080/api/v1/live-classes/test-upload`, 'blue');
  
  log('\n📊 Monitor logs:', 'cyan');
  log(`   pm2 logs ${CONFIG.PM2_APP_NAME}`, 'blue');
}

// Main deployment function
async function deploy() {
  try {
    log('🚀 MEDH Backend - Quick Deployment Script', 'magenta');
    log('=====================================', 'magenta');
    
    validateConfig();
    checkLocalFiles();
    
    const backupDir = createBackup();
    deployFiles();
    updateDependencies();
    restartServer();
    
    // Wait a moment for server to start
    logInfo('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    testDeployment();
    showSummary();
    
  } catch (error) {
    logError(`\nDeployment failed: ${error.message}`);
    logError('Check the error above and try again.');
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  deploy();
}

module.exports = { deploy, CONFIG };


