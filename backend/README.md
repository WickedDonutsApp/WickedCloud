# Wicked Donuts Backend API

Backend API for Wicked Donuts iOS app. Handles all Toast POS integration, order management, and payment processing.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Toast POS credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
TOAST_CLIENT_ID=your_client_id_here
TOAST_CLIENT_SECRET=your_client_secret_here
TOAST_RESTAURANT_GUID=your_restaurant_guid_here
TOAST_API_SCOPES=api
```

### 3. Start Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Create Order
```
POST /api/orders
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "productName": "Glazed Donut",
      "quantity": 2,
      "price": 2.50,
      "customizations": {
        "size": "Large",
        "milk": "Oat Milk",
        "addOns": "Extra Shot, Whipped Cream"
      },
      "specialInstructions": "Extra glaze please"
    }
  ],
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "paymentMethod": "WICKED_CARD",
  "pickupLocation": {
    "streetAddress": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zipCode": "02101"
  },
  "specialInstructions": "Please call when ready",
  "estimatedReadyTime": "2024-01-15T14:30:00Z"
}
```

**Response:**
```json
{
  "orderId": "uuid",
  "backendOrderId": "toast-order-guid",
  "status": "placed",
  "estimatedReadyTime": "2024-01-15T14:30:00Z"
}
```

### Get Order Status
```
GET /api/orders/:orderId
```

**Response:**
```json
{
  "orderId": "uuid",
  "status": "preparing",
  "estimatedReadyTime": "2024-01-15T14:30:00Z",
  "readyForPickup": false
}
```

### Toast Webhook (for order status updates)
```
POST /api/webhooks/toast
```

Configure this URL in Toast Partner Connect to receive real-time order status updates.

## 🔧 Configuration

### Toast POS Credentials

Get these from [Toast Partner Connect](https://partnerconnect.toasttab.com/):

1. **Client ID** - Your API client identifier
2. **Client Secret** - Your API client secret
3. **Restaurant GUID** - Your location UUID
4. **API Scopes** - Usually just `api`

### Custom Toast API Hostname

If you're using a custom Toast API hostname, set it in `.env`:
```env
TOAST_CUSTOM_HOST=https://your-custom-host.com
```

## 🗄️ Database (Optional)

Currently uses in-memory storage. For production, add a database:

### MongoDB Example
```bash
npm install mongodb
```

Update `services/orderService.js` to use MongoDB.

### PostgreSQL Example
```bash
npm install pg
```

Update `services/orderService.js` to use PostgreSQL.

## 🔐 Security

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers enabled
- **CORS**: Configured for iOS app
- **Environment Variables**: Never commit `.env` file

## 📝 TODO / Customization

1. **Modification GUID Mapping**: Update `toastService.js` → `getModificationGuid()` to map your customizations to Toast modification GUIDs
2. **Product ID Mapping**: Map your app's `productId` to Toast `menuItemGuid` in `createOrder()`
3. **Database**: Replace in-memory storage with real database
4. **Error Handling**: Add more specific error handling
5. **Logging**: Add proper logging (Winston, Pino, etc.)
6. **Testing**: Add unit and integration tests

## 🐛 Troubleshooting

### Authentication Fails
- Check your credentials in `.env`
- Verify Restaurant GUID matches your location UUID exactly
- Check API scopes in Toast Partner Connect

### Orders Not Creating
- Check Toast API logs
- Verify menu item GUIDs are correct
- Ensure payment method is valid

### Webhook Not Receiving Updates
- Verify webhook URL is configured in Toast Partner Connect
- Check server logs for incoming requests
- Ensure server is publicly accessible (use ngrok for local testing)

## 📚 Resources

- [Toast API Documentation](https://developer.toasttab.com/)
- [Toast Partner Connect](https://partnerconnect.toasttab.com/)
- [Express.js Documentation](https://expressjs.com/)

## 📄 License

ISC







