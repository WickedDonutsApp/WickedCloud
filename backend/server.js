const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const toastService = require('./services/toastService');
const orderService = require('./services/orderService');
const uspsService = require('./services/uspsService');
const uspsV3Service = require('./services/uspsV3Service');

// Use v3 API if enabled, otherwise fall back to legacy XML API
const USE_USPS_V3 = process.env.USE_USPS_V3 === 'true';
const activeUspsService = USE_USPS_V3 ? uspsV3Service : uspsService;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for iOS app
app.use(express.json()); // Parse JSON bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Wicked Donuts Backend API'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Wicked Donuts backend running',
    timestamp: new Date().toISOString()
  });
});

// Toast authentication test endpoint
app.get('/api/toast/test-auth', async (req, res) => {
  try {
    console.log('🧪 Testing Toast authentication...');
    
    // Try to get a valid token (this will authenticate if needed)
    const token = await toastService.getValidToken();
    
    if (token) {
      console.log('✅ Toast authentication test successful');
      res.json({ 
        ok: true, 
        message: 'Toast authentication works!',
        tokenLength: token.length,
        hasToken: !!token
      });
    } else {
      throw new Error('No token received from Toast');
    }
  } catch (err) {
    console.error('❌ Toast auth test failed', err?.response?.data || err?.message);
    res.status(500).json({
      ok: false,
      message: 'Toast authentication failed',
      error: err?.response?.data || err?.message,
      details: err?.stack
    });
  }
});

// API Routes
const apiRouter = express.Router();

// Order endpoints
apiRouter.post('/orders', async (req, res) => {
  let paymentTransactionId = null;
  let tempOrderGuid = null;
  
  try {
    console.log('📦 Received order request:', JSON.stringify(req.body, null, 2));
    
    const orderData = req.body;
    
    // Validate required fields
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid order: items array is required and cannot be empty' 
      });
    }
    
    if (!orderData.customer || !orderData.customer.email) {
      return res.status(400).json({ 
        error: 'Invalid order: customer email is required' 
      });
    }
    
    // Calculate total amount
    const totalAmount = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // STEP 1: Process payment FIRST (before creating order)
    // This ensures we get paid before creating the order
    try {
      console.log('💳 Step 1: Processing payment...');
      
      // Generate a temporary order GUID for payment processing
      // Toast may require an order GUID for payment, or we can create order first then pay
      // For now, we'll try to process payment with order creation
      // If Toast requires order first, we'll create order then process payment
      
      // Check if payment should be processed
      // For now, we'll process payment for all payment types except GIFT_CARD (which may be handled differently)
      const shouldProcessPayment = orderData.paymentMethod !== 'GIFT_CARD';
      
      if (shouldProcessPayment) {
        // Create order first (Toast may require order before payment)
        // Then process payment and link it
        
        // Create order in Toast POS (without payment first)
        const toastOrder = await toastService.createOrder(orderData, null);
        tempOrderGuid = toastOrder.orderGuid;
        
        // Now process payment and link to order
        const paymentResult = await toastService.processPayment({
          orderGuid: tempOrderGuid,
          amount: totalAmount,
          paymentType: orderData.paymentMethod,
          paymentMethod: orderData.paymentMethod,
          paymentToken: orderData.paymentToken || null, // For Apple Pay or card tokens
          tipAmount: orderData.tipAmount || 0
        });
        
        paymentTransactionId = paymentResult.transactionId;
        console.log('✅ Payment processed successfully');
        console.log(`   Transaction ID: ${paymentTransactionId}`);
        
        // Update order with payment transaction ID
        // Note: Toast may automatically link payment to order, but we'll include it in the order data
      } else {
        // For gift cards or other payment types, create order without processing payment
        const toastOrder = await toastService.createOrder(orderData, null);
        tempOrderGuid = toastOrder.orderGuid;
      }
      
    } catch (paymentError) {
      console.error('❌ Payment processing failed:', paymentError.message);
      
      // If payment fails, don't create the order
      // Return error to iOS app
      return res.status(402).json({ 
        error: 'Payment processing failed',
        message: paymentError.message,
        code: 'PAYMENT_FAILED'
      });
    }
    
    // STEP 2: Sync rewards/loyalty data with Toast (if provided)
    if (orderData.rewardsData) {
      try {
        console.log('⭐ Syncing rewards data with Toast...');
        console.log(`   Current Points: ${orderData.rewardsData.currentPoints}`);
        console.log(`   Lifetime Points: ${orderData.rewardsData.lifetimePoints}`);
        console.log(`   Current Tier: ${orderData.rewardsData.currentTier}`);
        console.log(`   Points Earned: ${orderData.rewardsData.pointsEarned}`);
        console.log(`   Points Redeemed: ${orderData.rewardsData.pointsRedeemed}`);
        
        // Sync customer loyalty data with Toast
        await toastService.syncCustomerLoyalty({
          email: orderData.customer.email,
          firstName: orderData.customer.firstName,
          lastName: orderData.customer.lastName,
          currentPoints: orderData.rewardsData.currentPoints,
          lifetimePoints: orderData.rewardsData.lifetimePoints,
          currentTier: orderData.rewardsData.currentTier,
          pointsEarned: orderData.rewardsData.pointsEarned,
          pointsRedeemed: orderData.rewardsData.pointsRedeemed,
          orderGuid: tempOrderGuid
        });
        
        console.log('✅ Rewards data synced with Toast');
      } catch (loyaltyError) {
        // Log error but don't fail the order - rewards sync is not critical
        console.error('⚠️ Failed to sync rewards data with Toast:', loyaltyError.message);
        console.log('   Order will still be created, but rewards may not sync');
      }
    }
    
    // Check if this is a merchandise order (has shipping)
    const hasShipping = orderData.shippingAddress || orderData.shippingMethod;
    
    // STEP 3: Store order locally with payment transaction ID
    const orderId = await orderService.saveOrder({
      ...orderData,
      toastOrderId: tempOrderGuid,
      paymentTransactionId: paymentTransactionId,
      status: 'placed',
      createdAt: new Date(),
      shippingAddress: orderData.shippingAddress || null,
      shippingMethod: orderData.shippingMethod || null,
      shippingLabelStatus: hasShipping ? 'pending' : null,
      orderNumber: `ORD-${Date.now().toString().substring(5)}`
    });
    
    // If this is a merchandise order, notify admin
    if (hasShipping) {
      console.log('📦 New merchandise order with shipping - admin should be notified');
      // TODO: Send push notification to admin devices
      // This would typically be done via Firebase Cloud Messaging or similar
    }
    
    // Return response to iOS app
    res.status(201).json({
      orderId: orderId,
      backendOrderId: tempOrderGuid,
      paymentTransactionId: paymentTransactionId,
      status: 'placed',
      estimatedReadyTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
    
    console.log('✅ Order created successfully');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Toast Order GUID: ${tempOrderGuid}`);
    if (paymentTransactionId) {
      console.log(`   Payment Transaction ID: ${paymentTransactionId}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    
    // If order creation failed but payment was processed, we may need to refund
    // For now, log the error - in production, implement refund logic
    if (paymentTransactionId) {
      console.error('⚠️ WARNING: Payment was processed but order creation failed!');
      console.error('   Payment Transaction ID:', paymentTransactionId);
      console.error('   Consider implementing refund logic');
    }
    
    res.status(500).json({ 
      error: 'Failed to create order',
      message: error.message 
    });
  }
});

// Shipping endpoints
apiRouter.post('/shipping/rates', async (req, res) => {
  try {
    const { toAddress, items, packaging } = req.body;
    
    console.log('📦 Calculating shipping rates...');
    console.log('   Request body:', JSON.stringify({ 
      toAddress: toAddress ? { ...toAddress, zip: toAddress.zip } : null,
      itemCount: items?.length || 0,
      packaging: packaging || 'standard_box'
    }, null, 2));
    
    if (!toAddress || !toAddress.zip) {
      console.error('❌ Missing shipping address or ZIP code');
      return res.status(400).json({ 
        error: 'Shipping address with zip code is required',
        details: 'Please provide a valid shipping address with a ZIP code'
      });
    }
    
    if (!items || items.length === 0) {
      console.error('❌ No items provided');
      return res.status(400).json({ 
        error: 'Items are required',
        details: 'Please add items to your cart before calculating shipping'
      });
    }
    
    // Validate ZIP code format (US ZIP codes are 5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(toAddress.zip.replace(/\s/g, ''))) {
      console.error('❌ Invalid ZIP code format:', toAddress.zip);
      return res.status(400).json({ 
        error: 'Invalid ZIP code format',
        details: 'Please provide a valid 5-digit US ZIP code'
      });
    }
    
    // Validate and standardize address with USPS
    let validatedAddress = toAddress;
    try {
      // Use legacy service for address validation (v3 may not have this endpoint yet)
      const validationResult = await uspsService.validateAddress(toAddress);
      if (validationResult.isValid && validationResult.validatedAddress) {
        validatedAddress = validationResult.validatedAddress;
        if (validationResult.corrections.length > 0) {
          console.log('⚠️ Address corrections suggested:', validationResult.corrections);
        }
        if (validationResult.warnings.length > 0) {
          console.log('⚠️ Address validation warnings:', validationResult.warnings);
        }
      } else if (!validationResult.isValid) {
        console.warn('⚠️ Address validation failed, using original address');
      }
    } catch (validationError) {
      console.warn('⚠️ Address validation error, proceeding with original address:', validationError.message);
      // Continue with original address if validation fails
    }
    
    // Calculate weight and dimensions (use legacy service helper methods)
    const weight = uspsService.calculateWeight(items);
    const dimensions = uspsService.calculateDimensions(items, packaging || 'standard_box');
    
    console.log('   Calculated weight:', weight, 'lbs');
    console.log('   Calculated dimensions:', dimensions);
    
    // Get shipping rates from USPS (use active service - v3 or legacy)
    const rates = await activeUspsService.getShippingRates(validatedAddress, weight, dimensions, packaging);
    
    console.log(`✅ Found ${rates.length} shipping options`);
    
    res.json({
      rates: rates,
      weight: weight,
      dimensions: dimensions
    });
    
  } catch (error) {
    console.error('❌ Error calculating shipping rates:', error);
    console.error('   Error stack:', error.stack);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to calculate shipping rates';
    let errorDetails = error.message;
    let statusCode = 500;
    
    // Check error response data for scope issues
    const errorResponseData = error.response?.data || {};
    const errorDetail = errorResponseData.detail || errorResponseData.message || '';
    const errorCode = errorResponseData.code || '';
    
    // Check for specific error types
    if (errorDetail.includes('Insufficient OAuth scope') || 
        errorDetail.includes('scope') || 
        errorDetail.includes('invalid') && errorDetail.includes('scope') ||
        errorCode === '401' && errorDetail.includes('scope')) {
      errorMessage = 'USPS API: Insufficient OAuth Scope';
      errorDetails = 'Your USPS Developer Portal app does not have the required scopes enabled.\n\nPlease go to https://developers.usps.com/ and enable these scopes in your app settings:\n• labels - For creating shipping labels\n• prices - For getting shipping rates\n• tracking - For package tracking\n• addresses - For address validation\n\nAfter enabling scopes, restart the backend server.';
      statusCode = 401;
    } else if (error.message.includes('401') || error.response?.status === 401 || errorCode === '401') {
      // Check if it's a scope issue or credential issue
      if (errorDetail.includes('scope') || errorDetail.includes('insufficient')) {
        errorMessage = 'USPS API: Insufficient OAuth Scope';
        errorDetails = 'Your USPS Developer Portal app does not have the required scopes enabled. Please enable: labels, prices, tracking, addresses in your USPS Developer Portal app settings at https://developers.usps.com/';
        statusCode = 401;
      } else {
        errorMessage = 'USPS API Authentication Failed';
        errorDetails = 'USPS API credentials are missing or invalid. Please verify USPS_V3_CONSUMER_KEY and USPS_V3_CONSUMER_SECRET in backend/.env file, and ensure your app is approved in the USPS Developer Portal.';
        statusCode = 401;
      }
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Shipping service timeout';
      errorDetails = 'The shipping service took too long to respond. Please try again.';
    } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Cannot connect to shipping service';
      errorDetails = 'Unable to reach USPS shipping API. Please check your internet connection and ensure the backend server has access to the USPS API.';
    } else if (error.message.includes('authentication') || error.message.includes('credentials')) {
      errorMessage = 'Shipping service authentication failed';
      errorDetails = 'USPS API credentials are missing or invalid. Please configure USPS_V3_CONSUMER_KEY and USPS_V3_CONSUMER_SECRET in your backend/.env file.';
      statusCode = 401;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: errorDetails,
      details: error.message
    });
  }
});

apiRouter.post('/shipping/label', async (req, res) => {
  try {
    const { orderId, orderData, shippingData } = req.body;
    
    console.log('🏷️ Creating shipping label...');
    
    if (!orderId || !shippingData || !shippingData.toAddress) {
      return res.status(400).json({ error: 'Order ID and shipping data are required' });
    }
    
    // Create shipping label (use active service - v3 or legacy)
    const label = await activeUspsService.createShippingLabel(
      { orderId, ...orderData },
      shippingData
    );
    
    // Store label info with order
    if (orderId) {
      await orderService.updateOrder(orderId, {
        shippingLabel: label.trackingNumber,
        shippingTrackingNumber: label.trackingNumber,
        shippingLabelImage: label.labelImage
      });
    }
    
    res.json({
      trackingNumber: label.trackingNumber,
      labelImage: label.labelImage,
      labelFormat: label.labelFormat
    });
    
  } catch (error) {
    console.error('❌ Error creating shipping label:', error);
    res.status(500).json({ 
      error: 'Failed to create shipping label',
      message: error.message 
    });
  }
});

apiRouter.get('/shipping/postage-adjustment/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    console.log(`💰 Checking postage adjustment for: ${trackingNumber}`);
    
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }
    
    const adjustment = await uspsService.getPostageAdjustment(trackingNumber);
    
    res.json(adjustment);
    
  } catch (error) {
    console.error('❌ Error getting postage adjustment:', error);
    res.status(500).json({ 
      error: 'Failed to get postage adjustment',
      message: error.message 
    });
  }
});

apiRouter.get('/shipping/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    console.log(`📮 Tracking package: ${trackingNumber}`);
    
    const tracking = await uspsService.trackPackage(trackingNumber);
    
    res.json(tracking);
    
  } catch (error) {
    console.error('❌ Error tracking package:', error);
    res.status(500).json({ 
      error: 'Failed to track package',
      message: error.message 
    });
  }
});

// Admin endpoints for shipping management
apiRouter.get('/admin/shipping-orders', async (req, res) => {
  try {
    console.log('📦 Admin: Fetching shipping orders...');
    
    const orders = await orderService.getShippingOrders();
    
    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    
    res.json(orders);
    
  } catch (error) {
    console.error('❌ Error fetching shipping orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch shipping orders',
      message: error.message 
    });
  }
});

apiRouter.get('/admin/shipping-label/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    console.log(`🏷️ Admin: Fetching shipping label for: ${trackingNumber}`);
    
    // Find order by tracking number
    const allOrders = await orderService.getAllOrders();
    const order = allOrders.find(o => 
      o.shippingTrackingNumber === trackingNumber || 
      o.shippingLabel === trackingNumber
    );
    
    if (!order || !order.shippingLabelImage) {
      return res.status(404).json({ error: 'Shipping label not found' });
    }
    
    res.json({
      trackingNumber: trackingNumber,
      labelImage: order.shippingLabelImage,
      labelFormat: 'PDF'
    });
    
  } catch (error) {
    console.error('❌ Error fetching shipping label:', error);
    res.status(500).json({ 
      error: 'Failed to fetch shipping label',
      message: error.message 
    });
  }
});

apiRouter.put('/admin/shipping-orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    console.log(`📝 Admin: Updating shipping label status for order ${orderId} to: ${status}`);
    
    if (!['pending', 'printed', 'shipped'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: pending, printed, or shipped' });
    }
    
    const updated = await orderService.updateShippingLabelStatus(orderId, status);
    
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ 
      success: true,
      orderId: orderId,
      status: status
    });
    
  } catch (error) {
    console.error('❌ Error updating shipping label status:', error);
    res.status(500).json({ 
      error: 'Failed to update shipping label status',
      message: error.message 
    });
  }
});

// Get order status
apiRouter.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log(`📋 Fetching order status for: ${orderId}`);
    
    // Get order from local storage (or database)
    const order = await orderService.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check status from Toast if we have a Toast order ID
    if (order.toastOrderId) {
      try {
        const toastStatus = await toastService.getOrderStatus(order.toastOrderId);
        
        // Update local order status
        await orderService.updateOrderStatus(orderId, toastStatus.status);
        
        res.json({
          orderId: orderId,
          status: toastStatus.status,
          estimatedReadyTime: toastStatus.estimatedReadyTime,
          readyForPickup: toastStatus.status === 'ready' || toastStatus.status === 'ready_for_pickup'
        });
      } catch (toastError) {
        // If Toast check fails, return local status
        console.warn('⚠️ Failed to check Toast status, returning local status:', toastError.message);
        res.json({
          orderId: orderId,
          status: order.status || 'placed',
          estimatedReadyTime: order.estimatedReadyTime
        });
      }
    } else {
      // No Toast order ID, return local status
      res.json({
        orderId: orderId,
        status: order.status || 'placed',
        estimatedReadyTime: order.estimatedReadyTime
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching order status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order status',
      message: error.message 
    });
  }
});

// Webhook endpoint for Toast to notify us of order status changes
apiRouter.post('/webhooks/toast', async (req, res) => {
  try {
    console.log('🔔 Received Toast webhook:', JSON.stringify(req.body, null, 2));
    
    // Handle Toast webhook (order status updates, etc.)
    // You'll need to configure this in Toast Partner Connect
    
    const webhookData = req.body;
    
    // Update order status if we have the order ID
    if (webhookData.orderGuid) {
      await orderService.updateOrderByToastId(webhookData.orderGuid, webhookData.status);
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

app.use('/api', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server with error handling and auto-restart logic
// Listen on 0.0.0.0 to accept connections from Railway's load balancer
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Wicked Donuts Backend API running on ${HOST}:${PORT}`);
  console.log(`📱 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📦 Order endpoint: http://${HOST}:${PORT}/api/orders`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  
  // Initialize Toast service (non-blocking - server continues even if this fails)
  toastService.initialize()
    .then(() => {
      console.log('✅ Toast POS service initialized');
    })
    .catch((error) => {
      console.error('❌ Failed to initialize Toast POS service:', error.message);
      console.error('⚠️ Server will continue running, but Toast features may not work');
      // Don't crash the server if Toast initialization fails
    });
});

// Handle server errors gracefully
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error('   Another instance may be running. Check with: lsof -i :3000');
  } else {
    console.error('❌ Server error:', error);
  }
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - let process manager restart if needed
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let process manager restart if needed
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;

