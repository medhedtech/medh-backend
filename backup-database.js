import { exec } from "child_process";
import fs from "fs";
import path from "path";
import colors from "colors";

// Configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URL || "mongodb://localhost:27017",
    database: process.env.DB_NAME || "medh_db",
  },
  backup: {
    directory: "./backups",
    timestamp: new Date().toISOString().replace(/[:.]/g, "-"),
  },
};

// Helper function to extract database from URI and construct proper connection
const getMongoConfig = () => {
  const mongoUri = config.mongodb.uri;

  // If URI already contains database, extract it
  if (mongoUri.includes("mongodb+srv://") || mongoUri.includes("mongodb://")) {
    const uriParts = mongoUri.split("/");
    if (uriParts.length > 3) {
      // URI already contains database name
      const baseUri = uriParts.slice(0, -1).join("/");
      const databaseFromUri = uriParts[uriParts.length - 1];
      return {
        baseUri,
        database: databaseFromUri,
        fullUri: mongoUri,
      };
    } else {
      // URI doesn't contain database, append it
      return {
        baseUri: mongoUri,
        database: config.mongodb.database,
        fullUri: `${mongoUri}/${config.mongodb.database}`,
      };
    }
  }

  return {
    baseUri: mongoUri,
    database: config.mongodb.database,
    fullUri: `${mongoUri}/${config.mongodb.database}`,
  };
};

const backupDatabase = async () => {
  console.log("\n🗄️  Starting Database Backup Process...\n".cyan);

  try {
    // Create backup directory
    const backupPath = path.join(
      config.backup.directory,
      `backup-${config.backup.timestamp}`,
    );
    const mongoConfig = getMongoConfig();

    if (!fs.existsSync(config.backup.directory)) {
      fs.mkdirSync(config.backup.directory, { recursive: true });
      console.log(
        `📁 Created backup directory: ${config.backup.directory}`.gray,
      );
    }

    console.log(`📦 Backup location: ${backupPath}`.yellow);
    console.log(`🎯 Database: ${mongoConfig.database}`.yellow);
    console.log(`🔗 MongoDB URI: ${mongoConfig.baseUri}/[database]`.yellow);

    // Backup entire database
    await backupEntireDatabase(backupPath);

    // Backup specific collections
    await backupSpecificCollections(backupPath);

    // Create backup metadata
    await createBackupMetadata(backupPath);

    console.log("\n✅ Database backup completed successfully!".green);
    console.log(`📁 Backup saved to: ${backupPath}`.blue);
    console.log(
      `📄 Restore instructions saved to: ${backupPath}/RESTORE_INSTRUCTIONS.md`
        .blue,
    );
  } catch (error) {
    console.error("\n❌ Backup failed:".red, error.message);
    throw error;
  }
};

const backupEntireDatabase = (backupPath) => {
  return new Promise((resolve, reject) => {
    console.log("\n📋 Backing up entire database...".yellow);

    const mongoConfig = getMongoConfig();
    const command = `mongodump --uri="${mongoConfig.fullUri}" --out="${backupPath}"`;

    console.log(`🔗 Using URI: ${mongoConfig.baseUri}/[database]`.gray);
    console.log(`🎯 Target database: ${mongoConfig.database}`.gray);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Database backup failed:".red, error.message);
        reject(error);
      } else {
        console.log("✅ Full database backup completed".green);
        if (stdout) console.log("Output:".gray, stdout);
        if (stderr) console.log("Warnings:".yellow, stderr);
        resolve();
      }
    });
  });
};

const backupSpecificCollections = (backupPath) => {
  return new Promise((resolve, reject) => {
    console.log("\n📚 Backing up critical collections...".yellow);

    const mongoConfig = getMongoConfig();
    const collections = ["courses", "basecourses", "users", "enrollments"];
    const collectionsPath = path.join(backupPath, "collections");

    if (!fs.existsSync(collectionsPath)) {
      fs.mkdirSync(collectionsPath, { recursive: true });
    }

    let completed = 0;
    const total = collections.length;
    let hasErrors = false;

    collections.forEach((collection) => {
      const command = `mongoexport --uri="${mongoConfig.fullUri}" --collection="${collection}" --out="${collectionsPath}/${collection}.json" --pretty`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `❌ Failed to backup ${collection}:`.red,
            error.message,
          );
          hasErrors = true;
        } else {
          console.log(`✅ Backed up collection: ${collection}`.green);
        }

        completed++;
        if (completed === total) {
          if (hasErrors) {
            console.log("⚠️  Some collections failed to backup".yellow);
          } else {
            console.log("✅ All critical collections backed up".green);
          }
          resolve();
        }
      });
    });
  });
};

const createBackupMetadata = async (backupPath) => {
  console.log("\n📝 Creating backup metadata...".yellow);

  const mongoConfig = getMongoConfig();
  const metadata = {
    backup: {
      timestamp: config.backup.timestamp,
      date: new Date().toISOString(),
      database: mongoConfig.database,
      uri: mongoConfig.baseUri,
      fullUri: mongoConfig.fullUri,
      version: "1.0.0",
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
    migration: {
      purpose:
        "Pre-migration backup before legacy to new course types migration",
      status: "backup_completed",
      nextStep: "Run migration script",
    },
  };

  // Save metadata
  fs.writeFileSync(
    path.join(backupPath, "backup-metadata.json"),
    JSON.stringify(metadata, null, 2),
  );

  // Create restore instructions
  const restoreInstructions = `# Database Restore Instructions

## Backup Information
- **Date**: ${new Date().toISOString()}
- **Database**: ${mongoConfig.database}
- **Purpose**: Pre-migration backup

## Restore Commands

### Full Database Restore
\`\`\`bash
# Restore entire database
mongorestore --uri="${mongoConfig.fullUri}" --drop "${backupPath}/${mongoConfig.database}"
\`\`\`

### Individual Collection Restore
\`\`\`bash
# Restore specific collections
mongoimport --uri="${mongoConfig.fullUri}" --collection="courses" --file="${backupPath}/collections/courses.json"
mongoimport --uri="${mongoConfig.fullUri}" --collection="basecourses" --file="${backupPath}/collections/basecourses.json"
mongoimport --uri="${mongoConfig.fullUri}" --collection="users" --file="${backupPath}/collections/users.json"
mongoimport --uri="${mongoConfig.fullUri}" --collection="enrollments" --file="${backupPath}/collections/enrollments.json"
\`\`\`

## Verification
After restore, verify data integrity:
\`\`\`bash
# Check collection counts
mongosh "${mongoConfig.fullUri}" --eval "db.courses.countDocuments()"
mongosh "${mongoConfig.fullUri}" --eval "db.basecourses.countDocuments()"
\`\`\`

## Emergency Contacts
- Database Administrator: [Your DBA]
- DevOps Team: [Your DevOps Team]
`;

  fs.writeFileSync(
    path.join(backupPath, "RESTORE_INSTRUCTIONS.md"),
    restoreInstructions,
  );

  console.log("✅ Backup metadata created".green);
};

// Export for use in other scripts
export { backupDatabase, config as backupConfig };

// Run backup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupDatabase().catch((error) => {
    console.error("Backup process failed:", error);
    process.exit(1);
  });
}
