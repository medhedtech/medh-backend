import express from "express";

const router = express.Router();
import * as contactController from "../controllers/contactController.js";

router.post("/create", contactController.createContact);
router.get("/get", contactController.getAllContact);
router.get("/get/:id", contactController.getContactById);
router.post("/update/:id", contactController.updateContact);
router.delete("/delete/:id", contactController.deleteContact);

export default router;
