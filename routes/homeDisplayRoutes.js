import express from "express";

const router = express.Router();
import * as controller from "../controllers/home-display-controller.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

// Public routes - root
router.get("/", function (req, res) {
  return controller.getAllHomeDisplays(req, res);
});

// Special routes - must be before /:id to avoid conflicts
router.get("/fields", function (req, res) {
  return controller.getHomeDisplayWithFields(req, res);
});

router
  .route("/order")
  .put(authenticateToken, authorize("admin"), function (req, res) {
    return controller.updateDisplayOrder(req, res);
  });

router
  .route("/seed")
  .post(authenticateToken, authorize("admin"), function (req, res) {
    return controller.seedHomeDisplayData(req, res);
  });

// Prices routes
router.get("/prices", function (req, res) {
  return controller.getAllHomeDisplaysWithPrices(req, res);
});

router.post(
  "/prices/bulk-update",
  authenticateToken,
  authorize("admin"),
  function (req, res) {
    return controller.bulkUpdateHomeDisplayPrices(req, res);
  },
);

// Route for getting prices for a specific home display item
router.get("/:id/prices", function (req, res) {
  return controller.getHomeDisplayPrices(req, res);
});

// ID parameter routes - must come after specific routes
router.get("/:id", function (req, res) {
  return controller.getHomeDisplayById(req, res);
});

router.put("/:id", authenticateToken, authorize("admin"), function (req, res) {
  return controller.updateHomeDisplay(req, res);
});

router.delete("/:id", authenticateToken, authorize("admin"), function (req, res) {
  return controller.deleteHomeDisplay(req, res);
});

// Admin root path route
router.post("/", authenticateToken, authorize("admin"), function (req, res) {
  return controller.createHomeDisplay(req, res);
});

export default router;
