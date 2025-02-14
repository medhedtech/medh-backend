const express = require("express");
const {
  createCorporate,
  getAllCorporates,
  getCorporateById,
  updateCorporate,
  deleteCorporate,
} = require("../controllers/corporate-training-controller");

const router = express.Router();

router.post("/create", createCorporate);
router.get("/getAll", getAllCorporates);
router.get("/get/:id", getCorporateById);
router.put("/update/:id", updateCorporate);
router.delete("/delete/:id", deleteCorporate);

module.exports = router;
