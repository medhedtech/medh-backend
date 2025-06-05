#!/usr/bin/env node

/**
 * Debug Startup Script for Medh Backend
 * This script helps identify environment variable and startup issues
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Medh Backend Startup Debug Script');
console.log('=====================================');

// Load environment variables
console.log('\n1. Loading environment variables...');
dotenv.config();

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
console.log(`📁 .env file exists: ${fs.existsSync(envPath)}`);

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(`📏 .env file size: ${envContent.length} bytes`);
  
  // Check for Sentry DSN specifically
  const sentryLine = envContent.split('\n').find(line => line.startsWith('SENTRY_DSN='));
  console.log(`🔑 SENTRY_DSN line in .env: "${sentryLine || 'NOT FOUND'}"`);
}

// Environment variable analysis
console.log('\n2. Environment Variables Analysis:');
console.log('==================================');

const criticalEnvVars = [
  'NODE_ENV',
  'MONGO_URI', 
  'PORT',
  'SENTRY_DSN',
  'TLS_CERT_PATH',
  'USE_HTTPS',
  'REDIS_HOST',
  'REDIS_PASSWORD'
];

criticalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    if (varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('DSN')) {
      console.log(`✅ ${varName}: ${'*'.repeat(Math.min(value.length, 20))}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

// Check for problematic values
console.log('\n3. Problematic Values Check:');
console.log('============================');

if (process.env.SENTRY_DSN === 'your_sentry_dsn') {
  console.log('🚨 SENTRY_DSN has placeholder value!');
} else if (!process.env.SENTRY_DSN) {
  console.log('ℹ️  SENTRY_DSN is empty (Sentry disabled)');
} else if (process.env.SENTRY_DSN.startsWith('https://')) {
  console.log('✅ SENTRY_DSN appears to be valid');
} else {
  console.log('⚠️  SENTRY_DSN has unexpected format');
}

if (process.env.TLS_CERT_PATH === '/path/to/cert.pem') {
  console.log('🚨 TLS_CERT_PATH has placeholder value!');
} else if (!process.env.TLS_CERT_PATH) {
  console.log('ℹ️  TLS_CERT_PATH is empty (TLS disabled)');
} else {
  console.log('✅ TLS_CERT_PATH is set');
}

// Check certificate files if path is set
if (process.env.TLS_CERT_PATH && process.env.TLS_CERT_PATH !== '/path/to/cert.pem') {
  console.log('\n4. TLS Certificate Check:');
  console.log('=========================');
  
  const certPath = process.env.TLS_CERT_PATH;
  const fullchainPath = path.join(certPath, 'fullchain.pem');
  const privkeyPath = path.join(certPath, 'privkey.pem');
  
  console.log(`📁 Certificate directory exists: ${fs.existsSync(certPath)}`);
  console.log(`📄 fullchain.pem exists: ${fs.existsSync(fullchainPath)}`);
  console.log(`🔑 privkey.pem exists: ${fs.existsSync(privkeyPath)}`);
}

// Test Sentry import and initialization
console.log('\n5. Sentry Import Test:');
console.log('======================');

try {
  const Sentry = await import('@sentry/node');
  console.log('✅ Sentry import successful');
  
  if (process.env.SENTRY_DSN && process.env.SENTRY_DSN.startsWith('https://')) {
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        debug: true
      });
      console.log('✅ Sentry initialization successful');
    } catch (sentryError) {
      console.log(`❌ Sentry initialization failed: ${sentryError.message}`);
    }
  } else {
    console.log('ℹ️  Skipping Sentry initialization (invalid DSN)');
  }
} catch (importError) {
  console.log(`❌ Sentry import failed: ${importError.message}`);
}

// Test MongoDB connection string
console.log('\n6. MongoDB Connection Test:');
console.log('===========================');

if (process.env.MONGO_URI) {
  // Don't actually connect, just validate the format
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://')) {
    console.log('✅ MongoDB URI format appears valid');
  } else {
    console.log('⚠️  MongoDB URI format may be invalid');
  }
} else {
  console.log('❌ MONGO_URI not set');
}

// Check Redis configuration
console.log('\n7. Redis Configuration:');
console.log('=======================');

if (process.env.REDIS_ENABLED === 'true') {
  console.log('✅ Redis is enabled');
  console.log(`🏠 Redis host: ${process.env.REDIS_HOST || 'localhost'}`);
  console.log(`🔌 Redis port: ${process.env.REDIS_PORT || '6379'}`);
  console.log(`🔒 Redis password: ${process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET'}`);
} else {
  console.log('ℹ️  Redis is disabled');
}

// Check for other environment files
console.log('\n8. Environment Files Check:');
console.log('===========================');

const envFiles = ['.env', '.env.local', '.env.production', '.env.development', '.env.backup'];
envFiles.forEach(filename => {
  const filepath = path.join(__dirname, filename);
  if (fs.existsSync(filepath)) {
    console.log(`📄 ${filename}: EXISTS`);
  }
});

// Check PM2 environment
console.log('\n9. PM2 Environment Check:');
console.log('=========================');

if (process.env.PM2_HOME) {
  console.log('✅ Running under PM2');
  console.log(`📁 PM2_HOME: ${process.env.PM2_HOME}`);
} else {
  console.log('ℹ️  Not running under PM2');
}

// Check process arguments
console.log('\n10. Process Arguments:');
console.log('======================');
console.log('Command line arguments:', process.argv.slice(2));

console.log('\n✅ Debug analysis complete!');
console.log('\nIf you found issues:');
console.log('- Check your .env file for placeholder values');
console.log('- Ensure all required environment variables are set');
console.log('- Verify certificate paths exist if HTTPS is enabled');
console.log('- Check PM2 ecosystem configuration if using PM2'); 