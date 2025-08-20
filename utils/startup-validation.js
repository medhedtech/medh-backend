/**
 * Startup Validation Utility
 * Validates critical environment variables and configurations on server startup
 */

import { validateAWSConfig } from '../config/aws-config.js';

/**
 * Validates all critical environment variables and configurations
 * @returns {Object} Validation results
 */
export const validateStartupConfiguration = () => {
  console.log('🔍 Validating startup configuration...\n');
  
  const results = {
    aws: null,
    database: null,
    general: null,
    allValid: false
  };

  // 1. Validate AWS Configuration
  console.log('📦 AWS S3 Configuration:');
  results.aws = validateAWSConfig();
  
  if (results.aws.isValid) {
    console.log('✅ AWS configuration is valid');
    console.log(`   Region: ${results.aws.config.region}`);
    console.log(`   Bucket: ${results.aws.config.bucketName}`);
    console.log(`   Access Key: ${results.aws.config.accessKeyId ? 'SET' : 'NOT SET'}`);
  } else {
    console.error('❌ AWS configuration is invalid');
    console.error('   Missing variables:', results.aws.missingVars);
  }
  console.log('');

  // 2. Validate Database Configuration
  console.log('🗄️  Database Configuration:');
  const requiredDbVars = ['MONGODB_URI', 'DB_NAME'];
  const missingDbVars = requiredDbVars.filter(varName => !process.env[varName]);
  
  results.database = {
    isValid: missingDbVars.length === 0,
    missingVars: missingDbVars
  };

  if (results.database.isValid) {
    console.log('✅ Database configuration is valid');
    console.log(`   MongoDB URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
    console.log(`   DB Name: ${process.env.DB_NAME || 'NOT SET'}`);
  } else {
    console.error('❌ Database configuration is invalid');
    console.error('   Missing variables:', results.database.missingVars);
  }
  console.log('');

  // 3. Validate General Configuration
  console.log('⚙️  General Configuration:');
  const requiredGeneralVars = ['PORT', 'JWT_SECRET'];
  const missingGeneralVars = requiredGeneralVars.filter(varName => !process.env[varName]);
  
  results.general = {
    isValid: missingGeneralVars.length === 0,
    missingVars: missingGeneralVars
  };

  if (results.general.isValid) {
    console.log('✅ General configuration is valid');
    console.log(`   Port: ${process.env.PORT || 'NOT SET'}`);
    console.log(`   JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
  } else {
    console.error('❌ General configuration is invalid');
    console.error('   Missing variables:', results.general.missingVars);
  }
  console.log('');

  // Overall validation
  results.allValid = results.aws.isValid && results.database.isValid && results.general.isValid;

  if (results.allValid) {
    console.log('🎉 All configurations are valid! Server is ready to start.');
  } else {
    console.error('⚠️  Some configurations are invalid. Please check your .env file.');
    console.error('');
    console.error('📝 Required .env variables:');
    
    if (!results.aws.isValid) {
      console.error('   AWS Configuration:');
      results.aws.missingVars.forEach(varName => {
        console.error(`     ${varName}=your_${varName.toLowerCase().replace(/_/g, '_')}`);
      });
    }
    
    if (!results.database.isValid) {
      console.error('   Database Configuration:');
      results.database.missingVars.forEach(varName => {
        console.error(`     ${varName}=your_${varName.toLowerCase()}`);
      });
    }
    
    if (!results.general.isValid) {
      console.error('   General Configuration:');
      results.general.missingVars.forEach(varName => {
        console.error(`     ${varName}=your_${varName.toLowerCase()}`);
      });
    }
  }
  
  console.log('');
  return results;
};

/**
 * Displays environment-specific startup information
 */
export const displayStartupInfo = () => {
  const env = process.env.NODE_ENV || 'development';
  
  console.log('🚀 MEDH Backend Server');
  console.log(`   Environment: ${env.toUpperCase()}`);
  console.log(`   Node Version: ${process.version}`);
  console.log(`   Port: ${process.env.PORT || 3000}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('');
};
