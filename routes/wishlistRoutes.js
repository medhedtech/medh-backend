import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  updateNotificationPreferences
} from '../controllers/wishlistController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Wishlist routes
router.post('/add', addToWishlist);
router.delete('/remove/:courseId', removeFromWishlist);
router.get('/', getWishlist);
router.put('/notifications', updateNotificationPreferences);

export default router; 