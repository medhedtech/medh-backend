const express = require('express');
const mongoose = require('mongoose');
const corsMiddleware = require('./config/cors');
const trackingMiddleware = require('./middleware/trackingMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medh', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware); // Use the centralized CORS middleware

// Add tracking middleware
app.use(trackingMiddleware.requestTracker);
app.use(trackingMiddleware.sessionTracker);
app.use(trackingMiddleware.uiActivityTracker);

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/blogs', require('./routes/blogs'));
app.use('/api/v1/upload', require('./routes/upload'));

// Error handling
app.use(errorHandler);

// Add error tracking middleware
app.use(trackingMiddleware.errorTracker);

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app; 