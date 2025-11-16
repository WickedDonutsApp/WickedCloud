# 🚀 Backend Server Management

## ✅ Persistent Server Setup

The backend server is now configured to **always run** using macOS LaunchAgent.

### Current Status

The server runs as a **background service** that:
- ✅ Starts automatically when you log in
- ✅ Auto-restarts if it crashes
- ✅ Keeps running even if you close the terminal
- ✅ Survives system restarts

## 📋 Service Management Commands

### Check Status
```bash
cd backend
./start-server.sh status
```

Or check LaunchAgent:
```bash
launchctl list | grep wickeddonuts
```

### Start Server
```bash
cd backend
./start-server.sh start
```

Or use LaunchAgent:
```bash
launchctl start com.wickeddonuts.backend
```

### Stop Server
```bash
cd backend
./start-server.sh stop
```

Or use LaunchAgent:
```bash
launchctl stop com.wickeddonuts.backend
```

### Restart Server
```bash
cd backend
./start-server.sh restart
```

### View Logs
```bash
tail -f /tmp/wicked-donuts-backend.log
```

### View Service Logs
```bash
tail -f /tmp/wicked-donuts-backend-service.log
```

## 🔧 Reinstall Service

If you move the backend directory or need to reinstall:

```bash
cd backend
./install-service.sh
```

## 🎯 Server Endpoints

Once running, the server is available at:
- **Health Check:** http://localhost:3000/health
- **Orders API:** http://localhost:3000/api/orders
- **Shipping Rates:** http://localhost:3000/api/shipping/rates

## 📱 iOS App Configuration

The iOS app connects to the backend at:
- **Default:** `http://192.168.0.211:3000` (your computer's IP)
- **Configurable:** Set via UserDefaults key `backend_api_url`

### Update Backend URL in iOS App

1. **Via Settings (if implemented):**
   - Go to Account → Settings
   - Enter backend URL

2. **Via Code:**
   ```swift
   UserDefaults.standard.set("http://YOUR_IP:3000", forKey: "backend_api_url")
   ```

3. **Find Your IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

## 🔍 Troubleshooting

### Server Not Starting?

1. **Check if port is in use:**
   ```bash
   lsof -i :3000
   ```

2. **Kill existing process:**
   ```bash
   kill $(lsof -ti:3000)
   ```

3. **Check logs:**
   ```bash
   tail -50 /tmp/wicked-donuts-backend.log
   ```

### Service Not Auto-Starting?

1. **Check LaunchAgent is loaded:**
   ```bash
   launchctl list | grep wickeddonuts
   ```

2. **Reinstall service:**
   ```bash
   cd backend
   ./install-service.sh
   ```

### iOS App Can't Connect?

1. **Verify server is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check your IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

3. **Update iOS app with correct IP:**
   - Update `BackendService.swift` baseURL
   - Or set via UserDefaults

## 🎯 Production Deployment

For production, deploy to:
- **Railway** - Connect GitHub repo and auto-deploy
- **AWS** - Elastic Beanstalk
- **DigitalOcean** - App Platform

Then update iOS app with production URL.

