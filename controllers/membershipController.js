import Membership from "../models/membership-model.js";
import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Category from "../models/category-model.js";

// Create a new membership
export const createMembership = async (req, res) => {
  try {
    const { student_id, category_ids, amount, plan_type, duration } = req.body;

    // Check course limits based on plan type
    const maxCourses = plan_type === "silver" ? 1 : 3;
    if (category_ids.length > maxCourses) {
      return res.status(400).json({
        success: false,
        message: `${plan_type} plan allows up to ${maxCourses} categories.`,
      });
    }

    // Calculate the expiry date based on the plan duration
    const durationMap = {
      monthly: 1,
      quarterly: 3,
      "half-yearly": 6,
      yearly: 12,
    };
    const durationMonths = durationMap[duration];
    if (!durationMonths) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid duration." });
    }

    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(startDate.getMonth() + durationMonths);

    // Create the membership
    const membership = new Membership({
      student_id,
      category_ids,
      amount,
      plan_type,
      max_courses: maxCourses,
      duration,
      start_date: startDate,
      expiry_date: expiryDate,
      status: "success",
    });

    // Save membership
    await membership.save();

    // Populate student and course details
    const populatedMembership = await Membership.findById(membership._id)
      .populate("student_id", "full_name email phone_number")
      .populate("category_ids", "category_name course_fee");

    res.status(201).json({
      success: true,
      message: "Membership created successfully",
      data: populatedMembership,
    });
  } catch (err) {
    console.error("Error creating membership:", err);
    res
      .status(500)
      .json({ success: false, message: "Error creating membership" });
  }
};

// Get all memberships
export const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find()
      .populate("student_id", "full_name email phone_number")
      .populate("category_ids", "category_name course_fee");

    res.status(200).json({ success: true, data: memberships });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get a single membership by ID
export const getMembershipById = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id)
      .populate("student_id", "full_name email phone_number")
      .populate("category_ids", "category_name course_fee");

    if (!membership)
      return res
        .status(404)
        .json({ success: false, message: "Membership not found" });

    res.status(200).json({ success: true, data: membership });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Renew a membership
export const renewMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await Membership.findById(id);
    if (!membership) {
      return res
        .status(404)
        .json({ success: false, message: "Membership not found." });
    }

    // Check if the membership is expired
    const now = new Date();
    if (new Date(membership.expiry_date) > now) {
      return res
        .status(400)
        .json({ success: false, message: "Membership is still active." });
    }

    // Calculate new expiry date based on duration
    const durationMap = {
      monthly: 1,
      quarterly: 3,
      "half-yearly": 6,
      yearly: 12,
    };
    const durationMonths = durationMap[membership.duration];
    if (!durationMonths) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid duration." });
    }

    const newExpiryDate = new Date(now);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + durationMonths);

    // Update membership details
    membership.start_date = now;
    membership.expiry_date = newExpiryDate;
    // membership.duration = duration;

    await membership.save();

    res.status(200).json({
      success: true,
      message: "Membership renewed successfully",
      data: membership,
    });
  } catch (err) {
    console.error("Error renewing membership:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update a membership
export const updateMembership = async (req, res) => {
  try {
    const updatedMembership = await Membership.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedMembership) {
      return res
        .status(404)
        .json({ success: false, message: "Membership not found" });
    }

    const populatedUpdatedMembership = await Membership.findById(
      updatedMembership._id
    )
      .populate("student_id", "full_name email phone_number")
      .populate("course_ids", "course_title course_fee");

    res.status(200).json({ success: true, data: populatedUpdatedMembership });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a membership by ID
export const deleteMembership = async (req, res) => {
  try {
    const deletedMembership = await Membership.findByIdAndDelete(req.params.id);

    if (!deletedMembership) {
      return res
        .status(404)
        .json({ success: false, message: "Membership not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Membership deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get the count of memberships taken by a student
export const getMembershipCountsByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;
    const totalSelfPacedMemberships = await EnrolledCourse.countDocuments({
      student_id,
      is_self_paced: true,
    });

    // Fetch self-paced memberships for the student
    const memberships = await Membership.find({
      student_id,
    });

    // Calculate active memberships based on expiry_date
    const activeMembershipsCount = memberships.filter(
      (membership) => membership.expiry_date > new Date()
    ).length;

    // Calculate expired memberships based on expiry_date
    const expiredMembershipsCount = memberships.filter(
      (membership) => membership.expiry_date <= new Date()
    ).length;

    // Return the counts as a response
    res.status(200).json({
      success: true,
      totalSelfPacedMemberships,
      activeMembershipsCount,
      expiredMembershipsCount,
    });
  } catch (error) {
    console.error("Error fetching membership counts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching membership counts",
      error,
    });
  }
};

// Get memberships by student ID, including course details
export const getMembershipsByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Step 1: Find memberships for the given student_id
    const memberships = await Membership.find({ student_id })
      .populate("student_id", "full_name email phone_number")
      .populate("category_ids", "category_name");

    // If no memberships found, return a message
    if (!memberships || memberships.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No memberships found for this student.",
      });
    }

    // Step 2: Fetch all category names
    const categoryNames = memberships.flatMap((membership) =>
      membership.category_ids.map((category) => category.category_name)
    );

    // Step 3: Fetch all courses for these category names
    const courses = await Course.find({ category: { $in: categoryNames } });

    // Step 4: Extract course IDs
    const courseIds = courses.map((course) => course._id);

    // Step 5: Fetch enrolled courses where is_self_paced is true
    const enrolledCourses = await EnrolledCourse.find({
      student_id,
      course_id: { $in: courseIds },
      is_self_paced: true,
    }).populate(
      "course_id",
      "course_title assigned_instructor category resource_videos resource_pdfs course_image"
    );

    // Step 6: Include enrolled courses in the response
    res.status(200).json({
      success: true,
      data: memberships,
      enrolled_courses: enrolledCourses,
    });
  } catch (err) {
    console.error("Error fetching memberships and enrolled courses:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching memberships and enrolled courses",
      error: err.message,
    });
  }
};

// Get the renew amount based on plan type
export const getRenewAmount = async (req, res) => {
  try {
    const { category, user_id } = req.query;
    const categoryData = await Category.findOne({ category_name: category });
    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    const previousMembership = await Membership.findOne({
      student_id: user_id,
      category_ids: {
        $in: [categoryData._id],
      },
    });
    if (!previousMembership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }
    if (previousMembership.expiry_date > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Membership is still active",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        amount: previousMembership.amount,
        membership_id: previousMembership._id,
      },
    });
  } catch (error) {
    console.error("Error fetching renew amount:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching renew amount",
      error: error.message,
    });
  }
};
