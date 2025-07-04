#!/usr/bin/env node

/**
 * Test script for Zoom Recording Sync System
 * Usage: node test-zoom-sync.js [batchId]
 */

import { manualSyncZoomRecordings } from "./cronjob/zoom-recording-sync.js";
import { Batch } from "./models/course-model.js";
import zoomService from "./services/zoomService.js";

async function testZoomSync() {
  const batchId = process.argv[2];

  console.log("🧪 Testing Zoom Recording Sync System...");
  console.log("=====================================");

  try {
    // Test 1: Check if batch exists
    if (batchId) {
      console.log(`\n📋 Test 1: Checking batch ${batchId}...`);
      const batch = await Batch.findById(batchId).populate(
        "course",
        "course_title",
      );

      if (!batch) {
        console.log("❌ Batch not found");
        return;
      }

      console.log(`✅ Batch found: ${batch.batch_name}`);
      console.log(`📚 Course: ${batch.course?.course_title}`);
      console.log(`👥 Type: ${batch.batch_type}`);

      // Check for Zoom meetings
      const sessionsWithZoom = batch.schedule.filter(
        (s) => s.zoom_meeting?.meeting_id,
      );
      console.log(`🎥 Sessions with Zoom meetings: ${sessionsWithZoom.length}`);

      if (sessionsWithZoom.length === 0) {
        console.log("⚠️  No Zoom meetings found in this batch");
        return;
      }

      // Test 2: Check Zoom API connectivity
      console.log("\n🔗 Test 2: Checking Zoom API connectivity...");
      try {
        const token = await zoomService.getAccessToken();
        console.log("✅ Zoom API token obtained successfully");

        // Test with first meeting
        const firstMeeting = sessionsWithZoom[0];
        console.log(
          `🎥 Testing with meeting: ${firstMeeting.zoom_meeting.meeting_id}`,
        );

        const meetingDetails = await zoomService.getMeeting(
          firstMeeting.zoom_meeting.meeting_id,
        );
        console.log(`✅ Meeting details retrieved: ${meetingDetails.topic}`);

        // Check if meeting has recordings
        try {
          const recordings = await zoomService.getMeetingRecordings(
            firstMeeting.zoom_meeting.meeting_id,
          );
          console.log(
            `📹 Recordings found: ${recordings.recording_files?.length || 0}`,
          );

          if (
            recordings.recording_files &&
            recordings.recording_files.length > 0
          ) {
            console.log("📋 Recording files:");
            recordings.recording_files.forEach((recording, index) => {
              console.log(
                `  ${index + 1}. ${recording.file_type} - ${recording.file_size} bytes`,
              );
            });
          }
        } catch (recordingError) {
          console.log(
            "⚠️  Could not retrieve recordings:",
            recordingError.message,
          );
        }
      } catch (zoomError) {
        console.log("❌ Zoom API error:", zoomError.message);
        return;
      }

      // Test 3: Manual sync
      console.log("\n🔄 Test 3: Starting manual sync...");
      try {
        await manualSyncZoomRecordings(batchId);
        console.log("✅ Manual sync completed successfully");
      } catch (syncError) {
        console.log("❌ Manual sync failed:", syncError.message);
      }
    } else {
      // Test all batches
      console.log("\n📋 Test 1: Checking all batches with Zoom meetings...");
      const batches = await Batch.find({
        "schedule.zoom_meeting.meeting_id": { $exists: true, $ne: null },
      }).populate("course", "course_title");

      console.log(`✅ Found ${batches.length} batches with Zoom meetings`);

      if (batches.length === 0) {
        console.log("⚠️  No batches with Zoom meetings found");
        return;
      }

      // Show batch summary
      batches.forEach((batch, index) => {
        const zoomSessions = batch.schedule.filter(
          (s) => s.zoom_meeting?.meeting_id,
        );
        console.log(
          `  ${index + 1}. ${batch.batch_name} (${zoomSessions.length} Zoom sessions)`,
        );
      });

      // Test 2: Manual sync for all
      console.log("\n🔄 Test 2: Starting manual sync for all batches...");
      try {
        await manualSyncZoomRecordings();
        console.log("✅ Manual sync completed successfully");
      } catch (syncError) {
        console.log("❌ Manual sync failed:", syncError.message);
      }
    }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testZoomSync()
  .then(() => {
    console.log("\n🎉 Test script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test script crashed:", error);
    process.exit(1);
  });
