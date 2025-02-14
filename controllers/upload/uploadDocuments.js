const { uploadFile } = require("../../utils/uploadFile");

const uploadDocument = async (req, res) => {
  try {
    const { base64String } = req.body;

    if (!base64String) {
      return res.status(400).json({
        success: false,
        message: "No file data provided.",
      });
    }

    // Extract MIME type and base64 data
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    if (!mimeTypeMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid file data format.",
      });
    }

    const mimeType = mimeTypeMatch[1];
    const base64Data = base64String.replace(/^data:.*;base64,/, "");

    // Validate allowed file types
    const allowedTypes = {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
    };

    const fileExtension = allowedTypes[mimeType];
    if (!fileExtension) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported file type. Only .pdf, .doc, and .docx files are allowed.",
      });
    }

    // Create file buffer and generate S3 key
    const file = Buffer.from(base64Data, "base64");
    const key = `documents/${Date.now()}.${fileExtension}`;

    // Upload parameters
    const uploadParams = {
      key: key,
      file: file,
      contentEncoding: "base64",
      contentType: mimeType,
    };

    // Upload file
    uploadFile(
      uploadParams,
      (url) => {
        if (url) {
          res.status(200).send({
            status: "success",
            message: "Document uploaded successfully",
            data: url,
          });
        } else {
          res.status(500).send({
            status: "failed",
            message: "Failed to upload the document.",
          });
        }
      },
      (err) => {
        console.error("Error during file upload:", err);
        res.status(500).send({
          status: "failed",
          message: err?.message || "Error uploading file.",
        });
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = uploadDocument;
