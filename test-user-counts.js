import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/user-modal.js";

dotenv.config();

async function testUserCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    // Get all users to see their roles
    const users = await User.find({ is_active: true }).select(
      "role full_name email",
    );
    console.log(`Found ${users.length} active users`);

    // Count by role
    const roleCounts = {};
    users.forEach((user) => {
      const role = Array.isArray(user.role) ? user.role[0] : user.role;
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    console.log("Role counts:", roleCounts);

    // Specific counts
    const studentCount = await User.countDocuments({
      $or: [
        { role: "student" },
        { role: { $in: ["student"] } },
        { "role.0": "student" },
      ],
      is_active: true,
    });

    const corporateStudentCount = await User.countDocuments({
      $or: [
        { role: "corporate-student" },
        { role: { $in: ["corporate-student"] } },
        { "role.0": "corporate-student" },
      ],
      is_active: true,
    });

    const coorporateStudentCount = await User.countDocuments({
      $or: [
        { role: "coorporate-student" },
        { role: { $in: ["coorporate-student"] } },
        { "role.0": "coorporate-student" },
      ],
      is_active: true,
    });

    console.log("Student count:", studentCount);
    console.log("Corporate-student count:", corporateStudentCount);
    console.log("Coorporate-student count:", coorporateStudentCount);

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

testUserCounts();
