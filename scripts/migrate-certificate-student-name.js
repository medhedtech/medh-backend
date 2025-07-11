import mongoose from "mongoose";
import { ENV_VARS } from "../config/envVars.js";
import connectDB from "../config/db.js";
import Certificate from "../models/certificate-model.js";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";

const migrateCertificates = async () => {
  await connectDB(); // Ensure database connection is established

  logger.info("Starting certificate student_name migration...");

  try {
    // Find certificates that do not have the student_name field
    const certificatesToMigrate = await Certificate.find({
      student_name: { $exists: false },
    });

    if (certificatesToMigrate.length === 0) {
      logger.info(
        "No certificates found requiring student_name migration. Exiting.",
      );
      return;
    }

    logger.info(
      `Found ${certificatesToMigrate.length} certificates to migrate.`,
    );

    let updatedCount = 0;
    let skippedCount = 0;

    for (const cert of certificatesToMigrate) {
      try {
        // Populate the student to get their full_name
        const student = await User.findById(cert.student)
          .select("full_name")
          .lean();

        let studentName = "";
        if (student && student.full_name) {
          studentName = student.full_name;
        } else {
          logger.warn(
            `Could not find full_name for student ID: ${cert.student} on certificate ${cert._id}. Setting student_name to empty string.`,
          );
        }

        // Update the certificate with the new student_name field
        await Certificate.updateOne(
          { _id: cert._id },
          { $set: { student_name: studentName } },
        );
        updatedCount++;
      } catch (innerError) {
        skippedCount++;
        logger.error(
          `Error processing certificate ${cert._id}: ${innerError.message}`,
        );
      }
    }

    logger.info(
      `Migration complete. Successfully updated ${updatedCount} certificates. Skipped ${skippedCount} due to errors.`,
    );
  } catch (error) {
    logger.error("Failed to migrate certificates:", {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    await mongoose.disconnect();
    logger.info("Database disconnected.");
  }
};

migrateCertificates();
