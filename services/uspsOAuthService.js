const axios = require('axios');

/**
 * USPS OAuth 2.0 Service
 * Handles authentication for USPS API v3
 */
class USPSOAuthService {
  constructor() {
    // OAuth credentials from environment
    // Support both naming conventions:
    // - USPS_V3_CONSUMER_KEY / USPS_V3_CONSUMER_SECRET (preferred)
    // - USPS_CLIENT_ID / USPS_CLIENT_SECRET (legacy)
    this.clientId = process.env.USPS_V3_CONSUMER_KEY || process.env.USPS_CLIENT_ID;
    this.clientSecret = process.env.USPS_V3_CONSUMER_SECRET || process.env.USPS_CLIENT_SECRET;
    
    // OAuth endpoints
    this.tokenUrl = process.env.USPS_OAUTH_URL || 'https://apis.usps.com/oauth2/v3/token';
    this.revokeUrl = process.env.USPS_OAUTH_REVOKE_URL || 'https://apis.usps.com/oauth2/v3/revoke';
    
    // Token cache
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.refreshTokenExpiresAt = null;
    
    // Scopes for USPS APIs
    // Note: USPS API v3 requires scopes to be space-separated
    // Make sure your USPS Developer Portal app has these scopes enabled
    this.scopes = process.env.USPS_OAUTH_SCOPES || [
      'labels',
      'prices',
      'tracking',
      'addresses'
    ].join(' ');
  }
  
  /**
   * Get a valid access token (refresh if needed)
   */
  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 60000) {
      // Token is still valid (with 1 minute buffer)
      return this.accessToken;
    }
    
    // Try to refresh if we have a refresh token
    if (this.refreshToken && this.refreshTokenExpiresAt && Date.now() < this.refreshTokenExpiresAt) {
      try {
        await this.refreshAccessToken();
        return this.accessToken;
      } catch (error) {
        console.warn('⚠️ Failed to refresh token, getting new one:', error.message);
        // Fall through to get new token
      }
    }
    
    // Get a new token
    await this.requestAccessToken();
    return this.accessToken;
  }
  
  /**
   * Request a new access token using client credentials
   */
  async requestAccessToken() {
    try {
      console.log('🔐 Requesting USPS OAuth2 access token...');
      
      if (!this.clientId || !this.clientSecret) {
        throw new Error('USPS OAuth credentials not configured. Please set USPS_CLIENT_ID and USPS_CLIENT_SECRET in your .env file.');
      }
      
      // USPS API v3 automatically grants all available scopes when no scope parameter is provided
      // For public API keys, omitting scope grants access to all APIs your app has access to
      // Including: domestic-prices, international-prices, addresses, locations, shipments, etc.
      const tokenRequest = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      };
      
      // Only include scope if explicitly configured (for apps that need specific scopes)
      // For most public API keys, omitting scope works best
      if (process.env.USPS_OAUTH_SCOPES && process.env.USPS_OAUTH_SCOPES.trim() !== '') {
        tokenRequest.scope = this.scopes;
      }
      
      const response = await axios.post(
        this.tokenUrl,
        tokenRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
        
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
          this.refreshTokenExpiresAt = Date.now() + (response.data.refresh_token_expires_in * 1000);
        }
        
        const grantedScopes = response.data.scope || '';
        const apiProducts = Array.isArray(response.data.api_products) ? response.data.api_products : [];
        
        console.log('✅ USPS OAuth2 token obtained');
        console.log(`   Expires in: ${response.data.expires_in} seconds`);
        console.log(`   Status: ${response.data.status || 'approved'}`);
        console.log(`   Application: ${response.data.application_name || 'N/A'}`);
        console.log(`   Granted scopes: ${grantedScopes || 'all available'}`);
        if (apiProducts.length > 0) {
          console.log(`   API Products: ${apiProducts.join(', ')}`);
        }
        
        // Check if we have access to required APIs
        const hasPrices = grantedScopes.includes('domestic-prices') || grantedScopes.includes('prices');
        const hasAddresses = grantedScopes.includes('addresses');
        const hasLocations = grantedScopes.includes('locations');
        const hasShipments = grantedScopes.includes('shipments');
        
        if (!hasPrices && !grantedScopes.includes('all')) {
          console.warn(`⚠️ Note: 'domestic-prices' scope not found in granted scopes`);
          console.warn(`   This may be normal if your app has access via API products instead`);
        }
        
        return {
          accessToken: this.accessToken,
          expiresIn: response.data.expires_in,
          tokenType: response.data.token_type || 'Bearer',
          scope: grantedScopes,
          grantedScopes: grantedScopes,
          apiProducts: apiProducts
        };
      } else {
        throw new Error('No access token in response');
      }
      
    } catch (error) {
      console.error('❌ Error requesting USPS OAuth2 token:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
      throw new Error(`Failed to get OAuth2 token: ${error.message}`);
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      console.log('🔄 Refreshing USPS OAuth2 access token...');
      
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post(
        this.tokenUrl,
        {
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          scope: this.scopes
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
        
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
          this.refreshTokenExpiresAt = Date.now() + (response.data.refresh_token_expires_in * 1000);
        }
        
        console.log('✅ USPS OAuth2 token refreshed');
        console.log(`   Refresh count: ${response.data.refresh_count || 0}`);
        
        return {
          accessToken: this.accessToken,
          expiresIn: response.data.expires_in,
          tokenType: response.data.token_type || 'Bearer'
        };
      } else {
        throw new Error('No access token in refresh response');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing USPS OAuth2 token:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
      throw error;
    }
  }
  
  /**
   * Revoke a token
   */
  async revokeToken(token, tokenTypeHint = 'refresh_token') {
    try {
      console.log(`🗑️ Revoking USPS OAuth2 token (${tokenTypeHint})...`);
      
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        this.revokeUrl,
        {
          token: token,
          token_type_hint: tokenTypeHint
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Token revoked successfully');
      
      // Clear cached tokens if we revoked them
      if (token === this.accessToken || token === this.refreshToken) {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = null;
        this.refreshTokenExpiresAt = null;
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error revoking token:', error.message);
      throw error;
    }
  }
  
  /**
   * Get authorization header with Bearer token
   */
  async getAuthHeader() {
    const token = await this.getAccessToken();
    return `Bearer ${token}`;
  }
}

// Export singleton instance
module.exports = new USPSOAuthService();

