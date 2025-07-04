#!/bin/bash

# Fix GitHub Actions Self-Hosted Runner Issues
# Run this script on your Ubuntu server where the runner is installed

echo "🔧 Fixing GitHub Actions Runner Issues..."

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Find the runner directory
RUNNER_DIR="/home/ubuntu/actions-runner"
WORK_DIR="$RUNNER_DIR/_work"
TEMP_DIR="$WORK_DIR/_temp"

if [ ! -d "$RUNNER_DIR" ]; then
    print_error "GitHub Actions runner not found at $RUNNER_DIR"
    exit 1
fi

print_status "Found runner directory: $RUNNER_DIR"

# Stop the runner service
print_status "Stopping runner service..."
sudo systemctl stop actions.runner.* 2>/dev/null || true

# Clean up temporary files
print_status "Cleaning up temporary files..."
sudo rm -rf "$TEMP_DIR"/* 2>/dev/null || true
sudo rm -rf "$WORK_DIR"/_actions/actions/checkout/v4/dist/index.js.* 2>/dev/null || true

# Recreate necessary directories with correct permissions
print_status "Recreating directories with correct permissions..."
sudo mkdir -p "$TEMP_DIR/_runner_file_commands"
sudo mkdir -p "$TEMP_DIR/_github_home"
sudo mkdir -p "$TEMP_DIR/_github_workflow"

# Set proper ownership and permissions
sudo chown -R ubuntu:ubuntu "$WORK_DIR"
sudo chmod -R 755 "$WORK_DIR"

# Clear any cached actions
print_status "Clearing cached actions..."
sudo rm -rf "$WORK_DIR/_actions/actions/checkout/v4" 2>/dev/null || true

# Update git configuration for the runner user
print_status "Updating git configuration..."
sudo -u ubuntu git config --global --unset-all credential.helper 2>/dev/null || true
sudo -u ubuntu git config --global credential.helper store
sudo -u ubuntu git config --global user.email "noreply@medh.co"
sudo -u ubuntu git config --global user.name "GitHub Actions Runner"

# Configure git to use token authentication
print_status "Configuring GitHub token authentication..."
if [ -n "$GITHUB_TOKEN" ]; then
    echo "https://x-access-token:$GITHUB_TOKEN@github.com" | sudo -u ubuntu tee /home/ubuntu/.git-credentials > /dev/null
    sudo chmod 600 /home/ubuntu/.git-credentials
    sudo chown ubuntu:ubuntu /home/ubuntu/.git-credentials
    print_status "GitHub token configured"
else
    print_warning "GITHUB_TOKEN not set. Please set it as an environment variable."
fi

# Restart the runner service
print_status "Starting runner service..."
sudo systemctl start actions.runner.* || {
    print_warning "Could not start runner service automatically. Starting manually..."
    cd "$RUNNER_DIR"
    sudo -u ubuntu ./run.sh &
}

# Verify runner status
sleep 5
if pgrep -f "Runner.Listener" > /dev/null; then
    print_status "✅ GitHub Actions runner is running"
else
    print_error "❌ GitHub Actions runner is not running"
    print_status "Check runner logs:"
    tail -20 "$RUNNER_DIR"/_diag/Runner_*.log 2>/dev/null || echo "No logs found"
fi

print_status "🎉 Runner fix completed!"

echo "=================================================="
echo "RUNNER STATUS"
echo "=================================================="
echo "Runner directory: $RUNNER_DIR"
echo "Work directory: $WORK_DIR"
echo "Temp directory: $TEMP_DIR"
echo ""
echo "To manually start the runner:"
echo "cd $RUNNER_DIR && sudo -u ubuntu ./run.sh"
echo ""
echo "To check runner logs:"
echo "tail -f $RUNNER_DIR/_diag/Runner_*.log"
echo "=================================================="