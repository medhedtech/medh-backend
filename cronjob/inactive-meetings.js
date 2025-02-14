const OnlineMeeting = require("../models/online-meeting");
const moment = require("moment");

const statusUpdater = async () => {
  try {
    console.log("Running status update job...");

    // Step 1: Get today's date
    const today = moment().format("YYYY-MM-DD");

    // Step 2: Find meetings where 'date' is today and 'status' is still 'active'
    const result = await OnlineMeeting.find({
      date: today,
      status: "active",
    });

    // Step 3: Filter meetings where the 'time' has already passed
    const meetingsToUpdate = result.filter((meeting) => {
      const currentTime = moment().format("HH:mm");
      return currentTime > moment(meeting.time, "HH:mm").format("HH:mm");
    });

    // Step 4: Update the status of the filtered meetings to 'inactive'
    const idsToUpdate = meetingsToUpdate.map((meeting) => meeting._id);

    if (idsToUpdate.length > 0) {
      await OnlineMeeting.updateMany(
        { _id: { $in: idsToUpdate } },
        { $set: { status: "inactive" } }
      );
      console.log(
        `Updated ${idsToUpdate.length} meeting(s) to status 'inactive'.`
      );
    } else {
      console.log("No meetings to update.");
    }
  } catch (error) {
    console.error("Error updating meeting status:", error);
  }
};

module.exports = { statusUpdater };
