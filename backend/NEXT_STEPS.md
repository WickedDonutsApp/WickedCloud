# Next Steps - Deploy on Railway

## Step 1: Deploy from GitHub
1. Go back to Railway dashboard
2. Click "New Project" (or "New" button)
3. Select "Deploy from GitHub repo"
4. Find and select "WickedCloud" repository
5. Click "Deploy" or "Add Service"

## Step 2: Set Root Directory
1. After Railway creates the service, click on it
2. Go to "Settings" tab
3. Find "Source" section
4. Set "Root Directory" to: `backend`
5. Click "Save"
6. Railway will redeploy automatically

## Step 3: Add Environment Variables
1. Click "Variables" tab
2. Click "New Variable" or "+" button
3. Add these one by one:

PORT = 3000

TOAST_CLIENT_ID = mgM3UGM5VjTwcJDEb8gSP94W7TMInxlB

TOAST_CLIENT_SECRET = eTtdZZzwdUWfYtkg-TcEZqhqPv-R9200qqwijMjtmig-pC7RSUNmEN71gT-B3-rg

TOAST_RESTAURANT_GUID = b37a9d4a-59f4-4bbe-823f-44f9eb61b59f

TOAST_API_SCOPES = api

TOAST_API_HOST = https://ws-api.toasttab.com

USPS_CLIENT_ID = oOg96CcqhvUhiMp17jjQNMftiyCGNg0F4UPGKGitgb4uzx12

USPS_CLIENT_SECRET = Pgp1dKdwvqCmgE33RP1tx7G8X8yGHhxCAO6mkXnGNAFIYKNVAsTpB8AAUclEB9UQ

USE_USPS_V3 = true

SHIPPING_FROM_NAME = Wicked Donuts

SHIPPING_FROM_STREET1 = 123 Main Street

SHIPPING_FROM_CITY = Boston

SHIPPING_FROM_STATE = MA

SHIPPING_FROM_ZIP = 02101

## Step 4: Get Your URL
1. Click "Networking" tab
2. Click "Generate Domain" (or it auto-generates)
3. Copy the URL (looks like: `https://your-app-name.up.railway.app`)

## Step 5: Update iOS App
1. Open `WeareWicked/BackendService.swift`
2. Find line 64: `return "https://YOUR-RAILWAY-URL.up.railway.app"`
3. Replace `YOUR-RAILWAY-URL` with your actual Railway URL

## Step 6: Test
1. Wait for Railway deployment to finish (check "Deployments" tab)
2. Test the URL: Open it in browser, should show: `{"status":"ok",...}`
3. Update iOS app and test shipping prices






