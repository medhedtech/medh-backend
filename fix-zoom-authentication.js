#!/usr/bin/env node

/**
 * Utility script to fix Zoom authentication issues
 * Usage: node fix-zoom-authentication.js <meeting_id> [--enable-auth|--disable-auth]
 */

import zoomService from "./services/zoomService.js";

async function fixZoomAuthentication() {
  const args = process.argv.slice(2);
  const meetingId = args[0];
  const action = args[1];

  if (!meetingId) {
    console.log(
      "Usage: node fix-zoom-authentication.js <meeting_id> [--enable-auth|--disable-auth]",
    );
    console.log("");
    console.log("Examples:");
    console.log("  node fix-zoom-authentication.js 123456789012345678901234");
    console.log(
      "  node fix-zoom-authentication.js 123456789012345678901234 --disable-auth",
    );
    console.log(
      "  node fix-zoom-authentication.js 123456789012345678901234 --enable-auth",
    );
    process.exit(1);
  }

  try {
    console.log(`🔧 Fixing Zoom authentication for meeting: ${meetingId}`);

    // Get current meeting details
    const meeting = await zoomService.getMeeting(meetingId);
    console.log(`📋 Meeting: ${meeting.topic}`);
    console.log(
      `🔐 Current authentication: ${meeting.settings?.meeting_authentication ? "ENABLED" : "DISABLED"}`,
    );
    console.log(
      `🚪 Waiting room: ${meeting.settings?.waiting_room ? "ENABLED" : "DISABLED"}`,
    );

    let updatedMeeting;

    if (action === "--enable-auth") {
      console.log("🔒 Enabling authentication...");
      updatedMeeting = await zoomService.enableMeetingAuthentication(meetingId);
      console.log("✅ Authentication enabled successfully");
    } else if (action === "--disable-auth") {
      console.log("🔓 Disabling authentication...");
      updatedMeeting =
        await zoomService.disableMeetingAuthentication(meetingId);
      console.log("✅ Authentication disabled successfully");
    } else {
      // Default: disable authentication for easier access
      console.log("🔓 Disabling authentication for easier access...");
      updatedMeeting = await zoomService.checkAndFixMeetingAuthentication(
        meetingId,
        false,
      );
      console.log("✅ Meeting updated successfully");
    }

    console.log("");
    console.log("📊 Updated meeting details:");
    console.log(
      `🔐 Authentication: ${updatedMeeting.settings?.meeting_authentication ? "ENABLED" : "DISABLED"}`,
    );
    console.log(
      `🚪 Waiting room: ${updatedMeeting.settings?.waiting_room ? "ENABLED" : "DISABLED"}`,
    );
    console.log(`🔑 Password: ${updatedMeeting.password}`);
    console.log(`🔗 Join URL: ${updatedMeeting.join_url}`);

    if (!updatedMeeting.settings?.meeting_authentication) {
      console.log("");
      console.log("🎉 Meeting is now accessible without authentication!");
      console.log(
        "Users can join using the password without needing a Zoom account.",
      );
    }
  } catch (error) {
    console.error("❌ Error fixing Zoom authentication:", error.message);
    if (error.response?.data) {
      console.error("Zoom API Error:", error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
fixZoomAuthentication();
