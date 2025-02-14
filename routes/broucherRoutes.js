const express = require("express");
const router = express.Router();
const broucherController = require("../controllers/brouchers-controller");

router.post("/create", broucherController.createBrouchers);
router.get("/get", broucherController.getAllBrouchers);
router.get("/get/:id", broucherController.getBroucherById);
router.post("/update/:id", broucherController.updateBroucher);
router.delete("/delete/:id", broucherController.deleteBroucher);

module.exports = router;
