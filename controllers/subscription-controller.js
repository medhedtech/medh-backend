const SubscriptionCourse = require("../models/subscription-modal");
const { uploadFile } = require("../utils/uploadFile");
const { generatePdfContentForSubscription } = require("../utils/htmlTemplate");
const html_to_pdf = require("html-pdf-node");
const nodemailer = require("nodemailer");
const CoorporateEnrolledModule = require("../models/coorporate-enrolled-modules.model");

// Create a new subscription
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    // Step 1: Save subscription data to the database
    const { student_id, course_id, amount, status } = req.body;

    // Creating a new subscription instance
    const subscription = new SubscriptionCourse({
      student_id,
      course_id,
      amount,
      status,
    });

    // Step 2: Save the subscription and then populate course and student data
    await subscription.save();

    // Populate student and course details
    const populatedSubscription = await SubscriptionCourse.findById(
      subscription._id
    )
      .populate("student_id", "full_name email phone_number")
      .populate("course_id", "course_title course_category course_fee");

    // Step 3: Generate PDF Content using populated data
    const htmlContent = generatePdfContentForSubscription({
      student_name: populatedSubscription.student_id.full_name,
      student_email: populatedSubscription.student_id.email,
      student_mobile: populatedSubscription.student_id.phone_number,
      course_name: populatedSubscription.course_id.course_title,
      amount: populatedSubscription.amount,
      date: new Date(),
      course_fee: populatedSubscription.course_id.course_fee,
    });

    const file = { content: htmlContent };
    const options = { format: "A4", timeout: 60000 };

    // Step 4: Convert HTML to PDF
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    // Step 5: Upload PDF to AWS S3
    const pdfKey = `${
      populatedSubscription.student_id.email
    }/${Date.now().toString()}.pdf`;
    const uploadParams = {
      key: pdfKey,
      file: pdfBuffer,
      contentType: "application/pdf",
    };

    // Upload PDF and handle callbacks
    uploadFile(
      uploadParams,
      async (url) => {
        // Log the URL received from S3
        console.log("PDF uploaded to S3, URL:", url);

        // Save the URL in the subscription
        populatedSubscription.pdfUrl = url;
        await populatedSubscription.save();

        // Step 6: Send an email with the PDF invoice attachment
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: populatedSubscription.student_id.email,
          subject: `Subscription Invoice for ${populatedSubscription.course_id.course_title}`,
          text: `Hello ${
            populatedSubscription.student_id.full_name
          },\n\nThank you for subscribing to the course "${
            populatedSubscription.course_id.course_title
          }". Please find your subscription invoice attached.\n\nAmount: ₹${
            populatedSubscription.amount
          }\nCourse Fee: ₹${
            populatedSubscription.course_id.course_fee
          }\nSubscription Date: ${new Date().toLocaleDateString()}\n\nBest regards,\nYour Team`,
          attachments: [
            {
              filename: `Invoice_${populatedSubscription.student_id.email}.pdf`,
              path: url,
            },
          ],
        };

        // Send the email with the PDF attachment
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error("Error sending email:", err);
            return res.status(500).json({
              success: false,
              message: "Error sending email",
              error: err.message,
            });
          }

          console.log("Email sent:", info.response);
          res.status(201).json({
            success: true,
            message:
              "Subscription created successfully, PDF uploaded, and email sent.",
            data: populatedSubscription,
            pdfUrl: url,
          });
        });
      },
      (err) => {
        console.error("Error uploading PDF to S3:", err);
        res
          .status(500)
          .json({ success: false, message: "Error uploading PDF to S3" });
      }
    );
  } catch (error) {
    console.error("Error creating subscription:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating subscription" });
  }
};

// Retrieve all subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await SubscriptionCourse.find()
      .populate("student_id", "full_name email phone_number role status age")
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      );

    res.status(200).json({ success: true, data: subscriptions });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve a single subscription by ID
const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await SubscriptionCourse.findById(req.params.id)
      .populate("student_id", "full_name email phone_number role status age")
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      );

    if (!subscription)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    res.status(200).json({ success: true, data: subscription });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const getEnrollmentStatus = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;

    // Validate input
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Check if a subscription exists with the given studentId and courseId
    const subscription = await SubscriptionCourse.findOne({
      student_id: studentId,
      course_id: courseId,
    })
      .populate("student_id", "full_name email phone_number role status age")
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      );

    // If subscription exists, return true and the record
    if (subscription) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Student is already enrolled in the course",
        data: subscription,
      });
    }

    // If subscription doesn't exist, return false
    return res.status(200).json({
      success: true,
      enrolled: false,
      message: "Student is not enrolled in the course",
    });
  } catch (err) {
    console.error("Error fetching enrollment status:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const getCoorporateEnrollmentStatus = async (req, res) => {
  try {
    const { coorporateId, courseId } = req.query;

    // Validate input
    if (!coorporateId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Check if a subscription exists with the given studentId and courseId
    const subscription = await SubscriptionCourse.findOne({
      student_id: coorporateId,
      course_id: courseId,
    })
      .populate("student_id", "full_name email phone_number role status age")
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      );

    // If subscription exists, return true and the record
    if (subscription) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Coorporate is already enrolled in the course",
        data: subscription,
      });
    }

    // If subscription doesn't exist, return false
    return res.status(200).json({
      success: true,
      enrolled: false,
      message: "Student is not enrolled in the course",
    });
  } catch (err) {
    console.error("Error fetching enrollment status:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const getCoorporateEmployeeEnrollmentStatus = async (req, res) => {
  try {
    const { coorporateId, courseId } = req.query;

    // Validate input
    if (!coorporateId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Coorporate ID and Course ID are required",
      });
    }

    // Check for an enrollment record in CoorporateEnrolledModule
    const enrollment = await CoorporateEnrolledModule.findOne({
      coorporate_id: coorporateId,
      course_id: courseId,
    })
      .populate(
        "coorporate_id",
        "company_name email contact_person role status"
      )
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      )
      .populate("enrollment_id", "course_assigned_by status");

    // If the enrollment record exists, return details
    if (enrollment) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Coorporate is already enrolled in the course",
        data: {
          coorporate: enrollment.coorporate_id,
          course: enrollment.course_id,
          enrollmentDetails: enrollment.enrollment_id,
          videoUrl: enrollment.video_url,
          isWatched: enrollment.is_watched,
        },
      });
    }

    // If no record is found, return false
    return res.status(200).json({
      success: true,
      enrolled: false,
      message: "Coorporate is not enrolled in the course",
    });
  } catch (err) {
    console.error("Error fetching enrollment status:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Update a subscription by ID
const updateSubscription = async (req, res) => {
  try {
    const updatedSubscription = await SubscriptionCourse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedSubscription)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    // Populate the updated subscription with student and course details
    const populatedUpdatedSubscription = await SubscriptionCourse.findById(
      updatedSubscription._id
    )
      .populate("student_id", "full_name email phone_number role status age")
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      );

    res.status(200).json({ success: true, data: populatedUpdatedSubscription });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a subscription by ID
const deleteSubscription = async (req, res) => {
  try {
    const deletedSubscription = await SubscriptionCourse.findByIdAndDelete(
      req.params.id
    );

    if (!deletedSubscription)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    res
      .status(200)
      .json({ success: true, message: "Subscription deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve all subscriptions by student ID
const getSubscriptionsByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const subscriptions = await SubscriptionCourse.find({ student_id })
      .populate("student_id", "full_name email phone_number role status age")
      .populate(
        "course_id",
        "course_title course_category course_description course_fee course_image status course_grade"
      )
      .sort({ createdAt: -1 });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subscriptions found for the given student ID",
      });
    }

    res.status(200).json({ success: true, data: subscriptions });
  } catch (err) {
    console.error("Error fetching subscriptions by student ID:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getEnrollmentStatus,
  getCoorporateEnrollmentStatus,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByStudentId,
  getCoorporateEmployeeEnrollmentStatus,
};
