# ☁️ Deploy Backend to Cloud (Production)

## Why Deploy to Cloud?

- ✅ **Always Running**: 99.9% uptime, never goes offline
- ✅ **Accessible Everywhere**: Works from any network
- ✅ **Professional**: Industry standard approach
- ✅ **Scalable**: Handles multiple users simultaneously
- ✅ **Secure**: Proper credential management

## 🚀 Quick Deploy Options

### Option 1: Railway (Easiest) ⭐ RECOMMENDED

1. **Sign up**: https://railway.app (free tier available)

2. **Deploy**:
   ```bash
   cd backend
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. **Get URL**: Railway provides URL like `https://wicked-donuts-backend.railway.app`

4. **Update iOS App**: Set production URL in `BackendService.swift`

### Option 2: DigitalOcean App Platform

1. **Sign up**: https://digitalocean.com
2. **Create App**: Connect GitHub repo
3. **Auto-deploys**: On every push
4. **Cost**: ~$5/month

## 📱 Update iOS App

After deploying, update `BackendService.swift`:

```swift
#if DEBUG
return "http://192.168.0.211:3000" // Local for testing
#else
return "https://wicked-donuts-backend.railway.app" // Your cloud URL
#endif
```

## ✅ Benefits

- **Always Available**: Server runs 24/7
- **No Local Setup**: Works for all users
- **Professional**: Industry standard
- **Scalable**: Handles growth

## 🔄 Keep Local Backend for Development

You can keep both:
- **Local**: For development/testing
- **Cloud**: For production

The app automatically uses the right one based on build configuration!

