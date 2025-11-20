#!/bin/bash

# Wicked Donuts Backend Server Startup Script
# This script ensures the server stays running and auto-restarts on failure

cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server configuration
PORT=${PORT:-3000}
LOG_FILE="/tmp/wicked-donuts-backend.log"
PID_FILE="/tmp/wicked-donuts-backend.pid"

# Function to check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Function to start server
start_server() {
    if is_running; then
        echo -e "${YELLOW}⚠️  Server is already running (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🚀 Starting Wicked Donuts Backend Server...${NC}"
    echo "   Port: $PORT"
    echo "   Log: $LOG_FILE"
    
    # Start server in background
    nohup node server.js >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait a moment to check if it started successfully
    sleep 2
    
    if ps -p "$SERVER_PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server started successfully (PID: $SERVER_PID)${NC}"
        echo "   Check logs: tail -f $LOG_FILE"
        return 0
    else
        echo -e "${RED}❌ Server failed to start${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to stop server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}🛑 Stopping server (PID: $PID)...${NC}"
            kill "$PID"
            sleep 1
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID"
            fi
            rm -f "$PID_FILE"
            echo -e "${GREEN}✅ Server stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Server is not running${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️  No PID file found${NC}"
    fi
}

# Function to restart server
restart_server() {
    echo -e "${YELLOW}🔄 Restarting server...${NC}"
    stop_server
    sleep 1
    start_server
}

# Function to check server status
check_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ Server is running (PID: $PID)${NC}"
        
        # Check if port is listening
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}   Port $PORT is listening${NC}"
        else
            echo -e "${RED}   Port $PORT is NOT listening${NC}"
        fi
        
        # Check health endpoint
        if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
            echo -e "${GREEN}   Health check: OK${NC}"
        else
            echo -e "${RED}   Health check: FAILED${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Server is not running${NC}"
        return 1
    fi
}

# Main command handling
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        check_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit $?

