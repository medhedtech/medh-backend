const newman = require('newman');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const config = {
  collection: path.join(__dirname, 'postman/MEDH-API.postman_collection.json'),
  environment: path.join(__dirname, 'postman/MEDH-API.postman_environment.json'),
  reporters: ['cli', 'htmlextra'],
  reporter: {
    htmlextra: {
      export: path.join(__dirname, '../reports/api-test-report.html'),
      darkTheme: true,
      title: 'MEDH API Test Report',
      logs: true,
      browserTitle: "MEDH API Tests"
    }
  }
};

// Start the server
console.log('Starting server...');
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Wait for server to start
setTimeout(() => {
  console.log('Running API tests...');
  
  // Run Newman tests
  newman.run(config, function (err, summary) {
    if (err) {
      console.error('Error running tests:', err);
      process.exit(1);
    }
    
    console.log('Tests completed!');
    
    // Check if any test failed
    const failedTests = summary.run.failures.length;
    console.log(`Failed tests: ${failedTests}`);
    
    // Kill the server
    server.kill();
    
    // Exit with appropriate code
    process.exit(failedTests ? 1 : 0);
  });
}, 5000); // Wait 5 seconds for server to start

// Handle server process cleanup
process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill()); 