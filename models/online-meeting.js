// const mongoose = require("mongoose");
// const moment = require("moment");

// const onlineMeetingSchema = new mongoose.Schema(
//   {
//     course_name: {
//       type: String,
//       trim: true,
//     },
//     category: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     students: {
//       type: [String],
//       default: [],
//     },
//     meet_link: {
//       type: String,
//       trim: true,
//     },
//     meet_title: {
//       type: String,
//       trim: true,
//     },
//     meeting_tag: {
//       type: String,
//       enum: ["live", "demo", "recorded", "main"],
//       default: "live",
//     },
//     time: {
//       type: String,
//     },
//     date: {
//       type: Date,
//     },
//     expireAt: {
//       type: Date,
//       default: function () {
//         // Combine date and time to create a date-time string
//         const dateTimeString = `${this.date.toISOString().split("T")[0]}T${
//           this.time
//         }:00`;
//         // Add 6 hours to the meeting start time
//         return moment(dateTimeString).add(6, "hours").toDate(); // 6 hours after the meeting start
//       },
//       index: { expireAfterSeconds: 0 },
//     },
//   },
//   { timestamps: true }
// );

// const OnlineMeeting = mongoose.model("OnlineMeeting", onlineMeetingSchema);
// module.exports = OnlineMeeting;

const mongoose = require("mongoose");

// Define the Schema
const onlineMeetingSchema = new mongoose.Schema(
  {
    course_name: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    students: {
      type: [String],
      default: [],
    },
    corporate_students: {
      type: [String],
      default: [],
    },
    meet_link: {
      type: String,
      trim: true,
    },
    meet_title: {
      type: String,
      trim: true,
    },
    meeting_tag: {
      type: String,
      enum: ["live", "demo", "recorded", "main"],
      default: "live",
    },
    time: {
      type: String,
    },
    date: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    course_id: {
      type: String,
    },
  },
  { timestamps: true }
);

const OnlineMeeting = mongoose.model("OnlineMeeting", onlineMeetingSchema);
module.exports = OnlineMeeting;
