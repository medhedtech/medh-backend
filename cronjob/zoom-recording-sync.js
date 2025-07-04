import cron from "node-cron";
import { Batch } from "../models/course-model.js";
import zoomService from "../services/zoomService.js";
import { uploadBase64FileOptimized } from "../utils/uploadFile.js";
import { ENV_VARS } from "../config/envVars.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cron job to sync Zoom recordings to S3 and add as recorded lessons
 * Runs every 15 minutes to check for completed meetings
 */
export const startZoomRecordingSync = () => {
  console.log("🔄 Starting Zoom Recording Sync Cron Job...");

  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("📹 [Zoom Sync] Starting recording sync check...");
      await syncZoomRecordings();
    } catch (error) {
      console.error("❌ [Zoom Sync] Error in cron job:", error);
    }
  });
};

/**
 * Main function to sync Zoom recordings
 */
async function syncZoomRecordings() {
  try {
    // Find all batches with scheduled sessions that have Zoom meetings
    const batches = await Batch.find({
      "schedule.zoom_meeting.meeting_id": { $exists: true, $ne: null },
    }).populate("course", "course_title");

    console.log(
      `📋 [Zoom Sync] Found ${batches.length} batches with Zoom meetings`,
    );

    for (const batch of batches) {
      await processBatchRecordings(batch);
    }

    console.log("✅ [Zoom Sync] Recording sync completed");
  } catch (error) {
    console.error("❌ [Zoom Sync] Error syncing recordings:", error);
  }
}

/**
 * Process recordings for a specific batch
 */
async function processBatchRecordings(batch) {
  try {
    console.log(`🎬 [Zoom Sync] Processing batch: ${batch.batch_name}`);

    for (const session of batch.schedule) {
      if (
        session.zoom_meeting?.meeting_id &&
        !session.zoom_meeting.recording_synced
      ) {
        await processSessionRecording(batch, session);
      }
    }
  } catch (error) {
    console.error(
      `❌ [Zoom Sync] Error processing batch ${batch.batch_name}:`,
      error,
    );
  }
}

/**
 * Process recording for a specific session
 */
async function processSessionRecording(batch, session) {
  try {
    const meetingId = session.zoom_meeting.meeting_id;
    console.log(`🎥 [Zoom Sync] Processing meeting: ${meetingId}`);

    // Check if meeting has ended and has recordings
    const meetingDetails = await zoomService.getMeeting(meetingId);
    const now = new Date();
    const meetingEndTime = new Date(meetingDetails.start_time);
    meetingEndTime.setMinutes(
      meetingEndTime.getMinutes() + (meetingDetails.duration || 60),
    );

    // Only process if meeting has ended (with 5 minute buffer)
    if (now < new Date(meetingEndTime.getTime() + 5 * 60 * 1000)) {
      console.log(
        `⏰ [Zoom Sync] Meeting ${meetingId} hasn't ended yet, skipping`,
      );
      return;
    }

    // Retry logic: check if we should wait for next_retry_at
    if (session.zoom_meeting.next_retry_at) {
      const nextRetry = new Date(session.zoom_meeting.next_retry_at);
      if (now < nextRetry) {
        console.log(
          `⏳ [Zoom Sync] Waiting until ${nextRetry.toISOString()} for next retry of meeting ${meetingId}`,
        );
        return;
      }
    }

    // Get recordings for the meeting
    const recordings = await zoomService.getMeetingRecordings(meetingId);

    if (
      !recordings.recording_files ||
      recordings.recording_files.length === 0
    ) {
      // No recordings found, schedule a retry if under max attempts
      session.zoom_meeting.sync_attempts =
        (session.zoom_meeting.sync_attempts || 0) + 1;
      session.zoom_meeting.last_sync_error = "No recordings found";
      if (session.zoom_meeting.sync_attempts < 3) {
        const nextRetry = new Date(now.getTime() + 30 * 60 * 1000); // 30 min later
        session.zoom_meeting.next_retry_at = nextRetry;
        console.log(
          `🔁 [Zoom Sync] No recordings found for meeting ${meetingId}, will retry at ${nextRetry.toISOString()}`,
        );
      } else {
        session.zoom_meeting.next_retry_at = null;
        console.log(
          `❌ [Zoom Sync] Max retries reached for meeting ${meetingId}, giving up.`,
        );
      }
      await batch.save();
      return;
    }

    // If we get here, we have recordings, clear retry state
    session.zoom_meeting.next_retry_at = null;
    session.zoom_meeting.sync_attempts = 0;
    session.zoom_meeting.last_sync_error = null;

    console.log(
      `📹 [Zoom Sync] Found ${recordings.recording_files.length} recording files`,
    );

    // Process each recording file
    for (const recording of recordings.recording_files) {
      await downloadAndUploadRecording(batch, session, recording);
    }

    // Mark session as synced
    session.zoom_meeting.recording_synced = true;
    session.zoom_meeting.last_sync_date = new Date();
    await batch.save();

    console.log(
      `✅ [Zoom Sync] Successfully synced recordings for meeting ${meetingId}`,
    );
  } catch (error) {
    // On error, increment sync_attempts and set next_retry_at if under max
    session.zoom_meeting.sync_attempts =
      (session.zoom_meeting.sync_attempts || 0) + 1;
    session.zoom_meeting.last_sync_error = error.message;
    if (session.zoom_meeting.sync_attempts < 3) {
      const now = new Date();
      const nextRetry = new Date(now.getTime() + 30 * 60 * 1000); // 30 min later
      session.zoom_meeting.next_retry_at = nextRetry;
      console.log(
        `🔁 [Zoom Sync] Error, will retry at ${nextRetry.toISOString()}`,
      );
    } else {
      session.zoom_meeting.next_retry_at = null;
      console.log(
        `❌ [Zoom Sync] Max retries reached for meeting ${session.zoom_meeting.meeting_id}, giving up.`,
      );
    }
    await batch.save();
    console.error(`❌ [Zoom Sync] Error processing session recording:`, error);
  }
}

/**
 * Download recording from Zoom and upload to S3
 */
async function downloadAndUploadRecording(batch, session, recording) {
  try {
    console.log(`⬇️ [Zoom Sync] Downloading recording: ${recording.file_type}`);

    // Download the recording file
    const response = await axios({
      method: "GET",
      url: recording.download_url,
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${await zoomService.getAccessToken()}`,
      },
    });

    // Convert to base64
    const base64Data = Buffer.from(response.data).toString("base64");
    const mimeType = getMimeType(recording.file_type);

    // Determine upload folder based on batch type
    let uploadFolder;
    if (batch.batch_type === "individual") {
      // For individual batch, use student-specific folder
      uploadFolder = `videos/student/${batch.enrolled_students[0] || "unknown"}`;
    } else {
      // For group batch, use batch ID
      uploadFolder = `videos/${batch._id}`;
    }

    // Generate filename
    const sessionDate = session.date
      ? new Date(session.date).toISOString().split("T")[0]
      : "unknown-date";
    const fileName = `zoom-recording-${sessionDate}-${recording.file_type}-${Date.now()}`;

    // Upload to S3
    const uploadResult = await uploadBase64FileOptimized(
      base64Data,
      mimeType,
      `${uploadFolder}/${fileName}`,
    );

    console.log(`⬆️ [Zoom Sync] Uploaded to S3: ${uploadResult.data.url}`);

    // Add as recorded lesson to the session
    const lessonTitle = `Zoom Recording - ${sessionDate} (${recording.file_type.toUpperCase()})`;

    session.recorded_lessons.push({
      title: lessonTitle,
      url: uploadResult.data.url,
      recorded_date: session.date || new Date(),
      created_by: batch.assigned_instructor || "system",
      source: "zoom_auto_sync",
      zoom_recording_info: {
        meeting_id: session.zoom_meeting.meeting_id,
        file_type: recording.file_type,
        file_size: recording.file_size,
        recording_start: recording.recording_start,
        recording_end: recording.recording_end,
        download_url: recording.download_url,
        sync_date: new Date(),
      },
    });

    console.log(`📝 [Zoom Sync] Added as recorded lesson: ${lessonTitle}`);
  } catch (error) {
    console.error(
      `❌ [Zoom Sync] Error downloading/uploading recording:`,
      error,
    );
  }
}

/**
 * Get MIME type based on Zoom file type
 */
function getMimeType(fileType) {
  const mimeTypes = {
    MP4: "video/mp4",
    M4A: "audio/mp4",
    TXT: "text/plain",
    VTT: "text/vtt",
    JSON: "application/json",
  };

  return mimeTypes[fileType.toUpperCase()] || "video/mp4";
}

/**
 * Manual sync function for testing
 */
export const manualSyncZoomRecordings = async (batchId = null) => {
  try {
    console.log("🔄 [Manual Sync] Starting manual Zoom recording sync...");

    if (batchId) {
      // Sync specific batch
      const batch = await Batch.findById(batchId).populate(
        "course",
        "course_title",
      );
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }
      await processBatchRecordings(batch);
    } else {
      // Sync all batches
      await syncZoomRecordings();
    }

    console.log("✅ [Manual Sync] Manual sync completed successfully");
  } catch (error) {
    console.error("❌ [Manual Sync] Error in manual sync:", error);
    throw error;
  }
};

/**
 * Clean up old temporary files
 */
export const cleanupTempFiles = () => {
  const tempDir = path.join(__dirname, "../temp");

  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) {
        console.error("Error reading temp directory:", err);
        return;
      }

      files.forEach((file) => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = Date.now() - stats.mtime.getTime();

        // Delete files older than 1 hour
        if (fileAge > 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ [Cleanup] Deleted old temp file: ${file}`);
        }
      });
    });
  }
};

// Start cleanup cron (runs every hour)
cron.schedule("0 * * * *", cleanupTempFiles);

export default {
  startZoomRecordingSync,
  manualSyncZoomRecordings,
  cleanupTempFiles,
};
