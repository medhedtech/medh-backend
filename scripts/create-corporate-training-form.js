#!/usr/bin/env node

/**
 * Script to create the corporate training form schema
 * This script demonstrates how to use the FormSchema model to create the corporate training form
 */

import mongoose from 'mongoose';
import FormSchema from '../models/form-schema.model.js';
import { ENV_VARS } from '../config/envVars.js';

const createCorporateTrainingForm = async () => {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(ENV_VARS.DATABASE_URL);
    console.log('✅ Connected to MongoDB successfully');

    // Check if corporate training form already exists
    const existingForm = await FormSchema.findOne({ 
      form_id: 'corporate_training_inquiry_v1' 
    });

    if (existingForm) {
      console.log('⚠️  Corporate training form already exists');
      console.log('📄 Form details:');
      console.log(`   - ID: ${existingForm._id}`);
      console.log(`   - Form ID: ${existingForm.form_id}`);
      console.log(`   - Title: ${existingForm.title}`);
      console.log(`   - Status: ${existingForm.status}`);
      console.log(`   - Fields: ${existingForm.fields.length}`);
      console.log(`   - Created: ${existingForm.created_at}`);
      
      // Display form configuration
      const config = existingForm.getFormConfig();
      console.log('\n📋 Form Configuration:');
      console.log(JSON.stringify(config, null, 2));
      
      return existingForm;
    }

    // Create the corporate training form using the static method
    console.log('🚀 Creating corporate training form schema...');
    const corporateForm = await FormSchema.createCorporateTrainingForm();
    
    console.log('✅ Corporate training form created successfully!');
    console.log('📄 Form details:');
    console.log(`   - ID: ${corporateForm._id}`);
    console.log(`   - Form ID: ${corporateForm.form_id}`);
    console.log(`   - Title: ${corporateForm.title}`);
    console.log(`   - Category: ${corporateForm.category}`);
    console.log(`   - Status: ${corporateForm.status}`);
    console.log(`   - Fields: ${corporateForm.fields.length}`);

    // Display field summary
    console.log('\n📝 Form Fields:');
    corporateForm.fields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.label} (${field.type}) ${field.required ? '- Required' : ''}`);
    });

    // Display form configuration for frontend
    const formConfig = corporateForm.getFormConfig();
    console.log('\n📋 Frontend Configuration:');
    console.log(JSON.stringify(formConfig, null, 2));

    // Test validation
    console.log('\n🧪 Testing form validation...');
    
    // Test with valid data
    const validData = {
      full_name: 'John Doe',
      email: 'john.doe@company.com',
      phone_number: '+911234567890',
      country: 'India',
      designation: 'HR Manager',
      company_name: 'Tech Corp Ltd',
      company_website: 'https://techcorp.com',
      training_requirements: 'We need comprehensive training for 50 employees on cloud technologies.',
      terms_accepted: true
    };

    const validationResult = corporateForm.validateSubmission(validData);
    console.log('✅ Valid data test:', validationResult.isValid ? 'PASSED' : 'FAILED');
    if (!validationResult.isValid) {
      console.log('   Errors:', validationResult.errors);
    }

    // Test with invalid data
    const invalidData = {
      full_name: '',
      email: 'invalid-email',
      phone_number: '123',
      training_requirements: 'Too short'
    };

    const invalidValidationResult = corporateForm.validateSubmission(invalidData);
    console.log('❌ Invalid data test:', !invalidValidationResult.isValid ? 'PASSED' : 'FAILED');
    if (!invalidValidationResult.isValid) {
      console.log('   Expected errors found:', Object.keys(invalidValidationResult.errors).length);
    }

    return corporateForm;

  } catch (error) {
    console.error('❌ Error creating corporate training form:', error);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCorporateTrainingForm()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

export default createCorporateTrainingForm; 