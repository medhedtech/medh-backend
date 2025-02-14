const express = require('express');
const {
  getAllResources,
  createResource,
  deleteResource,
} = require('../controllers/resourcesController');

const router = express.Router();

router.get('/', getAllResources);
router.post('/', createResource);
router.delete('/:id', deleteResource);

module.exports = router;