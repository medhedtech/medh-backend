module.exports = {
  apps: [
    {
      name: 'medh-backend',
      script: 'index.js',
      cwd: '/home/ubuntu/actions-runner/_work/medh-backend/medh-backend',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      
      // Logging configuration
      log_file: '/home/ubuntu/.pm2/logs/medh-backend-combined.log',
      out_file: '/home/ubuntu/.pm2/logs/medh-backend-out.log',
      error_file: '/home/ubuntu/.pm2/logs/medh-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // Restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '10s',
      
      // Source configuration
      source_map_support: true,
      
      // Additional process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Advanced restart strategies
      exp_backoff_restart_delay: 100,
      
      // Process cleanup
      force: false,
      
      // Ignore specific signals
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups', 'coverage'],
      
      // Process title for easier identification
      name: 'medh-api-server',
      
      // Error handling
      combine_logs: true,
      
      // Node.js specific options
      node_args: '--max-old-space-size=1024 --unhandled-rejections=strict',
      
      // Graceful shutdown
      shutdown_with_message: true,
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'api.medh.co',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/medh-backend.git',
      path: '/home/ubuntu/medh-backend',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
}; 