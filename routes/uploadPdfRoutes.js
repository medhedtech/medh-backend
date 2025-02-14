const router = require("express").Router();
const uploadImage = require("../controllers/upload/uploadImages");
const uploadDocument = require("../controllers/upload/uploadDocuments");
const uploadMedia = require("../controllers/upload/uploadVideos");

router.post("/uploadImage", uploadImage);
router.post("/uploadDocument", uploadDocument);
router.post("/uploadMedia", uploadMedia);

module.exports = router;
