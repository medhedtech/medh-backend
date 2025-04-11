// Configuration file for Zoom API tests
export default {
  // Disable automatic global test environment setup
  setupFilesAfterEnv: ["./zoom.test.setup.js"],
  // Increase timeout for async tests
  testTimeout: 30000,
  // Add test environment options
  testEnvironment: "node",
  // Transform ES modules
  transform: {},
  // Use experimental vm modules
  extensionsToTreatAsEsm: [".js"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Silent by default, verbose for debugging
  silent: process.env.DEBUG !== "true",
};
