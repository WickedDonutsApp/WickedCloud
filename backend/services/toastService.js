const axios = require('axios');

class ToastService {
  constructor() {
    this.baseURL = process.env.TOAST_CUSTOM_HOST || process.env.TOAST_API_HOST || 'https://ws-api.toasttab.com';
    
    // Use environment variables, with documented credentials as fallback for Railway
    // These match the credentials documented in RAILWAY_ENV_VARS_TO_ADD.txt
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
   * Returns false if credentials are missing (non-fatal)
   */
  async initialize() {
    if (!this.clientId || !this.clientSecret || !this.restaurantGuid) {
      console.warn('⚠️ Toast credentials are missing. Toast features will be disabled.');
      console.warn('   Set TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, and TOAST_RESTAURANT_GUID in environment variables.');
      return false; // Return false instead of throwing - server can still run
    }
    
    try {
      await this.authenticate();
      console.log('✅ Toast authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Toast authentication failed:', error.message);
      console.error('⚠️ Server will continue running, but Toast features will not work');
      return false; // Return false instead of throwing - server can still run
    }
  }
  
  /**
   * Authenticate with Toast API and get access token
   * Toast API uses JSON format: { clientId, clientSecret, scope }
   */
  async authenticate() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpirationDate && new Date() < this.tokenExpirationDate) {
      return this.accessToken;
    }
    
    // Toast API authentication endpoint
    const authEndpoint = `${this.baseURL}/authentication/v1/authentication/login`;
    
    // Toast API expects JSON format with clientId, clientSecret, and scope
    const requestBody = {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      scope: this.apiScopes
    };
    
    try {
      console.log(`🔐 Authenticating with Toast API...`);
      console.log(`   Endpoint: ${authEndpoint}`);
      console.log(`   Client ID: ${this.clientId || 'MISSING'}`);
      console.log(`   Restaurant GUID: ${this.restaurantGuid || 'MISSING'}`);
      console.log(`   Scopes: ${this.apiScopes}`);
      console.log(`   Request Body: ${JSON.stringify({ ...requestBody, clientSecret: '***HIDDEN***' })}`);
      
      // Toast API requires application/json Content-Type
      const response = await axios.post(authEndpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
        
        if (response.status === 200 || response.status === 201) {
          // Parse token from response
          let token = null;
          let expiresIn = 3600; // Default 1 hour
          
          // Toast API response format variations
          if (response.data && response.data.token) {
            token = response.data.token.accessToken || response.data.token.token || response.data.token;
            expiresIn = response.data.token.expiresIn || response.data.expiresIn || 3600;
          } else if (response.data && response.data.accessToken) {
            token = response.data.accessToken;
            expiresIn = response.data.expiresIn || 3600;
          } else if (typeof response.data === 'string') {
            token = response.data;
          } else if (response.data && response.data.access_token) {
            token = response.data.access_token;
            expiresIn = response.data.expires_in || 3600;
          }
          
          if (!token) {
            console.error('❌ No token in response:', JSON.stringify(response.data, null, 2));
            throw new Error('No access token found in response');
          }
          
          this.accessToken = token;
          this.tokenExpirationDate = new Date(Date.now() + (expiresIn * 1000) - 60000); // Subtract 1 minute for safety
          
          console.log(`✅ Toast authentication successful using: ${method.name}`);
          console.log(`   Token expires in: ${expiresIn} seconds`);
          return this.accessToken;
        } else {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
      } catch (error) {
        lastError = error;
        
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 401) {
            // Invalid credentials - try next method
            console.error(`❌ Toast Authentication 401 using ${method.name}:`);
            console.error('   Response:', JSON.stringify(data, null, 2));
            
            // Try next method if available
            if (authMethods.indexOf(method) < authMethods.length - 1) {
              console.log(`   Trying next authentication method...`);
              continue;
            }
            
            // All methods failed - credentials are wrong
            const errorMsg = data?.error || data?.message || data?.error_description || 'Invalid credentials';
            console.error('❌ All authentication methods failed with 401');
            console.error('   This means the credentials are incorrect or expired');
            console.error('   Client ID:', this.clientId);
            console.error('   Restaurant GUID:', this.restaurantGuid);
            console.error('   Please verify credentials in Toast Partner Connect: https://partnerconnect.toasttab.com/');
            throw new Error(`Toast authentication failed (401): ${errorMsg}. Credentials are incorrect or expired. Please verify TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, and TOAST_RESTAURANT_GUID in Railway Variables match your Toast Partner Connect settings.`);
          } else if (status === 404) {
            // Endpoint not found - try next method
            console.log(`⚠️ Endpoint not found (404), trying next method...`);
            continue;
          } else {
            console.error(`❌ Toast authentication error (${status}):`, JSON.stringify(data, null, 2));
            throw new Error(`Toast authentication failed (${status}): ${data?.error || data?.message || 'Unknown error'}`);
          }
        } else {
          // Network error - try next method
          console.log(`⚠️ Network error, trying next method...`);
          continue;
        }
      }
    }
    
    // If we get here, all methods failed
    throw lastError || new Error('Toast authentication failed: All authentication methods failed');
  }
  
  /**
   * Get valid access token (refresh if needed)
   */
  async getValidToken() {
    if (!this.accessToken || !this.tokenExpirationDate || new Date() >= this.tokenExpirationDate) {
      await this.authenticate();
    }
    return this.accessToken;
  }
  
  /**
   * Create order in Toast POS
   * Now includes payment transaction ID if payment was processed
   */
  async createOrder(orderData, paymentTransactionId = null) {
    const token = await this.getValidToken();
    
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
    
    // Build payment info - include transaction ID if payment was processed
    const payment = {
      paymentType: orderData.paymentMethod,
      amount: totalAmount,
      transactionId: paymentTransactionId || null
    };
    
    // Build Toast order request
    const toastOrder = {
      restaurantGuid: this.restaurantGuid,
      orderType: 'PICKUP',
      items: toastItems,
      customer: customer,
      specialInstructions: orderData.specialInstructions || null,
      estimatedReadyTime: orderData.estimatedReadyTime || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      payment: payment
    };
    
    try {
      console.log('📤 Submitting order to Toast...');
      if (paymentTransactionId) {
        console.log(`   Payment Transaction ID: ${paymentTransactionId}`);
      }
      
      const response = await this.api.post('/orders/v2/orders/bulk', toastOrder, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': this.restaurantGuid
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Order created in Toast:', response.data.orderGuid);
        return {
          orderGuid: response.data.orderGuid || response.data.id,
          estimatedReadyTime: response.data.estimatedReadyTime
        };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        throw new Error(`Toast API error (${status}): ${JSON.stringify(data)}`);
      }
      throw error;
    }
  }
  
  /**
   * Process payment through Toast Payment API
   * This actually charges the customer's card
   */
  async processPayment(paymentData) {
    const token = await this.getValidToken();
    
    const {
      orderGuid, // Order GUID (can be temporary/placeholder)
      amount,
      paymentType, // WICKED_CARD, APPLE_PAY, CREDIT_CARD, GIFT_CARD
      paymentMethod, // Additional payment method details
      paymentToken, // For Apple Pay or card tokens
      tipAmount = 0
    } = paymentData;
    
    // Build payment request according to Toast API
    const paymentRequest = {
      restaurantGuid: this.restaurantGuid,
      orderGuid: orderGuid,
      amount: amount,
      tipAmount: tipAmount,
      paymentType: paymentType,
      // Add payment token if available (for Apple Pay, card tokens, etc.)
      ...(paymentToken && { paymentToken: paymentToken }),
      ...(paymentMethod && { paymentMethod: paymentMethod })
    };
    
    try {
      console.log('💳 Processing payment through Toast...');
      console.log(`   Amount: $${amount.toFixed(2)}`);
      console.log(`   Payment Type: ${paymentType}`);
      
      const response = await this.api.post('/payments/v2/payments', paymentRequest, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': this.restaurantGuid
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        const paymentResponse = response.data;
        console.log('✅ Payment processed successfully');
        console.log(`   Transaction ID: ${paymentResponse.transactionId || paymentResponse.id}`);
        console.log(`   Status: ${paymentResponse.status}`);
        
        return {
          transactionId: paymentResponse.transactionId || paymentResponse.id,
          status: paymentResponse.status || 'success',
          amount: paymentResponse.amount || amount,
          paymentType: paymentResponse.paymentType || paymentType
        };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        const errorMessage = `Toast Payment API error (${status}): ${JSON.stringify(data)}`;
        console.error('❌ Payment processing failed:', errorMessage);
        throw new Error(errorMessage);
      }
      console.error('❌ Payment processing error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync customer loyalty/rewards data with Toast
   * This ensures Toast POS knows about customer points, tier, and rewards
   */
  async syncCustomerLoyalty(loyaltyData) {
    const token = await this.getValidToken();
    
    try {
      console.log('⭐ Syncing customer loyalty with Toast...');
      console.log(`   Email: ${loyaltyData.email}`);
      console.log(`   Points: ${loyaltyData.currentPoints} (Lifetime: ${loyaltyData.lifetimePoints})`);
      console.log(`   Tier: ${loyaltyData.currentTier}`);
      
      // Step 1: Find or create customer in Toast
      // Toast uses email as customer identifier
      let customerGuid = null;
      
      try {
        // Try to find existing customer by email
        const customerResponse = await this.api.get(`/customers/v2/customers`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': this.restaurantGuid
          },
          params: {
            email: loyaltyData.email
          }
        });
        
        if (customerResponse.data && customerResponse.data.length > 0) {
          customerGuid = customerResponse.data[0].guid;
          console.log(`   Found existing customer: ${customerGuid}`);
        }
      } catch (error) {
        // Customer not found - will create new one
        console.log('   Customer not found, will create new customer');
      }
      
      // Step 2: Create or update customer with loyalty info
      const customerData = {
        firstName: loyaltyData.firstName,
        lastName: loyaltyData.lastName,
        email: loyaltyData.email,
        // Add custom fields for loyalty data (Toast may support custom fields)
        customFields: {
          loyaltyPoints: loyaltyData.currentPoints,
          lifetimePoints: loyaltyData.lifetimePoints,
          loyaltyTier: loyaltyData.currentTier
        }
      };
      
      if (customerGuid) {
        // Update existing customer
        await this.api.put(`/customers/v2/customers/${customerGuid}`, customerData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': this.restaurantGuid
          }
        });
        console.log('   Updated customer loyalty data');
      } else {
        // Create new customer
        const createResponse = await this.api.post(`/customers/v2/customers`, customerData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': this.restaurantGuid
          }
        });
        customerGuid = createResponse.data.guid;
        console.log(`   Created new customer: ${customerGuid}`);
      }
      
      // Step 3: Award points for this order (if points earned)
      if (loyaltyData.pointsEarned > 0 && loyaltyData.orderGuid) {
        try {
          // Toast may have a loyalty API endpoint for awarding points
          // This depends on Toast's loyalty system configuration
          console.log(`   Awarding ${loyaltyData.pointsEarned} points for order ${loyaltyData.orderGuid}`);
          
          // Note: Toast's loyalty API structure may vary
          // You may need to configure this based on your Toast loyalty setup
          // Common endpoints:
          // POST /loyalty/v1/customers/{code}/points
          // or
          // POST /loyalty/v1/transactions
          
          // For now, we'll log it - you may need to configure Toast loyalty API
          console.log('   ⚠️ Points awarding needs Toast loyalty API configuration');
          console.log('   Points will be tracked in app, but may need manual sync with Toast');
        } catch (pointsError) {
          console.error('   ⚠️ Failed to award points in Toast:', pointsError.message);
          // Don't fail - points are tracked in app
        }
      }
      
      // Step 4: Handle points redemption (if points were redeemed)
      if (loyaltyData.pointsRedeemed > 0) {
        console.log(`   Points redeemed: ${loyaltyData.pointsRedeemed} (Discount: $${loyaltyData.discountAmount})`);
        // Toast should see the discount in the order total
        // Points redemption is already reflected in the order amount
      }
      
      console.log('✅ Customer loyalty synced successfully');
      return { customerGuid, success: true };
      
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error(`❌ Toast loyalty sync error (${status}):`, JSON.stringify(data));
        throw new Error(`Toast loyalty sync failed (${status}): ${JSON.stringify(data)}`);
      }
      console.error('❌ Loyalty sync error:', error.message);
      throw error;
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
          status: response.data.status || 'placed',
          estimatedReadyTime: response.data.estimatedReadyTime
        };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        throw new Error(`Toast API error (${status}): ${JSON.stringify(data)}`);
      }
      throw error;
    }
  }
  
  /**
   * Map app customizations to Toast modifications
   * You'll need to customize this based on your menu structure
   */
  mapCustomizationsToToastModifications(customizations) {
    const modifications = [];
    
    // Example mapping - adjust based on your Toast menu structure
    // You'll need to store modification GUIDs in your database or config
    
    if (customizations.size) {
      modifications.push({
        modificationGuid: this.getModificationGuid('size', customizations.size),
        name: customizations.size,
        price: 0.0
      });
    }
    
    if (customizations.milk) {
      modifications.push({
        modificationGuid: this.getModificationGuid('milk', customizations.milk),
        name: customizations.milk,
        price: 0.0
      });
    }
    
    if (customizations.syrup) {
      modifications.push({
        modificationGuid: this.getModificationGuid('syrup', customizations.syrup),
        name: customizations.syrup,
        price: 0.0
      });
    }
    
    if (customizations.addOns) {
      const addOns = customizations.addOns.split(',');
      addOns.forEach(addOn => {
        modifications.push({
          modificationGuid: this.getModificationGuid('addOn', addOn.trim()),
          name: addOn.trim(),
          price: 0.80
        });
      });
    }
    
    return modifications.length > 0 ? modifications : null;
  }
  
  /**
   * Get modification GUID from your mapping
   * TODO: Implement this based on your Toast menu structure
   * You can store this in a database, config file, or hardcode common ones
   */
  getModificationGuid(type, value) {
    // TODO: Implement your modification GUID mapping
    // This is a placeholder - you'll need to map your customizations to Toast modification GUIDs
    // Example: return modificationGuidMap[`${type}_${value}`] || 'default-guid';
    
    console.warn(`⚠️ Modification GUID mapping not implemented for ${type}: ${value}`);
    return 'placeholder-guid'; // Replace with actual GUID mapping
  }
}

// Export singleton instance
module.exports = new ToastService();

