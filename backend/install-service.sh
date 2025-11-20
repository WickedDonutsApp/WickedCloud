#!/bin/bash

# Install Wicked Donuts Backend as a LaunchAgent (runs on login, auto-restarts)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_FILE="$SCRIPT_DIR/com.wickeddonuts.backend.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
INSTALLED_PLIST="$LAUNCH_AGENTS_DIR/com.wickeddonuts.backend.plist"

echo "🔧 Installing Wicked Donuts Backend Service..."

# Find Node.js path
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    NODE_PATH="/usr/local/bin/node"
    if [ ! -f "$NODE_PATH" ]; then
        NODE_PATH="/opt/homebrew/bin/node"
    fi
fi

echo "   Using Node.js at: $NODE_PATH"

# Update plist with actual paths
sed -e "s|/Users/mightybear/Desktop/WeareWicked/backend|$SCRIPT_DIR|g" \
    -e "s|/usr/local/bin/node|$NODE_PATH|g" \
    "$PLIST_FILE" > "$INSTALLED_PLIST"

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Unload existing service if present
launchctl unload "$INSTALLED_PLIST" 2>/dev/null

# Load the service
launchctl load "$INSTALLED_PLIST"

if [ $? -eq 0 ]; then
    echo "✅ Service installed successfully!"
    echo ""
    echo "📋 Service Management:"
    echo "   Start:   launchctl start com.wickeddonuts.backend"
    echo "   Stop:    launchctl stop com.wickeddonuts.backend"
    echo "   Status:  launchctl list | grep wickeddonuts"
    echo "   Logs:    tail -f /tmp/wicked-donuts-backend.log"
    echo ""
    echo "🔄 The service will:"
    echo "   • Start automatically on login"
    echo "   • Auto-restart if it crashes"
    echo "   • Keep running in the background"
    echo ""
    echo "✅ Backend will be available at: http://localhost:3000"
else
    echo "❌ Failed to install service"
    exit 1
fi

