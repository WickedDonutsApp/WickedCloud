const axios = require('axios');

class ToastService {
  constructor() {
    this.baseURL = process.env.TOAST_CUSTOM_HOST || process.env.TOAST_API_HOST || 'https://ws-api.toasttab.com';
    this.clientId = process.env.TOAST_CLIENT_ID;
    this.clientSecret = process.env.TOAST_CLIENT_SECRET;
    this.restaurantGuid = process.env.TOAST_RESTAURANT_GUID;
    this.apiScopes = process.env.TOAST_API_SCOPES || 'api';
    
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
   */
  async initialize() {
    if (!this.clientId || !this.clientSecret || !this.restaurantGuid) {
      throw new Error('Toast credentials are missing. Please check your .env file.');
    }
    
    try {
      await this.authenticate();
      console.log('✅ Toast authentication successful');
    } catch (error) {
      console.error('❌ Toast authentication failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Authenticate with Toast API and get access token
   */
  async authenticate() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpirationDate && new Date() < this.tokenExpirationDate) {
      return this.accessToken;
    }
    
    const authEndpoints = [
      `${this.baseURL}/authentication/v1/authentication/login`,
      `${this.baseURL}/authentication/login`,
      `https://ws-api.toasttab.com/authentication/v1/authentication/login`,
      `https://ws-api.toasttab.com/authentication/login`,
      `https://ws-api.toastlabs.com/authentication/v1/authentication/login`,
      `https://ws-api.toastlabs.com/authentication/login`
    ];
    
    const requestBodyVariations = [
      { clientId: this.clientId, clientSecret: this.clientSecret, scope: this.apiScopes },
      { clientId: this.clientId, clientSecret: this.clientSecret, scope: this.apiScopes.split(' ') },
      { clientId: this.clientId, clientSecret: this.clientSecret }
    ];
    
    let lastError = null;
    
    // Try each endpoint with each request body variation
    for (const endpoint of authEndpoints) {
      for (const bodyVariation of requestBodyVariations) {
        try {
          console.log(`🔐 Attempting authentication to: ${endpoint}`);
          
          const response = await axios.post(endpoint, bodyVariation, {
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
            
            if (response.data.token) {
              token = response.data.token.accessToken || response.data.token.token || response.data.token;
              expiresIn = response.data.token.expiresIn || response.data.expiresIn || 3600;
            } else if (response.data.accessToken) {
              token = response.data.accessToken;
              expiresIn = response.data.expiresIn || 3600;
            } else if (typeof response.data === 'string') {
              token = response.data;
            }
            
            if (!token) {
              throw new Error('No access token found in response');
            }
            
            this.accessToken = token;
            this.tokenExpirationDate = new Date(Date.now() + (expiresIn * 1000) - 60000); // Subtract 1 minute for safety
            
            console.log('✅ Authentication successful');
            return this.accessToken;
          }
        } catch (error) {
          lastError = error;
          
          if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
              // Invalid credentials - don't try other variations
              throw new Error(`Authentication failed: Invalid credentials (401). ${data.error || data.message || ''}`);
            } else if (status === 404) {
              // Endpoint not found - try next endpoint
              console.log(`⚠️ Endpoint not found (404), trying next...`);
              continue;
            }
          } else {
            // Network error - try next endpoint
            console.log(`⚠️ Network error, trying next endpoint...`);
            continue;
          }
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('Authentication failed: All endpoints failed');
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

