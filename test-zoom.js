import dotenv from "dotenv";

import zoomService from "./services/zoomService.js";

dotenv.config();

async function testZoomAPI() {
  try {
    // Test user management
    console.log("Testing user management...");

    // Test getting user profile
    console.log("\nGetting user profile...");
    const userProfile = await zoomService.getUserProfile();
    console.log("User profile:", userProfile);

    // Test listing users
    console.log("\nListing users...");
    const users = await zoomService.listUsers({ page_size: 10 });
    console.log("Users list:", users);

    // Test creating a meeting
    console.log("\nCreating a test meeting...");
    const meetingData = {
      topic: "Test Meeting",
      type: 2,
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 30,
      timezone: "UTC",
      agenda: "Testing Zoom API Integration",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        auto_recording: "none",
        waiting_room: true,
      },
    };

    const meeting = await zoomService.createMeeting(meetingData);
    console.log("Meeting created:", meeting);

    // Test getting meeting details
    console.log("\nGetting meeting details...");
    const meetingDetails = await zoomService.getMeeting(meeting.id);
    console.log("Meeting details:", meetingDetails);

    // Test listing meetings
    console.log("\nListing meetings...");
    const meetings = await zoomService.listMeetings();
    console.log("Meetings list:", meetings);

    // Test adding a registrant
    console.log("\nAdding a registrant...");
    const registrant = await zoomService.addMeetingRegistrant(meeting.id, {
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      auto_approve: true,
    });
    console.log("Registrant added:", registrant);

    // Test updating registrant status
    console.log("\nUpdating registrant status...");
    const statusUpdate = await zoomService.updateRegistrantStatus(meeting.id, {
      action: "approve",
      registrants: [
        {
          id: registrant.id,
          email: registrant.email,
        },
      ],
    });
    console.log("Status updated:", statusUpdate);

    // Test updating meeting
    console.log("\nUpdating meeting...");
    const updateData = {
      topic: "Updated Test Meeting",
      settings: {
        waiting_room: false,
      },
    };
    const updatedMeeting = await zoomService.updateMeeting(
      meeting.id,
      updateData,
    );
    console.log("Meeting updated:", updatedMeeting);

    // Test deleting meeting
    console.log("\nDeleting meeting...");
    await zoomService.deleteMeeting(meeting.id);
    console.log("Meeting deleted successfully");
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

// Run the tests
testZoomAPI();
