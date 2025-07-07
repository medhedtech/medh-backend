import mongoose from "mongoose";
import User from "./models/user-modal.js";
import Enrollment from "./models/enrollment-model.js";
import { Course, Batch } from "./models/course-model.js";
import Order from "./models/Order.js";

// Connect to MongoDB
await mongoose.connect("mongodb://localhost:27017/MedhDB");

console.log("=== DASHBOARD DATA TEST ===\n");

// Test date ranges
const now = new Date();
const currentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
const prevMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));

console.log("Date ranges:");
console.log("Now:", now.toISOString());
console.log("Current month start:", currentMonth.toISOString());
console.log("Previous month start:", prevMonth.toISOString());
console.log("");

// Test Users
console.log("=== USERS ===");
const totalUsers = await User.countDocuments({});
console.log("Total users:", totalUsers);

const studentUsers = await User.countDocuments({ role: "student" });
console.log('Users with role "student":', studentUsers);

const adminRoleUsers = await User.countDocuments({ admin_role: "student" });
console.log('Users with admin_role "student":', adminRoleUsers);

const sampleUsers = await User.find({}, "role admin_role createdAt").limit(3);
console.log(
  "Sample users:",
  sampleUsers.map((u) => ({
    role: u.role,
    admin_role: u.admin_role,
    createdAt: u.createdAt,
  })),
);

// Test Enrollments
console.log("\n=== ENROLLMENTS ===");
const totalEnrollments = await Enrollment.countDocuments({});
console.log("Total enrollments:", totalEnrollments);

const activeEnrollments = await Enrollment.countDocuments({ status: "active" });
console.log("Active enrollments:", activeEnrollments);

const sampleEnrollments = await Enrollment.find(
  {},
  "status enrollment_date",
).limit(3);
console.log(
  "Sample enrollments:",
  sampleEnrollments.map((e) => ({
    status: e.status,
    enrollment_date: e.enrollment_date,
  })),
);

// Test Courses
console.log("\n=== COURSES ===");
const totalCourses = await Course.countDocuments({});
console.log("Total courses:", totalCourses);

const publishedCourses = await Course.countDocuments({ status: "published" });
console.log("Published courses:", publishedCourses);

const liveCourses = await Course.countDocuments({ status: "live" });
console.log("Live courses:", liveCourses);

const sampleCourses = await Course.find({}, "status createdAt").limit(3);
console.log(
  "Sample courses:",
  sampleCourses.map((c) => ({
    status: c.status,
    createdAt: c.createdAt,
  })),
);

// Test Orders
console.log("\n=== ORDERS ===");
const totalOrders = await Order.countDocuments({});
console.log("Total orders:", totalOrders);

const paidOrders = await Order.countDocuments({ status: "paid" });
console.log("Paid orders:", paidOrders);

const sampleOrders = await Order.find({}, "status amount createdAt").limit(3);
console.log(
  "Sample orders:",
  sampleOrders.map((o) => ({
    status: o.status,
    amount: o.amount,
    createdAt: o.createdAt,
  })),
);

// Test Batches
console.log("\n=== BATCHES ===");
const totalBatches = await Batch.countDocuments({});
console.log("Total batches:", totalBatches);

const upcomingBatches = await Batch.countDocuments({ status: "Upcoming" });
console.log("Upcoming batches:", upcomingBatches);

const activeBatches = await Batch.countDocuments({ status: "Active" });
console.log("Active batches:", activeBatches);

const sampleBatches = await Batch.find({}, "status start_date").limit(3);
console.log(
  "Sample batches:",
  sampleBatches.map((b) => ({
    status: b.status,
    start_date: b.start_date,
  })),
);

await mongoose.disconnect();
console.log("\n=== TEST COMPLETE ===");
