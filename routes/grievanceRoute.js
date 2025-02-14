const express = require("express");
const {
  getAllGrievances,
  createGrievance,
  updateGrievance,
  deleteGrievance,
  getGrievancesByStatus,
} = require("../controllers/grievance-controller");

const router = express.Router();

router.get("/", getAllGrievances);
router.post("/", createGrievance);
router.put("/:id", updateGrievance);
router.delete("/:id", deleteGrievance);
router.get("/status/:status", getGrievancesByStatus);

module.exports = router;
