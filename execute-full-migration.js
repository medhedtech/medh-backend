import colors from "colors";
import readline from "readline";
import { backupDatabase } from "./backup-database.js";
import { migrateLegacyToNew } from "./migrate-legacy-to-new.js";
import { validateMigration } from "./validate-migration.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const executeFullMigration = async () => {
  console.log("\n🚀 MEDH COURSE MIGRATION SYSTEM".cyan.bold);
  console.log("═".repeat(50).gray);
  console.log("This script will migrate ALL legacy courses to new course types.".white);
  console.log("The process includes: Backup → Migration → Validation".white);

  try {
    // Step 1: Pre-migration safety checks
    console.log("\n📋 PRE-MIGRATION SAFETY CHECKS".yellow.bold);
    
    const confirmation = await askQuestion(
      "\n🔸 Do you want to proceed with the full migration? (yes/no): "
    );
    
    if (confirmation.toLowerCase() !== 'yes') {
      console.log("\n⏹️  Migration cancelled by user.".yellow);
      process.exit(0);
    }

    // Step 2: Create database backup
    console.log("\n📦 STEP 1: DATABASE BACKUP".yellow.bold);
    console.log("Creating a complete backup of your database...".white);
    
    try {
      await backupDatabase();
      console.log("✅ Database backup completed successfully!".green);
    } catch (error) {
      console.error("❌ Backup failed:", error.message);
      const continueWithoutBackup = await askQuestion(
        "\n⚠️  Backup failed. Do you want to continue WITHOUT backup? (yes/no): "
      );
      
      if (continueWithoutBackup.toLowerCase() !== 'yes') {
        console.log("\n⏹️  Migration cancelled for safety.".yellow);
        process.exit(1);
      }
    }

    // Step 3: Execute migration
    console.log("\n🔄 STEP 2: COURSE MIGRATION".yellow.bold);
    console.log("Migrating all legacy courses to new course types...".white);
    
    try {
      await migrateLegacyToNew();
      console.log("✅ Course migration completed!".green);
    } catch (error) {
      console.error("❌ Migration failed:", error.message);
      console.log("\n🛠️  You may need to restore from backup if data is corrupted.".red);
      
      const validateAnyway = await askQuestion(
        "\nDo you want to run validation anyway to assess damage? (yes/no): "
      );
      
      if (validateAnyway.toLowerCase() === 'yes') {
        await runValidation();
      }
      
      process.exit(1);
    }

    // Step 4: Validate migration
    console.log("\n✅ STEP 3: MIGRATION VALIDATION".yellow.bold);
    console.log("Validating migration results and data integrity...".white);
    
    try {
      await validateMigration();
      console.log("✅ Migration validation completed!".green);
    } catch (error) {
      console.error("❌ Validation failed:", error.message);
      console.log("⚠️  Migration may have succeeded but validation encountered issues.".yellow);
    }

    // Step 5: Final summary and next steps
    console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!".green.bold);
    console.log("═".repeat(50).gray);
    
    console.log("\n📄 Generated Files:".blue);
    console.log("  • backup-{timestamp}/ - Complete database backup".gray);
    console.log("  • migration-results.json - Detailed migration report".gray);
    console.log("  • migration-validation-report.json - Validation results".gray);

    console.log("\n🔍 Next Steps:".blue);
    console.log("  1. Review migration reports for any issues".white);
    console.log("  2. Test your application with new course types".white);
    console.log("  3. Update frontend integrations if needed".white);
    console.log("  4. Monitor system performance".white);
    console.log("  5. Consider removing legacy courses after verification".white);

    console.log("\n📚 Documentation:".blue);
    console.log("  • FRONTEND_API_INTEGRATION_GUIDE.md - API integration guide".white);
    console.log("  • MIGRATION_READINESS_REPORT.md - Pre-migration analysis".white);
    console.log("  • COURSE_MODELS_COMPARISON.md - Model comparison".white);

    console.log("\n🚨 Emergency Rollback:".red.bold);
    console.log("If you need to rollback, use the backup in the backups/ directory.".yellow);
    console.log("Follow instructions in the backup's RESTORE_INSTRUCTIONS.md file.".yellow);

  } catch (error) {
    console.error("\n💥 CRITICAL ERROR:", error.message);
    console.log("\n🛟 EMERGENCY PROCEDURES:".red.bold);
    console.log("1. Check if backup was created successfully".white);
    console.log("2. Do NOT make any more changes to the database".white);
    console.log("3. Contact your database administrator immediately".white);
    console.log("4. Restore from backup if necessary".white);
  } finally {
    rl.close();
  }
};

const runValidation = async () => {
  try {
    await validateMigration();
  } catch (error) {
    console.error("Validation error:", error.message);
  }
};

// Interactive migration options
const showMigrationMenu = async () => {
  console.log("\n🎛️  MIGRATION OPTIONS".cyan.bold);
  console.log("═".repeat(30).gray);
  console.log("1. Full Migration (Backup + Migrate + Validate)".white);
  console.log("2. Backup Only".white);
  console.log("3. Migration Only (No Backup)".white);
  console.log("4. Validation Only".white);
  console.log("5. Dry Run (Test Migration)".white);
  console.log("6. Exit".white);

  const choice = await askQuestion("\nChoose an option (1-6): ");

  switch (choice) {
    case '1':
      await executeFullMigration();
      break;
    case '2':
      console.log("\n📦 Creating database backup...".yellow);
      try {
        await backupDatabase();
        console.log("✅ Backup completed successfully!".green);
      } catch (error) {
        console.error("❌ Backup failed:", error.message);
      }
      break;
    case '3':
      const confirm = await askQuestion(
        "\n⚠️  This will migrate without backup. Are you sure? (yes/no): "
      );
      if (confirm.toLowerCase() === 'yes') {
        console.log("\n🔄 Starting migration...".yellow);
        try {
          await migrateLegacyToNew();
          console.log("✅ Migration completed!".green);
        } catch (error) {
          console.error("❌ Migration failed:", error.message);
        }
      }
      break;
    case '4':
      console.log("\n✅ Running validation...".yellow);
      try {
        await validateMigration();
        console.log("✅ Validation completed!".green);
      } catch (error) {
        console.error("❌ Validation failed:", error.message);
      }
      break;
    case '5':
      console.log("\n🧪 Running dry run migration...".yellow);
      console.log("This will simulate migration without making changes.".gray);
      // Note: You would need to modify migrate-legacy-to-new.js to set dryRun: true
      console.log("💡 To enable dry run, edit migrate-legacy-to-new.js and set config.migration.dryRun = true".blue);
      break;
    case '6':
      console.log("\n👋 Goodbye!".cyan);
      process.exit(0);
      break;
    default:
      console.log("\n❌ Invalid option. Please choose 1-6.".red);
      await showMigrationMenu();
      break;
  }
};

// Check command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Interactive mode
  showMigrationMenu();
} else {
  // Command line mode
  const command = args[0];
  
  switch (command) {
    case 'full':
      executeFullMigration();
      break;
    case 'backup':
      backupDatabase();
      break;
    case 'migrate':
      migrateLegacyToNew();
      break;
    case 'validate':
      validateMigration();
      break;
    case 'help':
      console.log("\n🎛️  MIGRATION COMMANDS".cyan.bold);
      console.log("Usage: node execute-full-migration.js [command]".white);
      console.log("\nCommands:".yellow);
      console.log("  full     - Run complete migration process".white);
      console.log("  backup   - Create database backup only".white);
      console.log("  migrate  - Run migration only".white);
      console.log("  validate - Run validation only".white);
      console.log("  help     - Show this help message".white);
      console.log("\nWith no command, interactive mode will start.".gray);
      break;
    default:
      console.log(`\n❌ Unknown command: ${command}`.red);
      console.log("Use 'help' for available commands.".gray);
      break;
  }
}

export { executeFullMigration, showMigrationMenu }; 