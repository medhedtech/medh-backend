import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "fs";
import path from "path";

// Function to create a directory if it doesn't exist
function ensureDirectoryExists(directory) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

// Function to create a hook script
function createHookScript(hookName, command) {
  const hookDir = ".husky";
  ensureDirectoryExists(hookDir);

  const hookPath = path.join(hookDir, hookName);
  const content = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${command}
`;

  writeFileSync(hookPath, content);
  chmodSync(hookPath, 0o755); // Make hook executable
}

// Function to create the husky helper script
function createHuskyHelper() {
  const helperDir = ".husky/_";
  ensureDirectoryExists(helperDir);

  const huskyShPath = path.join(helperDir, "husky.sh");
  const content = `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  export readonly husky_skip_init=1
  sh -e "$0" "$@"
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  exit $exitCode
fi
`;

  writeFileSync(huskyShPath, content);
  chmodSync(huskyShPath, 0o755); // Make helper executable
}

// Setup husky
console.log("Setting up husky...");
createHuskyHelper();

// Create hooks
createHookScript("pre-commit", "npm run lint");

console.log("Husky setup complete");
