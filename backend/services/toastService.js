const axios = require('axios');

class ToastService {
  constructor() {
    this.baseURL = process.env.TOAST_CUSTOM_HOST || process.env.TOAST_API_HOST || 'https://ws-api.toasttab.com';
    
    // Use environment variables, with documented credentials as fallback for Railway
    this.clientId = process.env.TOAST_CLIENT_ID || 'mgM3UGM5VjTwcJDEb8gSP94W7TMInxlB';
    this.clientSecret = process.env.TOAST_CLIENT_SECRET || 'eTtdZZzwdUWfYtkg-TcEZqhqPv-R9200qqwijMjtmig-pC7RSUNmEN71gT-B3-rg';
    this.restaurantGuid = process.env.TOAST_RESTAURANT_GUID || 'b37a9d4a-59f4-4bbe-823f-44f9eb61b59f';
    this.apiScopes = process.env.TOAST_API_SCOPES || 'api';
    
    // Log which credentials are being used (for debugging)
    console.log('🔐 Toast Service Initialized:');
    console.log(`   Client ID: ${this.clientId.substring(0, 15)}...`);
    console.log(`   Client Secret: ${this.clientSecret ? 'SET' : 'MISSING'}`);
    console.log(`   Restaurant GUID: ${this.restaurantGuid}`);
    console.log(`   API Host: ${this.baseURL}`);
    console.log(`   Scopes: ${this.apiScopes}`);
    
    this.accessToken = null;
    this.tokenExpirationDate = null;
    
    // Create axios instance with default config
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }
  
  /**
   * Initialize Toast service - authenticate and get access token
   * Toast is REQUIRED for orders and payments - server will fail if Toast is not available
   */
  async initialize() {
    if (!this.clientId || !this.clientSecret || !this.restaurantGuid) {
      const error = '❌ Toast credentials are MISSING. Toast is REQUIRED for orders and payments.';
      console.error(error);
      console.error('   Set TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, and TOAST_RESTAURANT_GUID in Railway Variables.');
      throw new Error('Toast credentials are missing. Toast is required for order processing.');
    }
    
    try {
      await this.authenticate();
      console.log('✅ Toast authentication successful - Orders and payments will work');
      return true;
    } catch (error) {
      console.error('❌ Toast authentication FAILED - Server cannot process orders without Toast!');
      console.error('   Error:', error.message);
      console.error('   Please verify credentials in Toast Partner Connect: https://partnerconnect.toasttab.com/');
      throw new Error(`Toast authentication failed: ${error.message}. Toast is required for orders and payments.`);
    }
  }
  
  /**
   * Authenticate with Toast API - Use correct format with userAccessType
   * Based on official Toast API documentation
   */
  async authenticate() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpirationDate && new Date() < this.tokenExpirationDate) {
      return this.accessToken;
    }
    
    // Toast API requires userAccessType: "TOAST_MACHINE_CLIENT"
    const authEndpoint = `${this.baseURL}/authentication/v1/authentication/login`;
    const payload = {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      userAccessType: "TOAST_MACHINE_CLIENT" // This is the key!
    };
    
    try {
      console.log('🔐 Requesting new Toast token from:', authEndpoint);
      console.log(`   Client ID: ${this.clientId || 'MISSING'}`);
      console.log(`   Restaurant GUID: ${this.restaurantGuid || 'MISSING'}`);
      
      const response = await axios.post(authEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.status === 200 || response.status === 201) {
        // Toast returns authenticationToken (not accessToken)
        let token = null;
        let expiresIn = 20 * 60; // Default 20 minutes (1200 seconds)
        
        if (response.data) {
          // Toast response format: { authenticationToken: "..." }
          if (response.data.authenticationToken) {
            token = response.data.authenticationToken;
            expiresIn = response.data.expiresIn || (20 * 60); // 20 minutes default
          }
          // Fallback patterns (just in case)
          else if (response.data.token && response.data.token.accessToken) {
            token = response.data.token.accessToken;
            expiresIn = response.data.token.expiresIn || (20 * 60);
          }
          else if (response.data.accessToken) {
            token = response.data.accessToken;
            expiresIn = response.data.expiresIn || (20 * 60);
          }
          else if (response.data.token && typeof response.data.token === 'string') {
            token = response.data.token;
            expiresIn = response.data.expiresIn || (20 * 60);
          }
          else if (typeof response.data === 'string') {
            token = response.data;
          }
        }
        
        if (!token) {
          console.error('❌ No token in response:', JSON.stringify(response.data, null, 2));
          throw new Error('No authenticationToken found in response');
        }
        
        this.accessToken = token;
        this.tokenExpirationDate = new Date(Date.now() + (expiresIn * 1000) - 60000); // Subtract 1 minute for safety
        
        console.log('✅ Toast auth: token received');
        console.log(`   Token expires in: ${expiresIn} seconds`);
        return this.accessToken;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        console.error(`❌ Toast authentication failed (${status}):`, JSON.stringify(data, null, 2));
        
        if (status === 401) {
          throw new Error(`Toast authentication failed (401): Invalid credentials. Please verify TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, and TOAST_RESTAURANT_GUID in Railway Variables match your Toast Partner Connect settings at https://partnerconnect.toasttab.com/`);
        } else if (status === 415) {
          throw new Error(`Toast authentication failed (415): Unsupported Media Type. This should not happen with correct Content-Type header.`);
        } else {
          throw new Error(`Toast authentication failed (${status}): ${data?.error || data?.message || JSON.stringify(data)}`);
        }
      } else {
        console.error('❌ Toast authentication network error:', error.message);
        throw new Error(`Toast authentication network error: ${error.message}`);
      }
    }
  }
  
  /**
   * Get valid access token (refresh if needed)
   * Throws error if not authenticated - Toast is required
   */
  async getValidToken() {
    if (!this.accessToken || !this.tokenExpirationDate || new Date() >= this.tokenExpirationDate) {
      await this.authenticate();
    }
    if (!this.accessToken) {
      throw new Error('Failed to get Toast access token');
    }
    return this.accessToken;
  }
  
  /**
   * Make an authenticated request to Toast API
   * Helper function similar to toastRequest in TypeScript example
   */
  async toastRequest(method, path, data = null) {
    const token = await this.getValidToken();
    const url = `${this.baseURL}${path}`;
    
    try {
      const config = {
        method: method,
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': this.restaurantGuid
        },
        timeout: 30000
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await this.api.request(config);
      return response.data;
    } catch (error) {
      console.error('❌ Toast API request failed', {
        url,
        method,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      throw error;
    }
  }
  
  /**
   * Create order in Toast POS
   * REQUIRED for order processing - throws error if fails
   */
  async createOrder(orderData, paymentTransactionId = null) {
    const token = await this.getValidToken();
    
    try {
      // Calculate total amount
      const totalAmount = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Map order data to Toast format
      const toastItems = orderData.items.map(item => {
        const toastItem = {
          menuItemGuid: item.productId, // You'll need to map productId to Toast menu item GUID
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions || null
        };
        
        // Add modifications if present
        if (item.customizations && Object.keys(item.customizations).length > 0) {
          toastItem.modifications = this.mapCustomizationsToToastModifications(item.customizations);
        }
        
        return toastItem;
      });
      
      // Build customer info
      const customer = {
        firstName: orderData.customer.firstName,
        lastName: orderData.customer.lastName,
        email: orderData.customer.email,
        phone: orderData.customer.phone || null,
        address: orderData.pickupLocation ? {
          streetAddress: orderData.pickupLocation.streetAddress,
          city: orderData.pickupLocation.city,
          state: orderData.pickupLocation.state,
          zipCode: orderData.pickupLocation.zipCode
        } : null
      };
      
      // Create Toast order payload
      const toastOrder = {
        items: toastItems,
        customer: customer,
        totalAmount: totalAmount,
        paymentMethod: orderData.paymentMethod,
        specialInstructions: orderData.specialInstructions || null,
        estimatedReadyTime: orderData.estimatedReadyTime ? orderData.estimatedReadyTime.toISOString() : null
      };
      
      // Add payment transaction ID if provided
      if (paymentTransactionId) {
        toastOrder.paymentTransactionId = paymentTransactionId;
      }
      
      console.log('📤 Creating order in Toast POS...');
      console.log(`   Customer: ${customer.firstName} ${customer.lastName}`);
      console.log(`   Items: ${toastItems.length}`);
      console.log(`   Total: $${totalAmount.toFixed(2)}`);
      
      // Submit to Toast API
      const response = await this.api.post('/orders/v2/orders', toastOrder, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': this.restaurantGuid
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        const orderGuid = response.data.guid || response.data.orderGuid || response.data.id;
        console.log(`✅ Order created in Toast POS: ${orderGuid}`);
        return { orderGuid, success: true };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error(`❌ Toast order creation failed (${status}):`, JSON.stringify(data, null, 2));
        throw new Error(`Toast order creation failed (${status}): ${data?.error || data?.message || 'Unknown error'}`);
      } else {
        console.error('❌ Toast order creation network error:', error.message);
        throw new Error(`Toast order creation network error: ${error.message}`);
      }
    }
  }
  
  /**
   * Process payment through Toast
   * REQUIRED for payment processing - throws error if fails
   */
  async processPayment(paymentData) {
    const token = await this.getValidToken();
    
    try {
      console.log('💳 Processing payment through Toast...');
      console.log(`   Order GUID: ${paymentData.orderGuid}`);
      console.log(`   Amount: $${paymentData.amount.toFixed(2)}`);
      console.log(`   Payment Method: ${paymentData.paymentMethod}`);
      
      const paymentPayload = {
        orderGuid: paymentData.orderGuid,
        amount: paymentData.amount,
        paymentType: paymentData.paymentType || paymentData.paymentMethod,
        paymentMethod: paymentData.paymentMethod,
        tipAmount: paymentData.tipAmount || 0
      };
      
      // Add payment token if provided (for Apple Pay or card tokens)
      if (paymentData.paymentToken) {
        paymentPayload.paymentToken = paymentData.paymentToken;
      }
      
      const response = await this.api.post('/payments/v2/payments', paymentPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': this.restaurantGuid
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        const transactionId = response.data.transactionId || response.data.guid || response.data.id;
        console.log(`✅ Payment processed successfully: ${transactionId}`);
        return { transactionId, success: true };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error(`❌ Toast payment processing failed (${status}):`, JSON.stringify(data, null, 2));
        throw new Error(`Toast payment processing failed (${status}): ${data?.error || data?.message || 'Unknown error'}`);
      } else {
        console.error('❌ Toast payment processing network error:', error.message);
        throw new Error(`Toast payment processing network error: ${error.message}`);
      }
    }
  }
  
  /**
   * Map app customizations to Toast modification GUIDs
   * You'll need to update this based on your Toast menu setup
   */
  mapCustomizationsToToastModifications(customizations) {
    const modifications = [];
    
    // Example mapping - update based on your Toast menu
    // This is a placeholder - you need to map your app's customization options
    // to Toast's modification GUIDs
    
    if (customizations.size) {
      // Map size to Toast modification
      // modifications.push({ modificationGuid: 'your-size-guid', name: customizations.size });
    }
    
    if (customizations.milk) {
      // Map milk type to Toast modification
      // modifications.push({ modificationGuid: 'your-milk-guid', name: customizations.milk });
    }
    
    if (customizations.addOns) {
      // Map add-ons to Toast modifications
      // const addOnList = customizations.addOns.split(',').map(a => a.trim());
      // addOnList.forEach(addOn => {
      //   modifications.push({ modificationGuid: 'your-addon-guid', name: addOn });
      // });
    }
    
    return modifications;
  }
  
  /**
   * Sync customer loyalty data with Toast
   * Non-critical - logs errors but doesn't throw
   */
  async syncCustomerLoyalty(loyaltyData) {
    const token = await this.getValidToken();
    if (!token) {
      console.warn('⚠️ Toast not authenticated - loyalty data will not sync');
      return { success: false, error: 'Toast not authenticated' };
    }

    try {
      console.log('⭐ Syncing customer loyalty with Toast...');
      console.log(`   Email: ${loyaltyData.email}`);
      console.log(`   Points: ${loyaltyData.currentPoints} (Lifetime: ${loyaltyData.lifetimePoints})`);
      console.log(`   Tier: ${loyaltyData.currentTier}`);

      // Step 1: Find or create customer in Toast
      let customerGuid = null;
      try {
        const customerResponse = await this.api.get(`/customers/v2/customers`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Toast-Restaurant-External-ID': this.restaurantGuid },
          params: { email: loyaltyData.email }
        });
        if (customerResponse.data && customerResponse.data.length > 0) {
          customerGuid = customerResponse.data[0].guid;
          console.log(`   Found existing customer: ${customerGuid}`);
        }
      } catch (error) {
        console.log('   Customer not found, will create new customer');
      }

      // Step 2: Create or update customer with loyalty info
      const customerData = {
        firstName: loyaltyData.firstName,
        lastName: loyaltyData.lastName,
        email: loyaltyData.email,
        customFields: {
          loyaltyPoints: loyaltyData.currentPoints,
          lifetimePoints: loyaltyData.lifetimePoints,
          loyaltyTier: loyaltyData.currentTier
        }
      };

      if (customerGuid) {
        await this.api.put(`/customers/v2/customers/${customerGuid}`, customerData, {
          headers: { 'Authorization': `Bearer ${token}`, 'Toast-Restaurant-External-ID': this.restaurantGuid }
        });
        console.log('   Updated customer loyalty data');
      } else {
        const createResponse = await this.api.post(`/customers/v2/customers`, customerData, {
          headers: { 'Authorization': `Bearer ${token}`, 'Toast-Restaurant-External-ID': this.restaurantGuid }
        });
        customerGuid = createResponse.data.guid;
        console.log(`   Created new customer: ${customerGuid}`);
      }

      // Step 3: Award points for this order (if points earned)
      if (loyaltyData.pointsEarned > 0 && loyaltyData.orderGuid) {
        console.log(`   Awarding ${loyaltyData.pointsEarned} points for order ${loyaltyData.orderGuid}`);
        console.log('   ⚠️ Points awarding needs Toast loyalty API configuration');
        console.log('   Points will be tracked in app, but may need manual sync with Toast');
      }

      // Step 4: Handle points redemption (if points were redeemed)
      if (loyaltyData.pointsRedeemed > 0) {
        console.log(`   Points redeemed: ${loyaltyData.pointsRedeemed} (Discount: $${loyaltyData.discountAmount})`);
      }

      console.log('✅ Customer loyalty synced successfully');
      return { customerGuid, success: true };

    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error(`❌ Toast loyalty sync error (${status}):`, JSON.stringify(data));
        // Don't throw - loyalty sync is not critical
        console.warn('⚠️ Loyalty sync failed, but order will continue');
        return { success: false, error: `Toast loyalty sync failed (${status}): ${JSON.stringify(data)}` };
      }
      console.error('❌ Loyalty sync error:', error.message);
      // Don't throw - loyalty sync is not critical
      console.warn('⚠️ Loyalty sync failed, but order will continue');
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get order status from Toast
   */
  async getOrderStatus(orderGuid) {
    const token = await this.getValidToken();
    
    try {
      const response = await this.api.get(`/orders/v2/orders/${orderGuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': this.restaurantGuid
        }
      });
      
      if (response.status === 200) {
        return {
          status: response.data.status || 'unknown',
          estimatedReadyTime: response.data.estimatedReadyTime || null,
          readyForPickup: response.data.readyForPickup || false
        };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error(`❌ Toast order status check failed (${status}):`, JSON.stringify(data, null, 2));
        throw new Error(`Toast order status check failed (${status}): ${data?.error || data?.message || 'Unknown error'}`);
      } else {
        console.error('❌ Toast order status check network error:', error.message);
        throw new Error(`Toast order status check network error: ${error.message}`);
      }
    }
  }
}

module.exports = new ToastService();
