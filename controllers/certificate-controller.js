const Certificate = require("../models/cetificates-model");
const EnrolledCourse = require("../models/enrolled-courses-model");
const Course = require("../models/course-model");
const { generatePdfContentForCertificate } = require("../utils/htmlTemplate");
const { uploadFile } = require("../utils/uploadFile");
const PDF = require('html-pdf-chrome');
const logger = require('../utils/logger');
const chromeService = require('../utils/chromeService');

const pdfOptions = {
  port: 9222, // Chrome debug port
  printOptions: {
    landscape: true,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1cm',
      bottom: '1cm',
      left: '1cm',
      right: '1cm'
    }
  }
};

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
    logger.error('Error fetching certificates', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
};

exports.createCertificate = async (req, res) => {
  const { student_id, course_id, completion_date, student_name, course_name } = req.body;

  try {
    // Ensure student has completed the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: student_id,
      course_id: course_id,
      is_completed: true,
      is_certifiled: false,
    });

    if (!enrollment) {
      return res.status(400).json({ message: "Student has not completed this course" });
    }

    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Generate certificate HTML
    const htmlContent = generatePdfContentForCertificate({
      student_name: student_name,
      course_name: course_name,
    });

    try {
      // Ensure Chrome is running
      await chromeService.ensureRunning();

      // Generate PDF using html-pdf-chrome
      const pdf = await PDF.create(htmlContent, pdfOptions);
      const pdfBuffer = await pdf.toBuffer();

      const pdfKey = `certificates/${student_name}/${Date.now().toString()}.pdf`;
      const uploadParams = {
        key: pdfKey,
        file: pdfBuffer,
        contentType: "application/pdf",
      };

      // Upload to S3
      uploadFile(
        uploadParams,
        async (url) => {
          try {
            const certificate = new Certificate({
              student_id: student_id,
              student_name: student_name,
              course_id: course_id,
              course_name: course_name,
              completion_date: completion_date,
              certificateUrl: url
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
          } catch (dbError) {
            logger.error('Database error while saving certificate', {
              error: {
                message: dbError.message,
                stack: dbError.stack
              }
            });
            res.status(500).json({ message: "Failed to save certificate details" });
          }
        },
        (uploadError) => {
          logger.error('Error uploading PDF to S3', {
            error: {
              message: uploadError.message,
              stack: uploadError.stack
            }
          });
          res.status(500).json({ message: "Failed to upload certificate" });
        }
      );
    } catch (pdfError) {
      logger.error('Error generating PDF', {
        error: {
          message: pdfError.message,
          stack: pdfError.stack
        }
      });
      res.status(500).json({ message: "Failed to generate certificate PDF" });
    }
  } catch (error) {
    logger.error('Error in certificate creation process', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ message: "Failed to create certificate" });
  }
};

exports.getCertificatesByStudentId = async (req, res) => {
  const { student_id } = req.params;

  try {
    const certificates = await Certificate.find({ student_id })
      .populate("student_id", "full_name")
      .populate("course_id", "course_title assigned_instructor course_image certificateUrl")
      .exec();

    if (!certificates || certificates.length === 0) {
      return res.status(404).json({ 
        message: "No certificates found for the given student ID" 
      });
    }

    res.status(200).json(certificates);
  } catch (error) {
    logger.error('Error fetching student certificates', {
      error: {
        message: error.message,
        stack: error.stack
      },
      studentId: student_id
    });
    res.status(500).json({ message: "Failed to fetch student certificates" });
  }
};
