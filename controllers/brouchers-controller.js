const path = require("path");
const Broucher = require("../models/broucker-model");
const Course = require("../models/course-model");
const nodemailer = require("nodemailer");

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createBrouchers = async (req, res) => {
  try {
    const { full_name, email, phone_number, course_title } = req.body;

    // Fetch course details by course_title
    const course = await Course.findOne({ course_title }).populate(
      "course_videos",
      "brouchers"
    ); // Populate related fields if needed
    if (!course) {
      return res.status(404).json({ message: "Course not found!" });
    }

    // Validate brochures for the course
    if (!course.brochures || course.brochures.length === 0) {
      return res.status(404).json({
        message: `No brochures available for the course "${course_title}"`,
      });
    }

    // Create new brochure record in the database
    const newBroucher = new Broucher({
      full_name,
      email,
      phone_number,
      //   brochures,
    });

    await newBroucher.save();

    const attachements = course.brochures.map((b) => {
      return {
        filename: `${course_title}-brochure.pdf`,
        path: b,
      };
    });

    // Email options with the brochure as an attachment
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Brochure for ${course_title}`,
      text: `Hello ${full_name},\n\nThank you for your interest in our course "${course_title}". Please find the brochure attached.\n\nCourse Details:\nTitle: ${course.course_title}\nCategory: ${course.course_category}\nDuration: ${course.course_duration}\nFee: $${course.course_fee}\n\nBest regards,\nYour Team`,
      attachments: attachements,
    };

    // Send the email with the brochure
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        return res
          .status(500)
          .json({ message: "Error sending email", error: err.message });
      }

      console.log("Email sent:", info.response);
      res.status(201).json({
        message: "Brochure created and email sent successfully",
        newBroucher,
      });
    });
  } catch (error) {
    console.error("Error in createBroucher:", error);
    res.status(500).json({ message: "Error creating brochure", error });
  }
};

// Get all brochures
const getAllBrouchers = async (req, res) => {
  try {
    const brouchers = await Broucher.find();
    res.status(200).json({
      message: "Brochures fetched successfully",
      brouchers,
      totalBrouchers: brouchers.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching brochures", error });
  }
};

// Get brochure by ID
const getBroucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const broucher = await Broucher.findById(id);

    if (!broucher) {
      return res.status(404).json({ message: "Brochure not found" });
    }

    res.status(200).json(broucher);
  } catch (error) {
    res.status(500).json({ message: "Error fetching brochure", error });
  }
};

// Update brochure by ID
const updateBroucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number, course_title } = req.body;

    const course = await Course.findOne({ course_title });
    if (!course) {
      return res.status(404).json({ message: "Course not found!" });
    }

    const updatedBroucher = await Broucher.findByIdAndUpdate(
      id,
      {
        full_name,
        email,
        phone_number,
        brochures: course.brochures[0],
      },
      { new: true, runValidators: true }
    );

    if (!updatedBroucher) {
      return res.status(404).json({ message: "Brochure not found" });
    }

    res.status(200).json(updatedBroucher);
  } catch (error) {
    res.status(500).json({ message: "Error updating brochure", error });
  }
};

// Delete brochure by ID
const deleteBroucher = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBroucher = await Broucher.findByIdAndDelete(id);
    if (!deletedBroucher) {
      return res.status(404).json({ message: "Brochure not found" });
    }

    res.status(200).json({ message: "Brochure deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting brochure", error });
  }
};

// Download brochure for a specific course
const downloadBrochure = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate courseId format
    if (!courseId || !courseId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: "Please select a valid course" 
      });
    }

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Course not found. Please select a valid course" 
      });
    }

    // Check if course has brochures
    if (!course.brochures || course.brochures.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No brochures available for the course "${course.course_title}". Please contact support.`
      });
    }

    // Validate required fields
    const { full_name, email, phone_number } = req.body;
    if (!full_name || !email || !phone_number) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information (name, email, and phone number)"
      });
    }

    // Get the first brochure URL (assuming it's the main brochure)
    const brochureUrl = course.brochures[0];

    // Create a record of the brochure download
    const broucherRecord = new Broucher({
      full_name,
      email,
      phone_number,
      course: courseId,
      course_title: course.course_title,
      selected_brochure: brochureUrl
    });

    await broucherRecord.save();

    // Send email with brochure
    const attachements = [{
      filename: `${course.course_title}-brochure.pdf`,
      path: brochureUrl
    }];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Brochure for ${course.course_title}`,
      text: `Hello ${full_name},\n\nThank you for your interest in our course "${course.course_title}". Please find the brochure attached.\n\nCourse Details:\nTitle: ${course.course_title}\nCategory: ${course.course_category}\nDuration: ${course.course_duration}\nFee: $${course.course_fee}\n\nBest regards,\nYour Team`,
      attachments: attachements
    };

    // Send the email with the brochure
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        // Still return success even if email fails, since we have the download URL
        console.log("Email sending failed but continuing with download");
      } else {
        console.log("Email sent:", info.response);
      }
    });

    // Return success response with download URL
    res.status(200).json({
      success: true,
      message: "Brochure download initiated successfully",
      data: {
        brochureUrl,
        course_title: course.course_title,
        recordId: broucherRecord._id
      }
    });

  } catch (error) {
    console.error("Error downloading brochure:", error);
    res.status(500).json({ 
      success: false,
      message: "Error processing your request. Please try again.",
      error: error.message 
    });
  }
};

module.exports = {
  createBrouchers,
  getAllBrouchers,
  getBroucherById,
  updateBroucher,
  deleteBroucher,
  downloadBrochure
};
