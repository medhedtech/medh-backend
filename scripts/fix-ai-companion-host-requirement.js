import dotenv from "dotenv";
import mongoose from "mongoose";
import zoomService from "../services/zoomService.js";
import Batch from "../models/batch.model.js";

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

/**
 * Fix AI companion host requirement for existing meetings
 * This script updates Zoom meetings to allow AI companion to start without host
 */
async function fixAICompanionHostRequirement() {
  try {
    console.log("🔧 Starting AI Companion host requirement fix...");

    // Find all batches with Zoom meetings
    const batches = await Batch.find({
      "sessions.zoom_meeting_id": { $exists: true, $ne: null },
    }).populate("sessions");

    console.log(`📊 Found ${batches.length} batches with Zoom meetings`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const batch of batches) {
      console.log(`\n🔄 Processing batch: ${batch.name} (ID: ${batch._id})`);

      for (const session of batch.sessions) {
        if (session.zoom_meeting_id) {
          try {
            console.log(
              `  📅 Session: ${session.title} (Meeting ID: ${session.zoom_meeting_id})`,
            );

            // Update the Zoom meeting to enable AI companion without host
            const updatedMeeting =
              await zoomService.enableAICompanionWithoutHost(
                session.zoom_meeting_id,
              );

            console.log(
              `  ✅ Fixed AI companion settings for meeting ${session.zoom_meeting_id}`,
            );
            console.log(
              `     - AI Companion Auto Start: ${updatedMeeting.settings?.ai_companion_auto_start}`,
            );
            console.log(
              `     - Join Before Host: ${updatedMeeting.settings?.join_before_host}`,
            );
            console.log(
              `     - Waiting Room: ${updatedMeeting.settings?.waiting_room}`,
            );

            fixedCount++;
          } catch (error) {
            console.error(
              `  ❌ Error fixing meeting ${session.zoom_meeting_id}:`,
              error.message,
            );
            errorCount++;
          }
        }
      }
    }

    console.log(`\n📈 Fix Summary:`);
    console.log(`   ✅ Successfully fixed: ${fixedCount} meetings`);
    console.log(`   ❌ Errors: ${errorCount} meetings`);
    console.log(`   📊 Total processed: ${fixedCount + errorCount} meetings`);
  } catch (error) {
    console.error("❌ Script error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

/**
 * Fix a specific meeting by ID
 */
async function fixSpecificMeeting(meetingId) {
  try {
    console.log(`🔧 Fixing specific meeting: ${meetingId}`);

    const updatedMeeting =
      await zoomService.enableAICompanionWithoutHost(meetingId);

    console.log("✅ Meeting updated successfully:");
    console.log(`   - Meeting ID: ${updatedMeeting.id}`);
    console.log(`   - Topic: ${updatedMeeting.topic}`);
    console.log(
      `   - AI Companion Auto Start: ${updatedMeeting.settings?.ai_companion_auto_start}`,
    );
    console.log(
      `   - Join Before Host: ${updatedMeeting.settings?.join_before_host}`,
    );
    console.log(`   - Waiting Room: ${updatedMeeting.settings?.waiting_room}`);
    console.log(
      `   - Meeting Authentication: ${updatedMeeting.settings?.meeting_authentication}`,
    );
  } catch (error) {
    console.error("❌ Error fixing meeting:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
const args = process.argv.slice(2);

if (args.length > 0 && args[0] === "--meeting-id") {
  const meetingId = args[1];
  if (!meetingId) {
    console.error(
      "❌ Please provide a meeting ID: node fix-ai-companion-host-requirement.js --meeting-id <MEETING_ID>",
    );
    process.exit(1);
  }
  fixSpecificMeeting(meetingId);
} else {
  fixAICompanionHostRequirement();
}
