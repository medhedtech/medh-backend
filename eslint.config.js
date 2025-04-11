// eslint.config.js
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginJest from "eslint-plugin-jest";
import eslintPluginN from "eslint-plugin-n";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginSecurity from "eslint-plugin-security";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: ["node_modules/", "dist/", "coverage/", "logs/"],
  },

  // Base configuration for JS files
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      import: eslintPluginImport,
      n: eslintPluginN,
      prettier: eslintPluginPrettier,
      security: eslintPluginSecurity,
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".mjs", ".cjs"],
        },
      },
    },
    rules: {
      // Recommended rules - using the prettier config to handle formatting
      ...eslintConfigPrettier.rules,

      // Error prevention - basic JavaScript errors
      "no-undef": "error",
      "no-console": "off", // Allow console in backend code
      "no-debugger": "warn",

      // Code style
      "prettier/prettier": "warn", // Downgrade to warn to avoid blocking builds
      "no-multiple-empty-lines": ["warn", { max: 1 }],

      // Import rules
      "import/extensions": ["warn", "ignorePackages", { js: "always" }],
      "import/no-extraneous-dependencies": ["warn", { devDependencies: true }],
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],

      // Security rules - turning off non-critical rules generating warnings
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off", // Turning off warning
      "security/detect-unsafe-regex": "off", // Turning off warning
      "security/detect-child-process": "off", // Turning off warning

      // Node rules
      "n/no-missing-import": "off",
    },
  },

  // Configuration for test files
  {
    files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js"],
    plugins: {
      jest: eslintPluginJest,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...eslintPluginJest.configs.recommended.rules,
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "warn",
      "jest/no-identical-title": "warn",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "warn",
      "jest/expect-expect": "off", // Turning off warning
      "no-console": "off",
    },
  },
];
