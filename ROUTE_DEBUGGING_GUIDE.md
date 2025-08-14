# Route Debugging Guide

## 404 Error Troubleshooting

If you're getting a 404 error from your frontend, follow these steps to identify and resolve the issue:

### 1. Check Available Routes

Visit these endpoints to see all available routes:

- **All Routes**: `GET /api/v1/debug/routes`
- **Check Specific Route**: `GET /api/v1/debug/check-route?method=GET&path=/auth/login`
- **Request Info**: `GET /api/v1/debug/request-info`

### 2. Common Route Patterns

Based on your backend structure, here are the main route categories:

#### Authentication & Security

- `/api/v1/auth/*` - Authentication routes
- `/api/v1/security/*` - Security features
- `/api/v1/auth/mfa/*` - Multi-factor authentication
- `/api/v1/2fa/*` - Two-factor authentication
- `/api/v1/passkeys/*` - Passkey authentication

#### User Management

- `/api/v1/profile/*` - User profile management
- `/api/v1/students/*` - Student-specific routes
- `/api/v1/instructors/*` - Instructor-specific routes
- `/api/v1/parent/*` - Parent-specific routes
- `/api/v1/coordinator/*` - Program coordinator routes

#### Course Management

- `/api/v1/courses/*` - Course management
- `/api/v1/tcourse/*` - Course types
- `/api/v1/batches/*` - Batch management
- `/api/v1/enrollments/*` - Enrollment management
- `/api/v1/materials/*` - Course materials

#### Content & Resources

- `/api/v1/blogs/*` - Blog management
- `/api/v1/resources/*` - Resources
- `/api/v1/announcements/*` - Announcements
- `/api/v1/forms/*` - Universal forms
- `/api/v1/certificates/*` - Certificate management

#### Payments & Subscriptions

- `/api/v1/payments/*` - Payment processing
- `/api/v1/enhanced-payments/*` - Enhanced payment features
- `/api/v1/subscription/*` - Subscription management
- `/api/v1/membership/*` - Membership management

#### Administrative

- `/api/v1/admin/*` - Admin dashboard and management
- `/api/v1/team/*` - Sales and support team routes
- `/api/v1/oauth/analytics/*` - OAuth analytics

### 3. Debugging Steps

#### Step 1: Identify the Missing Route

1. Check your frontend code to see what URL is being requested
2. Note the HTTP method (GET, POST, PUT, DELETE)
3. Use the debug endpoints to verify if the route exists

#### Step 2: Check Route Registration

If the route doesn't exist, check if it's properly registered in:

- `routes/index.js` - Main route registration
- Individual route files in the `routes/` directory
- `app.js` - Direct route registrations

#### Step 3: Verify Route Path

Common issues:

- **Missing leading slash**: `/auth/login` vs `auth/login`
- **Wrong HTTP method**: Using POST instead of GET
- **Case sensitivity**: `/Auth/login` vs `/auth/login`
- **Extra slashes**: `/auth//login` vs `/auth/login`

#### Step 4: Check Middleware

Ensure the route isn't being blocked by:

- Authentication middleware
- CORS middleware
- Rate limiting
- Request validation

### 4. Common 404 Scenarios

#### Scenario 1: New Feature Route Missing

**Problem**: Frontend tries to access a new API endpoint that hasn't been implemented yet.

**Solution**:

1. Create the route file in `routes/` directory
2. Add the route to `routes/index.js`
3. Implement the controller logic

#### Scenario 2: Route Path Mismatch

**Problem**: Frontend and backend use different path structures.

**Solution**:

1. Check the exact path in frontend code
2. Verify the route is registered with the same path
3. Update either frontend or backend to match

#### Scenario 3: HTTP Method Mismatch

**Problem**: Frontend uses POST but route only accepts GET.

**Solution**:

1. Check the HTTP method in frontend request
2. Verify the route supports that method
3. Add the missing method to the route

### 5. Testing Tools

#### Browser/Postman Testing

```bash
# Test if server is running
curl http://localhost:3000/health

# Test API base
curl http://localhost:3000/api/v1/health

# Test specific route
curl http://localhost:3000/api/v1/debug/routes

# Test route existence
curl "http://localhost:3000/api/v1/debug/check-route?method=GET&path=/auth/login"
```

#### Frontend Debugging

Add this to your frontend error handling:

```javascript
// Log the exact URL being requested
console.log("Requesting URL:", url);
console.log("Request method:", method);
console.log("Request headers:", headers);

// In axios error handler
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Axios Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);
```

### 6. Route Registration Checklist

When adding a new route, ensure:

1. ✅ Route file exists in `routes/` directory
2. ✅ Route is imported in `routes/index.js`
3. ✅ Route is added to `moduleRoutes` array
4. ✅ Controller functions exist and are exported
5. ✅ Route path matches frontend expectations
6. ✅ HTTP methods are properly defined
7. ✅ Middleware is applied correctly
8. ✅ Error handling is implemented

### 7. Quick Fix Commands

```bash
# Restart the server after route changes
npm run dev

# Check server logs for route registration
tail -f logs/app.log

# Test a specific route
curl -X GET http://localhost:3000/api/v1/health

# Check all registered routes
curl http://localhost:3000/api/v1/debug/routes | jq '.data.routes'
```

### 8. Emergency Debugging

If you need immediate help:

1. **Check server logs** for any startup errors
2. **Verify database connection** - routes might fail if DB is down
3. **Test basic endpoints** like `/health` and `/api/v1/health`
4. **Use the debug endpoints** to list all available routes
5. **Check environment variables** - missing config can cause route failures

### 9. Prevention Tips

1. **Use TypeScript** for better type safety
2. **Implement route testing** with Jest/Supertest
3. **Use OpenAPI/Swagger** for API documentation
4. **Add route validation** with Joi or similar
5. **Implement proper error handling** for all routes
6. **Use consistent naming conventions** for routes

---

**Need Help?** Use the debug endpoints to identify the exact issue, then check the corresponding route file and controller for implementation details.





