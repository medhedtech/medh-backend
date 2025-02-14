/* eslint-disable no-console */
const { uploadFile } = require("../../utils/uploadFile");

const uploadMedia = async (req, res) => {
  try {
    const { base64String, fileType } = req.body;
    const base64Data = base64String.replace(/^data:([A-Za-z-+/]+);base64,/, "");
    const extMatch = base64String.match(/\/([a-zA-Z]*);/);
    const ext = extMatch ? extMatch[1] : "mp4";
    const file = Buffer.from(base64Data, "base64");
    const key =
      fileType === "video"
        ? `videos/${Date.now()}.${ext}`
        : fileType === "image"
        ? `images-paper/${Date.now()}.${ext}`
        : `audio/${Date.now()}.${ext}`;

    const uploadParams = {
      key: key,
      file: file,
      contentEncoding: "base64",
      contentType:
        fileType === "video"
          ? "video/mp4"
          : fileType === "image"
          ? "image/jpeg"
          : "audio/mpeg",
    };

    uploadFile(
      uploadParams,
      (url) => {
        if (url) {
          res.status(200).send({
            status: "success",
            message: "File uploaded successfully",
            data: url,
          });
        }
      },
      (err) => {
        res.status(200).send({ status: "failed", message: err?.message });
      }
    );
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = uploadMedia;
