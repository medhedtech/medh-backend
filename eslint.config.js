// eslint.config.js - Simplified configuration for immediate use
export default [
  // Global ignores
  {
    ignores: ["node_modules/", "dist/", "coverage/", "logs/", "backups/"],
  },

  // Base configuration for JS files
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node.js globals
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        
        // Timer functions
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        
        // Web API globals available in Node.js
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        
        // Crypto
        crypto: "readonly",
        
        // Common validation functions (express-validator)
        validationResult: "readonly",
        
        // Common model imports
        User: "readonly",
      },
    },
    rules: {
      // Basic error prevention
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off", // Allow console in backend code
      "no-debugger": "warn",
      
      // Code style - basic rules
      "no-multiple-empty-lines": ["warn", { max: 2 }],
      "semi": ["warn", "always"],
      "quotes": ["warn", "single", { avoidEscape: true }],
      
      // Disable problematic rules for now
      "no-control-regex": "off",
    },
  },

  // Configuration for test files
  {
    files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];
