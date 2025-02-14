const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

router.post("/create", contactController.createContact);
router.get("/get", contactController.getAllContact);
router.get("/get/:id", contactController.getContactById);
router.post("/update/:id", contactController.updateContact);
router.delete("/delete/:id", contactController.deleteContact);

module.exports = router;
