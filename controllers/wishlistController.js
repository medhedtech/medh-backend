import Wishlist from '../models/wishlist.model.js';
import Course from '../models/course-model.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
// import { redisClient } from '../utils/cache.js';

const WISHLIST_CACHE_KEY = 'user:wishlist:';
const WISHLIST_CACHE_TTL = 3600; // 1 hour

export const addToWishlist = catchAsync(async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user._id;

  // Validate course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Find or create wishlist
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, courses: [] });
  }

  // Check if course already in wishlist
  if (wishlist.hasCourse(courseId)) {
    throw new AppError('Course already in wishlist', 400);
  }

  // Add course to wishlist
  wishlist.courses.push({
    course: courseId,
    addedAt: new Date(),
    notificationPreference: {
      priceDrops: true,
      startDate: true
    }
  });
  wishlist.lastUpdated = new Date();
  await wishlist.save();

  // Clear cache
  // await redisClient.del(`${WISHLIST_CACHE_KEY}${userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Course added to wishlist',
    data: { wishlist }
  });
});

export const removeFromWishlist = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    throw new AppError('Wishlist not found', 404);
  }

  // Remove course from wishlist
  wishlist.courses = wishlist.courses.filter(
    item => item.course.toString() !== courseId
  );
  wishlist.lastUpdated = new Date();
  await wishlist.save();

  // Clear cache
  // await redisClient.del(`${WISHLIST_CACHE_KEY}${userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Course removed from wishlist',
    data: { wishlist }
  });
});

export const getWishlist = catchAsync(async (req, res) => {
  const userId = req.user._id;

  // Try to get from cache
  // const cachedWishlist = await redisClient.get(`${WISHLIST_CACHE_KEY}${userId}`);
  // if (cachedWishlist) {
  //   return res.status(200).json({
  //     status: 'success',
  //     data: { wishlist: JSON.parse(cachedWishlist) }
  //   });
  // }

  // Get from database with populated courses
  const wishlist = await Wishlist.getDetailedWishlist(userId);
  if (!wishlist) {
    return res.status(200).json({
      status: 'success',
      data: { wishlist: { user: userId, courses: [] } }
    });
  }

  // Cache the result
  // await redisClient.setex(
  //   `${WISHLIST_CACHE_KEY}${userId}`,
  //   WISHLIST_CACHE_TTL,
  //   JSON.stringify(wishlist)
  // );

  res.status(200).json({
    status: 'success',
    data: { wishlist }
  });
});

export const updateNotificationPreferences = catchAsync(async (req, res) => {
  const { courseId, preferences } = req.body;
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    throw new AppError('Wishlist not found', 404);
  }

  // Find and update course preferences
  const courseItem = wishlist.courses.find(
    item => item.course.toString() === courseId
  );
  if (!courseItem) {
    throw new AppError('Course not found in wishlist', 404);
  }

  courseItem.notificationPreference = {
    ...courseItem.notificationPreference,
    ...preferences
  };
  wishlist.lastUpdated = new Date();
  await wishlist.save();

  // Clear cache
  // await redisClient.del(`${WISHLIST_CACHE_KEY}${userId}`);

  res.status(200).json({
    status: 'success',
    message: 'Notification preferences updated',
    data: { wishlist }
  });
}); 