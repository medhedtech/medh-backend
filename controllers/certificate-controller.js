const Certificate = require("../models/cetificates-model");
const EnrolledCourse = require("../models/enrolled-courses-model");
const Course = require("../models/course-model");
const { generatePdfContentForCertificate } = require("../utils/htmlTemplate");
const { uploadFile } = require("../utils/uploadFile");
const html_to_pdf = require("html-pdf-node");

exports.getAllCertificates = async (req, res) => {
  try {
    const certificates = await EnrolledCourse.find({
      is_completed: true,
      $or: [
        {
          is_certifiled: false,
        },
        {
          is_certifiled: {
            $exists: false,
          },
        },
      ],
    })
      .populate("student_id", "full_name")
      .populate("course_id", "course_title assigned_instructor course_image")
      .exec();

    res.status(200).json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCertificate = async (req, res) => {
  const { student_id, course_id, completion_date, student_name, course_name } =
    req.body;

  try {
    // Ensure student has completed the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: student_id,
      course_id: course_id,
      is_completed: true,
      is_certifiled: false,
    });

    if (!enrollment) {
      return res
        .status(400)
        .json({ message: "Student has not completed this course" });
    }

    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    const htmlContent = generatePdfContentForCertificate({
      student_name: student_name,
      course_name: course_name,
    });

    const file = { content: htmlContent };
    const options = { format: "A4", timeout: 60000 };

    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    const pdfKey = `${
      student_name
    }/${Date.now().toString()}.pdf`;
    const uploadParams = {
      key: pdfKey,
      file: pdfBuffer,
      contentType: "application/pdf",
    };

    uploadFile(
      uploadParams,
      async (url) => {
        const certificate = new Certificate({
          student_id: student_id,
          student_name: student_name,
          course_id: course_id,
          course_name: course_name,
          completion_date: completion_date,
          certificateUrl:url
        });
    
        await certificate.save();
        await EnrolledCourse.updateOne(
          { _id: enrollment._id },
          { $set: { is_certifiled: true } }
        );
    
        res.status(201).json({
          message: "Certificate created and enrollment updated successfully",
          certificate,
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
    res.status(500).json({ message: error.message });
  }
};

exports.getCertificatesByStudentId = async (req, res) => {
  const { student_id } = req.params;

  try {
    // Find certificates associated with the given student ID
    const certificates = await Certificate.find({ student_id })
      .populate("student_id", "full_name")
      .populate("course_id", "course_title assigned_instructor course_image certificateUrl")
      .exec();

    if (!certificates || certificates.length === 0) {
      return res
        .status(404)
        .json({ message: "No certificates found for the given student ID" });
    }

    res.status(200).json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
