#!/bin/bash
# Ensure server is always running - call this periodically

cd "$(dirname "$0")"
PORT=3000

check_and_start() {
    if ! curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "$(date): Server not responding, starting..."
        node server.js > /tmp/wicked-donuts-backend.log 2>&1 &
        sleep 2
        if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
            echo "$(date): Server started successfully"
        else
            echo "$(date): Failed to start server"
        fi
    fi
}

check_and_start
