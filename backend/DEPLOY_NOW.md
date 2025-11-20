# 🚀 Deploy Backend to Cloud (Railway)

## Step 1: Sign up for Railway
1. Go to https://railway.app
2. Sign up with GitHub (free)
3. Get $5 free credit

## Step 2: Deploy
1. Click "New Project"
2. Click "Deploy from GitHub repo"
3. Select your WeareWicked repository
4. Select the `backend` folder
5. Railway will auto-detect Node.js and deploy

## Step 3: Set Environment Variables
In Railway dashboard, go to your project → Variables tab, add:

```
PORT=3000
TOAST_CLIENT_ID=your_toast_client_id
TOAST_CLIENT_SECRET=your_toast_secret
TOAST_RESTAURANT_GUID=your_restaurant_guid
USPS_CLIENT_ID=your_usps_client_id
USPS_CLIENT_SECRET=your_usps_secret
SHIPPING_FROM_NAME=Wicked Donuts
SHIPPING_FROM_STREET1=your_address
SHIPPING_FROM_CITY=your_city
SHIPPING_FROM_STATE=your_state
SHIPPING_FROM_ZIP=your_zip
USE_USPS_V3=true
```

## Step 4: Get Your URL
Railway will give you a URL like: `https://wicked-donuts-backend-production.up.railway.app`

Copy this URL - you'll need it for the iOS app.

## Step 5: Update iOS App
After deployment, I'll update the app to use your Railway URL.






