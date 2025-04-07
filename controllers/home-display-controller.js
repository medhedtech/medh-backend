const HomeDisplay = require('../models/home-display');

/**
 * @desc    Get all home display items
 * @route   GET /api/v1/home-display
 * @access  Public
 */
const getAllHomeDisplays = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    
    // Only return active items if queried
    if (active === 'true') {
      filter.is_active = true;
    }
    
    const homeDisplays = await HomeDisplay.find(filter)
      .sort({ display_order: 1 }) // Sort by display order
      .lean();
    
    res.status(200).json({
      success: true,
      count: homeDisplays.length,
      data: homeDisplays
    });
  } catch (error) {
    console.error('Error in getAllHomeDisplays:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting home display items',
      error: error.message
    });
  }
};

/**
 * @desc    Get home display items with specific fields
 * @route   GET /api/v1/home-display/fields
 * @access  Public
 */
const getHomeDisplayWithFields = async (req, res) => {
  try {
    const { fields, filters = {}, sort = 'display_order', page = 1, limit = 10 } = req.query;
    
    // Parse fields from query parameter
    let requestedFields = {};
    
    if (fields) {
      // Handle comma-separated list of fields
      const fieldList = fields.split(',').map(field => field.trim());
      
      // Map of valid fields and their MongoDB paths
      const validFields = {
        // Basic info fields
        id: 'id',
        title: 'title',
        description: 'description',
        url: 'url',
        duration_range: 'duration_range',
        effort_hours: 'effort_hours',
        no_of_Sessions: 'no_of_Sessions',
        learning_points: 'learning_points',
        prerequisites: 'prerequisites',
        highlights: 'highlights',
        
        // Instructor fields
        instructor: 'instructor',
        instructor_name: 'instructor.name',
        instructor_title: 'instructor.title',
        instructor_image: 'instructor.image',
        
        // Price fields
        prices: 'prices',
        price_suffix: 'price_suffix',
        
        // Category fields
        category: 'category',
        classType: 'classType',
        
        // Display fields
        display_order: 'display_order',
        is_active: 'is_active',
        
        // Timestamps
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        
        // Predefined field sets for common UI components
        basic: ['id', 'title', 'description', 'url'],
        card: ['id', 'title', 'description', 'url', 'category', 'classType', 'instructor', 'prices', 'price_suffix','duration_range'],
        list: ['id', 'title', 'description', 'url', 'category', 'classType', 'instructor_name', 'instructor_image'],
        detail: ['id', 'title', 'description', 'url', 'duration_range', 'effort_hours', 'no_of_Sessions', 'learning_points', 'prerequisites', 'highlights', 'instructor', 'prices', 'price_suffix', 'category', 'classType'],
        hero: ['id', 'title', 'description', 'url', 'highlights', 'instructor']
      };
      
      // Check if a predefined field set was requested
      if (validFields[fields]) {
        // If it's an array, it's a predefined field set
        if (Array.isArray(validFields[fields])) {
          requestedFields = validFields[fields].reduce((acc, field) => {
            acc[validFields[field]] = 1;
            return acc;
          }, {});
        } else {
          // Single field
          requestedFields[validFields[fields]] = 1;
        }
      } else {
        // Process individual fields
        fieldList.forEach(field => {
          if (validFields[field]) {
            requestedFields[validFields[field]] = 1;
          }
        });
      }
    }
    
    // Always include id field
    requestedFields.id = 1;
    
    // Parse filters
    const queryFilters = {};
    
    // Handle active filter
    if (filters.active) {
      queryFilters.is_active = filters.active === 'true';
    }
    
    // Handle category filter
    if (filters.category) {
      queryFilters.category = filters.category;
    }
    
    // Handle classType filter
    if (filters.classType) {
      queryFilters.classType = filters.classType;
    }
    
    // Handle currency filter
    if (filters.currency) {
      queryFilters['prices.currency'] = filters.currency.toUpperCase();
    }
    
    // Handle sort
    let sortOptions = {};
    if (sort === 'display_order') {
      sortOptions = { display_order: 1 };
    } else if (sort === 'title_asc') {
      sortOptions = { title: 1 };
    } else if (sort === 'title_desc') {
      sortOptions = { title: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else {
      sortOptions = { display_order: 1 }; // Default
    }
    
    // Parse pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query
    const [queryResults, totalCount] = await Promise.all([
      HomeDisplay.find(queryFilters, requestedFields)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      HomeDisplay.countDocuments(queryFilters)
    ]);
    
    // Post-process results if needed
    let processedResults = queryResults;
    
    // If currency filter is applied, filter the prices array to only include that currency
    if (filters.currency) {
      processedResults = queryResults.map(item => {
        if (item.prices) {
          // Clone the item to avoid modifying the original object
          const clonedItem = { ...item };
          // Filter prices to only include the specified currency
          clonedItem.prices = item.prices.filter(
            price => price.currency === filters.currency.toUpperCase()
          );
          return clonedItem;
        }
        return item;
      });
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    
    // Return response
    res.status(200).json({
      success: true,
      data: processedResults,
      pagination: {
        total: totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error in getHomeDisplayWithFields:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting home display items with fields',
      error: error.message
    });
  }
};

/**
 * @desc    Get a single home display item
 * @route   GET /api/v1/home-display/:id
 * @access  Public
 */
const getHomeDisplayById = async (req, res) => {
  try {
    const homeDisplay = await HomeDisplay.findOne({ id: req.params.id }).lean();
    
    if (!homeDisplay) {
      return res.status(404).json({
        success: false,
        message: `No home display item found with id ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: homeDisplay
    });
  } catch (error) {
    console.error('Error in getHomeDisplayById:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting home display item',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new home display item
 * @route   POST /api/v1/home-display
 * @access  Private/Admin
 */
const createHomeDisplay = async (req, res) => {
  try {
    // Check if id already exists
    const existingDisplay = await HomeDisplay.findOne({ id: req.body.id });
    if (existingDisplay) {
      return res.status(400).json({
        success: false,
        message: `Home display item with id ${req.body.id} already exists`
      });
    }
    
    // Create new home display item
    const homeDisplay = await HomeDisplay.create(req.body);
    
    res.status(201).json({
      success: true,
      data: homeDisplay
    });
  } catch (error) {
    console.error('Error in createHomeDisplay:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating home display item',
      error: error.message
    });
  }
};

/**
 * @desc    Update a home display item
 * @route   PUT /api/v1/home-display/:id
 * @access  Private/Admin
 */
const updateHomeDisplay = async (req, res) => {
  try {
    const homeDisplay = await HomeDisplay.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!homeDisplay) {
      return res.status(404).json({
        success: false,
        message: `No home display item found with id ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: homeDisplay
    });
  } catch (error) {
    console.error('Error in updateHomeDisplay:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating home display item',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a home display item
 * @route   DELETE /api/v1/home-display/:id
 * @access  Private/Admin
 */
const deleteHomeDisplay = async (req, res) => {
  try {
    const homeDisplay = await HomeDisplay.findOneAndDelete({ id: req.params.id });
    
    if (!homeDisplay) {
      return res.status(404).json({
        success: false,
        message: `No home display item found with id ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error in deleteHomeDisplay:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting home display item',
      error: error.message
    });
  }
};

/**
 * @desc    Update display order of multiple items
 * @route   PUT /api/v1/home-display/order
 * @access  Private/Admin
 */
const updateDisplayOrder = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of items with id and display_order'
      });
    }
    
    // Update each item's display order
    const updatePromises = items.map(item => {
      return HomeDisplay.findOneAndUpdate(
        { id: item.id },
        { display_order: item.display_order },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    // Get updated items
    const updatedItems = await HomeDisplay.find({})
      .sort({ display_order: 1 })
      .lean();
    
    res.status(200).json({
      success: true,
      message: 'Display order updated successfully',
      data: updatedItems
    });
  } catch (error) {
    console.error('Error in updateDisplayOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating display order',
      error: error.message
    });
  }
};

/**
 * @desc    Seed initial home display data
 * @route   POST /api/v1/home-display/seed
 * @access  Private/Admin
 */
const seedHomeDisplayData = async (req, res) => {
  try {
    // Use data from request body if provided, otherwise use default data
    const seedData = req.body && req.body.items && req.body.items.length > 0 
      ? req.body.items 
      : [
        {
          id: "ai_data_science",
          title: "AI & Data Science",
          description: "Master the fundamentals of artificial intelligence and data science with hands-on projects and industry mentorship.",
          url: "/ai-and-data-science-course",
          duration_range: "4-18 months",
          effort_hours: "4-6",
          no_of_Sessions: "24-120",
          learning_points: [
            "Python for Data Science",
            "Machine Learning Algorithms",
            "Deep Learning & Neural Networks",
            "Data Visualization & Analysis"
          ],
          prerequisites: ["Basic programming knowledge", "Interest in data and analytics"],
          highlights: ["Live interactive sessions", "Real-world projects", "Industry mentors", "Guaranteed internship opportunity"],
          instructor: {
            name: "Dr. Rajesh Kumar",
            title: "AI Specialist",
            image: "/instructors/rajesh-kumar.jpg"
          },
          prices: [
            {
              currency: "INR",
              individual: 32000,
              batch: 22400,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            },
            {
              currency: "USD",
              individual: 510,
              batch: 310,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            }
          ],
          price_suffix: "Onwards",
          category: "AI and Data Science",
          classType: "Live Courses",
          display_order: 1
        },
        {
          id: "digital_marketing",
          title: "Digital Marketing with Data Analytics",
          description: "Learn how to leverage digital platforms and data analytics to create successful marketing campaigns.",
          url: "/digital-marketing-with-data-analytics-course",
          duration_range: "4-18 months",
          effort_hours: "4-6",
          no_of_Sessions: "24-120",
          learning_points: [
            "Social Media Marketing",
            "SEO & SEM",
            "Content Marketing",
            "Marketing Analytics"
          ],
          prerequisites: ["No prior experience required", "Interest in marketing"],
          highlights: ["Live interactive sessions", "Platform-specific strategies", "Campaign creation", "Guaranteed internship opportunity"],
          instructor: {
            name: "Priya Sharma",
            title: "Digital Marketing Expert",
            image: "/instructors/priya-sharma.jpg"
          },
          prices: [
            {
              currency: "INR",
              individual: 32000,
              batch: 22400,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            },
            {
              currency: "USD",
              individual: 510,
              batch: 310,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            }
          ],
          price_suffix: "Onwards",
          category: "Digital Marketing with Data Analytics",
          classType: "Live Courses",
          display_order: 2
        },
        {
          id: "personality_development",
          title: "Personality Development",
          description: "Develop essential soft skills, communication abilities, and confidence for personal and professional growth.",
          url: "/personality-development-course",
          duration_range: "3-9 months",
          effort_hours: "4-6",
          no_of_Sessions: "24-72",
          learning_points: [
            "Effective Communication",
            "Emotional Intelligence",
            "Public Speaking",
            "Confidence Building"
          ],
          prerequisites: ["Open to all skill levels", "Willingness to participate"],
          highlights: ["Interactive workshops", "Role-playing exercises", "Personalized feedback", "Certificate of completion"],
          instructor: {
            name: "Amit Verma",
            title: "Soft Skills Trainer",
            image: "/instructors/amit-verma.jpg"
          },
          prices: [
            {
              currency: "INR",
              individual: 28800,
              batch: 19200,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            },
            {
              currency: "USD",
              individual: 480,
              batch: 290,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            }
          ],
          price_suffix: "Onwards",
          category: "Personality Development",
          classType: "Live Courses",
          display_order: 3
        },
        {
          id: "vedic_mathematics",
          title: "Vedic Mathematics",
          description: "Learn ancient Indian mathematical techniques for faster calculations and enhanced problem-solving abilities.",
          url: "/vedic-mathematics-course",
          duration_range: "3-9 months",
          effort_hours: "4-6",
          no_of_Sessions: "24-72",
          learning_points: [
            "Speed Mathematics",
            "Vedic Sutras",
            "Mental Calculation",
            "Mathematical Shortcuts"
          ],
          prerequisites: ["Basic arithmetic knowledge", "Interest in mathematics"],
          highlights: ["Live interactive sessions", "Practice exercises", "Speed calculation techniques", "Certificate of completion"],
          instructor: {
            name: "Dr. Sunita Rao",
            title: "Mathematics Educator",
            image: "/instructors/sunita-rao.jpg"
          },
          prices: [
            {
              currency: "INR",
              individual: 24000,
              batch: 13200,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            },
            {
              currency: "USD",
              individual: 380,
              batch: 230,
              min_batch_size: 2,
              max_batch_size: 10,
              early_bird_discount: 0,
              group_discount: 0,
              is_active: true
            }
          ],
          price_suffix: "Onwards",
          category: "Vedic Mathematics",
          classType: "Live Courses",
          display_order: 4
        }
      ];
    
    // Clear existing data
    await HomeDisplay.deleteMany({});
    
    // Insert seed data
    await HomeDisplay.insertMany(seedData);
    
    res.status(200).json({
      success: true,
      message: 'Home display data seeded successfully',
      count: seedData.length,
      data: seedData
    });
  } catch (error) {
    console.error('Error in seedHomeDisplayData:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding home display data',
      error: error.message
    });
  }
};

console.log('Home Display Controller functions:');
console.log('getAllHomeDisplays:', typeof getAllHomeDisplays);
console.log('getHomeDisplayById:', typeof getHomeDisplayById);
console.log('createHomeDisplay:', typeof createHomeDisplay);
console.log('updateHomeDisplay:', typeof updateHomeDisplay);
console.log('deleteHomeDisplay:', typeof deleteHomeDisplay);
console.log('updateDisplayOrder:', typeof updateDisplayOrder);
console.log('seedHomeDisplayData:', typeof seedHomeDisplayData);
console.log('getHomeDisplayWithFields:', typeof getHomeDisplayWithFields);

module.exports = {
  getAllHomeDisplays,
  getHomeDisplayById,
  createHomeDisplay,
  updateHomeDisplay,
  deleteHomeDisplay,
  updateDisplayOrder,
  seedHomeDisplayData,
  getHomeDisplayWithFields
}; 