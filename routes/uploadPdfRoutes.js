import express from "express";
import { uploadImage } from "../controllers/upload/uploadImages.js";
import { uploadDocument } from "../controllers/upload/uploadDocuments.js";
import { uploadMedia } from "../controllers/upload/uploadVideos.js";

const router = express.Router();

router.post("/image", uploadImage);
router.post("/document", uploadDocument);
router.post("/media", uploadMedia);

export default router;
