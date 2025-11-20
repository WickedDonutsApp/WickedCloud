# Deploy to Railway Cloud

## Your Project is Empty - Let's Deploy It!

### Step 1: Create New Project
1. In your empty project, click "New" button (or "New Project")
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access GitHub if needed
4. Find and select your repository (the one with your code)
5. Click "Deploy Now" or similar button

### Step 2: Railway Will Auto-Detect
- Railway will detect it's a Node.js project
- It will start deploying automatically
- Wait for deployment to start

### Step 3: Configure Root Directory
1. Once deployment starts, click on the service that was created
2. Go to "Settings" tab
3. Look for "Source" section
4. Find "Root Directory" field
5. Type: `backend`
6. Click "Save" or "Update"
7. Railway will redeploy with the correct directory

### Step 4: Add Environment Variables
1. Click "Variables" tab
2. Click "New Variable" or "+" button
3. Add each variable:

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

### Step 5: Get Your URL
1. Click "Networking" tab
2. Click "Generate Domain" (or it may auto-generate)
3. Copy the URL (looks like: `https://your-app-name.up.railway.app`)

### Step 6: Update iOS App
1. Open `WeareWicked/BackendService.swift`
2. Find line 64: `return "https://YOUR-RAILWAY-URL.up.railway.app"`
3. Replace `YOUR-RAILWAY-URL` with your actual Railway URL

## Important:
- Make sure your code is pushed to GitHub first
- Railway needs access to your GitHub repository
- After setting Root Directory to `backend`, Railway will redeploy automatically
