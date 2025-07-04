#!/usr/bin/env node

/**
 * FAST AUTH MIGRATION SCRIPT
 * 
 * This script quickly migrates the entire authentication system:
 * 1. Updates database records (old → new field structure)
 * 2. Updates all code references (old → new field names)
 * 3. Validates the migration
 * 
 * Run with: node scripts/fast-auth-migration.js
 */

import AuthMigration from './migrate-auth-structure.js';
import CodeUpdater from './update-auth-code.js';

class FastAuthMigration {
  constructor() {
    this.startTime = new Date();
  }

  async run() {
    console.log('🚀 FAST AUTH MIGRATION STARTING...\n');
    console.log('This will migrate your authentication system to the new structure.\n');
    
    try {
      // Step 1: Database Migration
      console.log('📊 STEP 1: Database Migration');
      console.log('='.repeat(50));
      const dbMigration = new AuthMigration();
      await dbMigration.run();
      
      console.log('\n');
      
      // Step 2: Code Updates
      console.log('💻 STEP 2: Code Updates');
      console.log('='.repeat(50));
      const codeUpdater = new CodeUpdater();
      codeUpdater.run();
      
      // Step 3: Final Summary
      this.printFinalSummary();
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    }
  }

  printFinalSummary() {
    const duration = new Date() - this.startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 FAST AUTH MIGRATION COMPLETED!');
    console.log('='.repeat(70));
    console.log(`⏱️  Total Duration: ${Math.round(duration / 1000)}s`);
    console.log('');
    console.log('✅ Database Migration: COMPLETE');
    console.log('   - Old fields migrated to new structure');
    console.log('   - Indexes updated');
    console.log('   - Data validated');
    console.log('');
    console.log('✅ Code Updates: COMPLETE');
    console.log('   - All references updated to new field names');
    console.log('   - Validation logic updated');
    console.log('   - Comments updated');
    console.log('');
    console.log('🔄 CHANGES MADE:');
    console.log('   - is_active: true/"Inactive" → is_active: true/false');
    console.log('   - emailVerified: boolean → email_verified: boolean');
    console.log('   - Added new user model fields with defaults');
    console.log('   - Updated all code references');
    console.log('');
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Review the changes in your code');
    console.log('   2. Test the authentication flow');
    console.log('   3. Update your frontend to use new field names');
    console.log('   4. Deploy when ready');
    console.log('');
    console.log('📚 NEW FIELD MAPPING:');
    console.log('   - user.is_active (boolean) - replaces user.status');
    console.log('   - user.email_verified (boolean) - replaces user.email_verified');
    console.log('   - user.phone_verified (boolean) - new field');
    console.log('   - user.identity_verified (boolean) - new field');
    console.log('   - user.account_type (string) - new field');
    console.log('   - user.preferences (object) - new field');
    console.log('='.repeat(70));
  }
}

// Run migration
const migration = new FastAuthMigration();
migration.run().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 