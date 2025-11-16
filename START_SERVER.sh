#!/bin/bash
# Quick Start Script - Ensures backend server is running

cd "$(dirname "$0")"

echo "🔍 Checking backend server status..."

# Check if server is responding
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend server is running!"
    echo "   Health: http://localhost:3000/health"
    echo "   Shipping: http://localhost:3000/api/shipping/rates"
    exit 0
fi

echo "⚠️  Server not responding, starting..."

# Kill any existing process on port 3000
kill $(lsof -ti:3000) 2>/dev/null
sleep 1

# Start server
node server.js > /tmp/wicked-donuts-backend.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/wicked-donuts-backend.pid

# Wait for server to start
sleep 3

# Check if it started
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo "   PID: $SERVER_PID"
    echo "   Health: http://localhost:3000/health"
    echo "   Logs: tail -f /tmp/wicked-donuts-backend.log"
else
    echo "❌ Failed to start server"
    echo "   Check logs: tail -20 /tmp/wicked-donuts-backend.log"
    exit 1
fi

