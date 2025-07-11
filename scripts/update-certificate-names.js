import mongoose from "mongoose";
import { ENV_VARS } from "../config/envVars.js";
import connectDB from "../config/db.js";
import Certificate from "../models/certificate-model.js";
import logger from "../utils/logger.js";

const certificateNameUpdates = {
  "CERT-20241215-18CFDB86": "Chestha Bhardwaj : CERT-20241215-18CFDB86",
  "CERT-20241220-2DC142EE": "Parthavi : CERT-20241220-2DC142EE",
  "CERT-20241225-CD490534": "Hitika Meratwal : CERT-20241225-CD490534",
  "CERT-20241230-08943F43": "Suyash Kumar : CERT-20241230-08943F43",
  "CERT-20250105-2A406CC3": "Janvi Saxena : CERT-20250105-2A406CC3",
  "CERT-20250110-327DFCA7": "Aarav : CERT-20250110-327DFCA7",
};

const updateCertificateNames = async () => {
  await connectDB(); // Ensure database connection is established

  logger.info("Starting specific certificate student_name updates...");

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const certificateNumber in certificateNameUpdates) {
    if (certificateNameUpdates.hasOwnProperty(certificateNumber)) {
      const studentName = certificateNameUpdates[certificateNumber];
      try {
        const result = await Certificate.updateOne(
          { certificateNumber: certificateNumber.toUpperCase() },
          { $set: { student_name: studentName } },
        );

        if (result.matchedCount > 0) {
          if (result.modifiedCount > 0) {
            logger.info(
              `Successfully updated certificate ${certificateNumber} with student_name: ${studentName}`,
            );
            updatedCount++;
          } else {
            logger.info(
              `Certificate ${certificateNumber} found, but student_name was already set to: ${studentName}. No modification needed.`,
            );
          }
        } else {
          logger.warn(
            `Certificate with number ${certificateNumber} not found.`,
          );
          notFoundCount++;
        }
      } catch (error) {
        logger.error(
          `Error updating certificate ${certificateNumber}: ${error.message}`,
        );
        errorCount++;
      }
    }
  }

  logger.info(
    `Update complete. Total: ${Object.keys(certificateNameUpdates).length}, Updated: ${updatedCount}, Not Found: ${notFoundCount}, Errors: ${errorCount}.`,
  );

  await mongoose.disconnect();
  logger.info("Database disconnected.");
};

updateCertificateNames();
