#!/bin/bash

# Make sure server is running
echo "Checking if server is running..."
curl -s http://localhost:8080/api/v1/cors-test > /dev/null
if [ $? -ne 0 ]; then
  echo "Server is not running. Starting server in the background..."
  npm run dev &
  # Wait for server to start
  sleep 5
  echo "Server started"
else
  echo "Server is already running"
fi

# Create results directory if it doesn't exist
mkdir -p ./tests/postman/results

# Run the tests
echo "Running API tests..."
newman run ./tests/postman/MEDH-API-All-Routes.postman_collection.json \
  -e ./tests/postman/MEDH-API.postman_environment.json \
  -r htmlextra,cli \
  --reporter-htmlextra-export ./tests/postman/results/api-test-results.html

echo "Tests completed! HTML report available at ./tests/postman/results/api-test-results.html" 