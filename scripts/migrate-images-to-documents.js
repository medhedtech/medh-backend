#!/usr/bin/env node

/**
 * Script to migrate files from medh-filess bucket to medhdocuments bucket
 * (excluding video files which should stay in medh-filess)
 *
 * Usage:
 * node scripts/migrate-images-to-documents.js [options]
 *
 * Options:
 * --dry-run: Show what would be migrated without actually doing it
 * --batch-size: Number of files to process in each batch (default: 10)
 * --source-url: Migrate a specific file URL
 * --help: Show this help message
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { ENV_VARS } from "../config/envVars.js";
import {
  migrateImageToDocumentsBucket,
  shouldMigrateFromOldBucket,
} from "../utils/s3BucketManager.js";
import logger from "../utils/logger.js";

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes("--dry-run"),
  batchSize:
    parseInt(
      args.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1],
    ) || 10,
  sourceUrl: args.find((arg) => arg.startsWith("--source-url="))?.split("=")[1],
  help: args.includes("--help"),
};

if (options.help) {
  console.log(`
Script to migrate files from medh-filess bucket to medhdocuments bucket
(excluding video files which should stay in medh-filess)

Usage:
  node scripts/migrate-images-to-documents.js [options]

Options:
  --dry-run          Show what would be migrated without actually doing it
  --batch-size=N     Number of files to process in each batch (default: 10)
  --source-url=URL   Migrate a specific file URL
  --help             Show this help message

Examples:
  node scripts/migrate-images-to-documents.js --dry-run
  node scripts/migrate-images-to-documents.js --source-url="https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg"
  node scripts/migrate-images-to-documents.js --batch-size=5
`);
  process.exit(0);
}

/**
 * Migrate a single file
 */
async function migrateSingleFile(fileUrl) {
  try {
    console.log(`\n🔍 Checking file: ${fileUrl}`);

    if (!shouldMigrateFromOldBucket(fileUrl)) {
      console.log(
        `⏭️  Skipping - file should not be migrated (either not from medh-filess or is a video file)`,
      );
      return {
        success: false,
        skipped: true,
        reason: "File should not be migrated",
      };
    }

    if (options.dryRun) {
      console.log(`📋 Would migrate: ${fileUrl}`);
      return { success: true, dryRun: true };
    }

    console.log(`🚀 Migrating file...`);
    const result = await migrateImageToDocumentsBucket(fileUrl);
    console.log(`✅ Successfully migrated to: ${result.destinationUrl}`);

    return { success: true, result };
  } catch (error) {
    console.error(`❌ Failed to migrate ${fileUrl}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log(`\n🔄 File Migration Script`);
  console.log(`=======================`);
  console.log(`Source Bucket: medh-filess`);
  console.log(
    `Destination Bucket: ${ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.DEFAULT}`,
  );
  console.log(
    `Strategy: Only videos stay in medh-filess, everything else moves to medhdocuments`,
  );
  console.log(`Dry Run: ${options.dryRun ? "Yes" : "No"}`);
  console.log(`Batch Size: ${options.batchSize}`);

  if (options.sourceUrl) {
    console.log(`\n🎯 Migrating specific file: ${options.sourceUrl}`);
    const result = await migrateSingleFile(options.sourceUrl);

    if (result.success) {
      console.log(`\n✅ Migration completed successfully!`);
      if (!options.dryRun && result.result) {
        console.log(`New URL: ${result.result.destinationUrl}`);
      }
    } else {
      console.log(`\n❌ Migration failed: ${result.error || result.reason}`);
      process.exit(1);
    }
  } else {
    console.log(
      `\n⚠️  No specific URL provided. Please use --source-url to migrate a specific file.`,
    );
    console.log(
      `Example: node scripts/migrate-images-to-documents.js --source-url="https://medh-filess.s3.ap-south-1.amazonaws.com/images/example.jpg"`,
    );
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error(`\n💥 Script failed:`, error);
  process.exit(1);
});
