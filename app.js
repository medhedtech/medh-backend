const express = require('express');
const trackingMiddleware = require('./middleware/trackingMiddleware');

// Initialize express app
const app = express();

// Add tracking middleware before routes
app.use(trackingMiddleware.requestTracker);
app.use(trackingMiddleware.sessionTracker);
app.use(trackingMiddleware.uiActivityTracker);

// Add error tracking middleware after routes and other error handlers
app.use(trackingMiddleware.errorTracker);

module.exports = app; 