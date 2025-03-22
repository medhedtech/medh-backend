# Deployment Instructions

## CORS Configuration

To fix the CORS issues between `www.medh.co` and `api.medh.co`, ensure you have the following environment variable set in your production environment:

```
ALLOWED_ORIGINS=https://www.medh.co,https://medh.co
```

This will allow requests from these origins to access your API.

## Environment Variables

Ensure all required environment variables are set in your production environment:

- `PORT`: The port your server will run on (default: 8080)
- `NODE_ENV`: Set to 'production' in production environments
- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET_KEY`: Secret key for JWT token signing
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

## Deployment Steps

1. Ensure Node.js and npm are installed on your server
2. Clone the repository or upload the code to your server
3. Install dependencies:
   ```bash
   npm install --production
   ```
4. Set up environment variables (either directly or via a `.env` file)
5. Start the server using a process manager like PM2:
   ```bash
   pm2 start index.js --name "medh-backend" --env production
   ```
   
   Note the `--env production` flag to ensure NODE_ENV is set properly.

## Troubleshooting CORS Issues

If you're seeing CORS errors like:
```
Access to XMLHttpRequest at 'https://api.medh.co/api/v1/blogs/get...' from origin 'https://www.medh.co' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Follow these steps:

1. **Restart the server after changes**:
   ```bash
   pm2 restart medh-backend --env production
   ```

2. **Verify the NODE_ENV is set correctly**:
   ```bash
   pm2 env medh-backend  # Check if NODE_ENV=production is set
   ```
   
   If not set correctly:
   ```bash
   NODE_ENV=production pm2 restart medh-backend
   ```

3. **Test the CORS endpoint**:
   ```bash
   curl -v -X OPTIONS \
     -H "Origin: https://www.medh.co" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     https://api.medh.co/api/v1/cors-test
   ```

   The response should include:
   ```
   Access-Control-Allow-Origin: https://www.medh.co
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
   ```

4. **Check server logs for CORS debugging info**:
   ```bash
   pm2 logs medh-backend
   ```
   
   Look for "CORS Headers Debug" entries with the origin and allowed origins information.

5. **If using a proxy (Nginx, Apache, etc.)**, make sure it's not stripping CORS headers:
   
   For Nginx, add to the proxy configuration:
   ```
   location /api/ {
       proxy_pass http://your_node_app;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       
       # Preserve CORS headers
       proxy_pass_header Access-Control-Allow-Origin;
       proxy_pass_header Access-Control-Allow-Methods;
       proxy_pass_header Access-Control-Allow-Headers;
       proxy_pass_header Access-Control-Allow-Credentials;
       
       # Handle OPTIONS method
       if ($request_method = 'OPTIONS') {
           add_header Access-Control-Allow-Origin 'https://www.medh.co';
           add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
           add_header Access-Control-Allow-Headers 'X-Requested-With, Content-Type, Authorization, Accept';
           add_header Access-Control-Allow-Credentials 'true';
           add_header Access-Control-Max-Age '86400';
           add_header Content-Type 'text/plain';
           add_header Content-Length 0;
           return 204;
       }
   }
   ```

6. **Remove the cache in your browser** - sometimes browsers cache CORS failures:
   - Open Developer Tools (F12)
   - Right-click on the refresh button and select "Empty Cache and Hard Reload"

## Security Considerations

- Keep your `.env` file secure and outside of version control
- Regularly update dependencies to address security vulnerabilities
- Consider implementing rate limiting to prevent abuse
- Set up SSL/TLS certificates for both your frontend and backend domains 

## Local Development Setup

When running the application locally, you'll typically have:
- Frontend running on http://localhost:3000
- Backend running on http://localhost:8080

The CORS configuration automatically allows requests between these localhost origins in development mode. To ensure this works correctly:

1. **Set NODE_ENV correctly**:
   ```bash
   # Add to your .env file for development
   NODE_ENV=development
   ```
   
   Or when starting the server:
   ```bash
   NODE_ENV=development npm start
   ```

2. **Test local CORS configuration**:
   ```bash
   curl -v -X OPTIONS \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     http://localhost:8080/api/v1/cors-test
   ```
   
   The response should include:
   ```
   Access-Control-Allow-Origin: http://localhost:3000
   ```

3. **If using a different local port**, the code will automatically allow it as long as it's a localhost or 127.0.0.1 origin and you're in development mode.

4. **Troubleshooting local CORS issues**:
   - Ensure NODE_ENV is not set to 'production' during local development
   - Restart your server after making changes to CORS configuration
   - Check server logs for 'CORS Headers Debug' entries
   - Try using Chrome with CORS disabled for testing (launch with `--disable-web-security` flag) 