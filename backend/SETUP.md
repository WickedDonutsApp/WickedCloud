# Setup Guide

## Environment Variables

Create a `.env` file in the `backend` directory with the following:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Toast POS API Configuration
TOAST_API_HOST=https://ws-api.toasttab.com
TOAST_CLIENT_ID=your_client_id_here
TOAST_CLIENT_SECRET=your_client_secret_here
TOAST_RESTAURANT_GUID=your_restaurant_guid_here
TOAST_API_SCOPES=api

# Optional: Custom Toast API Hostname (if different from default)
# TOAST_CUSTOM_HOST=https://your-custom-toast-host.com

# Security
API_KEY=your_secure_api_key_here
```

Replace the placeholder values with your actual Toast POS credentials from Toast Partner Connect.







