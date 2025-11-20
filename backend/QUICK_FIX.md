# ✅ Backend Server - Quick Fix Guide

## 🚀 Server is Now Running!

The backend server is configured to **always run** and auto-restart.

## ✅ Current Status

- ✅ Server is running on port 3000
- ✅ Auto-restarts if it crashes
- ✅ Starts automatically on login
- ✅ Shipping prices endpoint is working

## 🔧 If Server Stops Working

### Quick Fix (Run This):
```bash
cd backend
./START_SERVER.sh
```

This will:
1. Check if server is running
2. Start it if not
3. Verify it's working

### Manual Start:
```bash
cd backend
node server.js
```

### Check Status:
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok",...}`

### View Logs:
```bash
tail -f /tmp/wicked-donuts-backend.log
```

## 📱 iOS App Connection

The iOS app connects to: `http://192.168.0.211:3000`

If your Mac's IP changes, update `BackendService.swift`:
```swift
return "http://YOUR_NEW_IP:3000"
```

Find your IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## ✅ Shipping Prices Test

Test shipping endpoint:
```bash
curl -X POST http://localhost:3000/api/shipping/rates \
  -H "Content-Type: application/json" \
  -d '{
    "toAddress": {
      "name": "Test",
      "street1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "items": [{
      "productId": "test-1",
      "productName": "T-Shirt",
      "quantity": 1,
      "price": 20.00
    }],
    "packaging": "envelope"
  }'
```

## 🎯 Everything Should Work Now!

The server is running and shipping prices are calculating correctly.






