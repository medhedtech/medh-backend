# Nginx Configuration Update for Large File Uploads

If you're using Nginx as a reverse proxy in front of your Node.js application, you need to update the Nginx configuration to allow large request sizes. Add the following settings to your Nginx configuration file:

```nginx
# Inside the http {} block or server {} block
client_max_body_size 10G;  # Set body size limit to 10GB

# Inside the location block that proxies to your Node.js app
location / {
    proxy_pass http://your_nodejs_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Important for large uploads
    proxy_read_timeout 1800s;    # 30 minutes
    proxy_connect_timeout 1800s; # 30 minutes
    proxy_send_timeout 1800s;    # 30 minutes
}
```

## How to Apply This Change

SSH into your server and update the Nginx configuration:

1. Edit the Nginx configuration file:

   ```bash
   sudo nano /etc/nginx/sites-available/your-site-config
   ```

2. Add the above settings to the appropriate sections

3. Test the Nginx configuration:

   ```bash
   sudo nginx -t
   ```

4. If the test passes, reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

## Important Notes for 10GB Uploads

- You may need to increase system-level timeouts and memory limits
- Consider adding a `client_body_timeout` directive to set how long Nginx will wait for the client body to be sent
- Monitor server memory usage closely when handling very large files
- You should also update Node.js limits in your application code to match this 10GB limit
