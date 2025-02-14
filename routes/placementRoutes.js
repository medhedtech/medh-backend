const express = require("express");
const {
  getAllPlacements,
  addPlacement,
} = require("../controllers/placementController");

const router = express.Router();

router.get("/getAll", getAllPlacements);
router.post("/create", addPlacement);

module.exports = router;
