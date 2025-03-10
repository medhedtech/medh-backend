const trackingMiddleware = require('./middleware/trackingMiddleware');

// Add tracking middleware before routes
app.use(trackingMiddleware.requestTracker);
app.use(trackingMiddleware.sessionTracker);
app.use(trackingMiddleware.uiActivityTracker);

// Add error tracking middleware after routes and other error handlers
app.use(trackingMiddleware.errorTracker); 
//