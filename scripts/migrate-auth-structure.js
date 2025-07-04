#!/usr/bin/env node

/**
 * Migration Script: Old Auth Structure → New User Model
 * 
 * This script migrates:
 * - status: "Active"/"Inactive" → is_active: true/false
 * - emailVerified: true/false → email_verified: true/false
 * - Adds missing new fields with defaults
 * - Updates all related code references
 */

import mongoose from 'mongoose';
import { ENV_VARS } from '../config/envVars.js';
import User from '../models/user-modal.js';
import logger from '../utils/logger.js';

class AuthMigration {
  constructor() {
    this.migrationStats = {
      usersProcessed: 0,
      usersUpdated: 0,
      errors: 0,
      startTime: new Date()
    };
  }

  async connect() {
    try {
      await mongoose.connect(ENV_VARS.MONGODB_URI);
      logger.info('✅ Connected to MongoDB for migration');
    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    logger.info('✅ Disconnected from MongoDB');
  }

  /**
   * Migrate user documents from old structure to new structure
   */
  async migrateUsers() {
    logger.info('🚀 Starting user migration...');
    
    try {
      // Find all users that need migration
      const users = await User.find({
        $or: [
          { status: { $exists: true } },
          { emailVerified: { $exists: true } },
          { is_active: { $exists: false } },
          { email_verified: { $exists: false } }
        ]
      });

      logger.info(`📊 Found ${users.length} users to migrate`);

      for (const user of users) {
        try {
          this.migrationStats.usersProcessed++;
          
          const updates = {};
          let needsUpdate = false;

          // Migrate status → is_active
          if (user.status !== undefined) {
            updates.is_active = user.status === 'Active';
            updates.$unset = { status: 1 };
            needsUpdate = true;
          }

          // Migrate emailVerified → email_verified
          if (user.emailVerified !== undefined) {
            updates.email_verified = user.emailVerified;
            if (!updates.$unset) updates.$unset = {};
            updates.$unset.emailVerified = 1;
            needsUpdate = true;
          }

          // Add missing new fields with defaults
          if (user.phone_verified === undefined) {
            updates.phone_verified = false;
            needsUpdate = true;
          }

          if (user.identity_verified === undefined) {
            updates.identity_verified = false;
            needsUpdate = true;
          }

          if (user.is_banned === undefined) {
            updates.is_banned = false;
            needsUpdate = true;
          }

          if (user.account_type === undefined) {
            // Determine account type based on role
            if (user.role && user.role.includes('admin')) {
              updates.account_type = 'admin';
            } else if (user.role && user.role.includes('instructor')) {
              updates.account_type = 'instructor';
            } else {
              updates.account_type = 'free';
            }
            needsUpdate = true;
          }

          if (user.subscription_status === undefined) {
            updates.subscription_status = 'inactive';
            needsUpdate = true;
          }

          if (user.trial_used === undefined) {
            updates.trial_used = false;
            needsUpdate = true;
          }

          // Add user preferences if missing
          if (!user.preferences) {
            updates.preferences = {
              theme: 'auto',
              language: 'en',
              currency: 'USD',
              timezone: 'UTC',
              notifications: {
                email: {
                  marketing: true,
                  course_updates: true,
                  system_alerts: true,
                  weekly_summary: true,
                  achievement_unlocked: true
                },
                push: {
                  enabled: false,
                  marketing: false,
                  course_reminders: true,
                  live_sessions: true,
                  community_activity: false
                },
                sms: {
                  enabled: false,
                  security_alerts: false,
                  urgent_only: false
                }
              },
              privacy: {
                profile_visibility: 'public',
                activity_tracking: true,
                data_analytics: true,
                third_party_sharing: false
              }
            };
            needsUpdate = true;
          }

          // Update user if needed
          if (needsUpdate) {
            await User.updateOne({ _id: user._id }, updates);
            this.migrationStats.usersUpdated++;
            
            logger.debug(`✅ Migrated user: ${user.email}`);
          }

        } catch (error) {
          this.migrationStats.errors++;
          logger.error(`❌ Error migrating user ${user.email}:`, error);
        }
      }

      logger.info('✅ User migration completed');
      
    } catch (error) {
      logger.error('❌ User migration failed:', error);
      throw error;
    }
  }

  /**
   * Update indexes for new fields
   */
  async updateIndexes() {
    logger.info('🔧 Updating database indexes...');
    
    try {
      const User = mongoose.model('User');
      
      // Add indexes for new fields
      await User.collection.createIndex({ is_active: 1 });
      await User.collection.createIndex({ email_verified: 1 });
      await User.collection.createIndex({ account_type: 1 });
      await User.collection.createIndex({ subscription_status: 1 });
      
      // Drop old indexes if they exist
      try {
        await User.collection.dropIndex({ status: 1 });
      } catch (e) {
        // Index might not exist, ignore
      }
      
      try {
        await User.collection.dropIndex({ emailVerified: 1 });
      } catch (e) {
        // Index might not exist, ignore
      }

      logger.info('✅ Database indexes updated');
      
    } catch (error) {
      logger.error('❌ Index update failed:', error);
      throw error;
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration() {
    logger.info('🔍 Validating migration...');
    
    try {
      // Check for any remaining old fields
      const usersWithOldStatus = await User.countDocuments({ status: { $exists: true } });
      const usersWithOldEmailVerified = await User.countDocuments({ emailVerified: { $exists: true } });
      
      if (usersWithOldStatus > 0) {
        logger.warn(`⚠️  ${usersWithOldStatus} users still have old 'status' field`);
      }
      
      if (usersWithOldEmailVerified > 0) {
        logger.warn(`⚠️  ${usersWithOldEmailVerified} users still have old 'emailVerified' field`);
      }

      // Check new fields
      const usersWithNewFields = await User.countDocuments({
        is_active: { $exists: true },
        email_verified: { $exists: true }
      });

      logger.info(`✅ ${usersWithNewFields} users have new field structure`);
      
    } catch (error) {
      logger.error('❌ Migration validation failed:', error);
      throw error;
    }
  }

  /**
   * Print migration summary
   */
  printSummary() {
    const duration = new Date() - this.migrationStats.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
    console.log(`👥 Users Processed: ${this.migrationStats.usersProcessed}`);
    console.log(`✅ Users Updated: ${this.migrationStats.usersUpdated}`);
    console.log(`❌ Errors: ${this.migrationStats.errors}`);
    console.log('='.repeat(60));
    
    if (this.migrationStats.errors === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with errors. Check logs for details.');
    }
  }

  /**
   * Run the complete migration
   */
  async run() {
    try {
      console.log('🚀 Starting Auth Structure Migration...\n');
      
      await this.connect();
      await this.migrateUsers();
      await this.updateIndexes();
      await this.validateMigration();
      
      this.printSummary();
      
    } catch (error) {
      logger.error('💥 Migration failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new AuthMigration();
  migration.run().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export default AuthMigration; 