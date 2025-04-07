const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/home-display-controller');

// Public routes - root
router.get('/', function(req, res) {
  return controller.getAllHomeDisplays(req, res);
});

// Special routes - must be before /:id to avoid conflicts
router.get('/fields', function(req, res) {
  return controller.getHomeDisplayWithFields(req, res);
});

router.route('/order').put(authenticate, authorize('admin'), function(req, res) {
  return controller.updateDisplayOrder(req, res);
});

router.route('/seed').post(authenticate, authorize('admin'), function(req, res) {
  return controller.seedHomeDisplayData(req, res);
});

// ID parameter routes - must come after specific routes
router.get('/:id', function(req, res) {
  return controller.getHomeDisplayById(req, res);
});

router.put('/:id', authenticate, authorize('admin'), function(req, res) {
  return controller.updateHomeDisplay(req, res);
});

router.delete('/:id', authenticate, authorize('admin'), function(req, res) {
  return controller.deleteHomeDisplay(req, res);
});

// Admin root path route
router.post('/', authenticate, authorize('admin'), function(req, res) {
  return controller.createHomeDisplay(req, res);
});

module.exports = router; 