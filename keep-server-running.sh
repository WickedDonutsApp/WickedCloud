#!/bin/bash
# Keep Backend Server Running Script
# This script monitors and restarts the server if it stops

cd "$(dirname "$0")"
LOG_FILE="/tmp/wicked-donuts-backend-monitor.log"

while true; do
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "$(date): Server not responding, restarting..." >> "$LOG_FILE"
        ./start-server.sh restart
    fi
    sleep 60  # Check every minute
done
