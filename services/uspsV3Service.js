const axios = require('axios');
const uspsOAuth = require('./uspsOAuthService');

/**
 * USPS API v3 Service
 * Uses REST APIs with OAuth2 authentication
 */
class USPSV3Service {
  constructor() {
    // USPS API v3 endpoints
    this.pricesAPI = process.env.USPS_PRICES_API_URL || 'https://apis.usps.com/prices/v3';
    this.labelsAPI = process.env.USPS_LABELS_API_URL || 'https://apis.usps.com/labels/v3';
    this.trackingAPI = process.env.USPS_TRACKING_API_URL || 'https://apis.usps.com/tracking/v3';
    this.addressesAPI = process.env.USPS_ADDRESSES_API_URL || 'https://apis.usps.com/addresses/v3';
    
    // Your business address (from which packages ship)
    this.fromAddress = {
      firstName: process.env.SHIPPING_FROM_FIRST_NAME || 'Wicked',
      lastName: process.env.SHIPPING_FROM_LAST_NAME || 'Donuts',
      firm: process.env.SHIPPING_FROM_NAME || 'Wicked Donuts',
      streetAddress: process.env.SHIPPING_FROM_STREET1 || '',
      secondaryAddress: process.env.SHIPPING_FROM_STREET2 || '',
      city: process.env.SHIPPING_FROM_CITY || '',
      state: process.env.SHIPPING_FROM_STATE || '',
      ZIPCode: process.env.SHIPPING_FROM_ZIP || '',
      ZIPPlus4: process.env.SHIPPING_FROM_ZIP_PLUS4 || '',
      phone: process.env.SHIPPING_FROM_PHONE || '',
      email: process.env.SHIPPING_FROM_EMAIL || ''
    };
    
    // Default price type (COMMERCIAL for business accounts)
    this.priceType = process.env.USPS_PRICE_TYPE || 'COMMERCIAL';
  }
  
  /**
   * Calculate weight from items (helper method for compatibility)
   */
  calculateWeight(items) {
    let totalWeight = 0;
    
    items.forEach(item => {
      const productName = (item.productName || '').toLowerCase();
      let itemWeight = 0.5; // Default 0.5 lbs per item
      
      if (productName.includes('t-shirt') || productName.includes('tshirt')) {
        itemWeight = 0.3;
      } else if (productName.includes('hoodie')) {
        itemWeight = 1.0;
      } else if (productName.includes('mug')) {
        itemWeight = 1.2;
      } else if (productName.includes('tumbler')) {
        itemWeight = 0.8;
      } else if (productName.includes('cap') || productName.includes('hat')) {
        itemWeight = 0.2;
      }
      
      totalWeight += itemWeight * item.quantity;
    });
    
    // Add packaging weight
    totalWeight += 0.2; // Box/envelope weight
    
    return Math.max(0.1, totalWeight); // Minimum 0.1 lbs
  }
  
  /**
   * Calculate dimensions from items (helper method for compatibility)
   */
  calculateDimensions(items, packaging) {
    switch (packaging) {
      case 'envelope':
        return { length: 12, width: 9, height: 1 };
      case 'bubble_envelope':
        return { length: 12.5, width: 9.5, height: 1.5 };
      case 'tshirt_envelope':
        return { length: 11, width: 15, height: 1 };
      case 'small_box':
        return { length: 8.5, width: 5.5, height: 1.5 };
      case 'medium_box':
        return { length: 11.25, width: 8.75, height: 6 };
      case 'large_box':
        return { length: 12.25, width: 12.25, height: 6 };
      case 'standard_box':
      default:
        // Calculate based on item count
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        if (itemCount <= 2) {
          return { length: 8.5, width: 5.5, height: 1.5 };
        } else if (itemCount <= 5) {
          return { length: 11.25, width: 8.75, height: 6 };
        } else {
          return { length: 12.25, width: 12.25, height: 6 };
        }
    }
  }
  
  /**
   * Get shipping rates using Domestic Prices API v3
   * Based on USPS Prices API v3 OpenAPI specification (version 3.4.24)
   * Uses POST /total-rates/search endpoint to get rates for all mail classes including extra services
   * 
   * Request Schema: TotalRatesQuery (extends RateListQuery)
   * Required fields: originZIPCode, destinationZIPCode, weight, length, width, height
   * Optional fields: mailClasses (array), priceType, mailingDate, extraServices (array), 
   *                  accountType, accountNumber, hasNonstandardCharacteristics, itemValue
   * 
   * Response Schema: TotalRatesQueryResult
   * Contains: rateOptions (array of RateOption objects)
   * Each RateOption contains: totalBasePrice, totalPrice (if extraServices), rates (array), extraServices (array)
   */
  async getShippingRates(toAddress, weight, dimensions, packaging = 'standard_box') {
    try {
      console.log('📦 Getting USPS shipping rates (v3 API - Prices API v3.4.24)...');
      console.log(`   To: ${toAddress.city}, ${toAddress.state} ${toAddress.zip}`);
      console.log(`   Weight: ${weight} lbs`);
      console.log(`   Dimensions: ${dimensions.length}" x ${dimensions.width}" x ${dimensions.height}"`);
      
      // Get OAuth token (requires "prices" scope)
      const authHeader = await uspsOAuth.getAuthHeader();
      
      // Extract ZIP codes (5-digit format, pattern: ^\d{5}(?:[-\s]\d{4})?$)
      const originZip = this.fromAddress.ZIPCode.replace(/\D/g, '').substring(0, 5);
      const destZip = toAddress.zip.replace(/\D/g, '').substring(0, 5);
      
      // Validate required fields
      if (!originZip || originZip.length !== 5) {
        throw new Error('Invalid origin ZIP code');
      }
      if (!destZip || destZip.length !== 5) {
        throw new Error('Invalid destination ZIP code');
      }
      if (!weight || weight <= 0) {
        throw new Error('Weight must be greater than 0');
      }
      if (!dimensions.length || !dimensions.width || !dimensions.height) {
        throw new Error('All dimensions (length, width, height) are required');
      }
      
      // Build TotalRatesQuery request according to Prices API v3 OpenAPI spec
      // TotalRatesQuery extends RateListQuery and adds: itemValue (optional), extraServices (optional array)
      const requestBody = {
        // Required fields from RateListQuery
        originZIPCode: originZip,
        destinationZIPCode: destZip,
        weight: weight, // Weight in pounds (format: double, minimum: 0, exclusiveMinimum: true)
        length: dimensions.length, // Length in inches (format: double, minimum: 0, exclusiveMinimum: true)
        width: dimensions.width, // Width in inches (format: double, minimum: 0, exclusiveMinimum: true)
        height: dimensions.height, // Height in inches (format: double, minimum: 0, exclusiveMinimum: true)
        
        // Optional fields
        mailClasses: [
          'USPS_GROUND_ADVANTAGE',
          'PRIORITY_MAIL',
          'PRIORITY_MAIL_EXPRESS'
        ], // Array of mail classes (mailClassesOutboundOnly)
        priceType: this.priceType, // RETAIL, COMMERCIAL, or CONTRACT (default: COMMERCIAL)
        mailingDate: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD (today + 0-7 days in advance)
        
        // Extra services (optional array of ExtraService codes)
        // 920 = USPS Tracking Electronic (included by default)
        extraServices: [920] // TotalRatesExtraServices array
      };
      
      // Add hasNonstandardCharacteristics if package has nonstandard characteristics
      // (cylindrical tubes, rolls, high-density items, liquids in glass containers, etc.)
      if (packaging.includes('tube') || packaging.includes('roll')) {
        requestBody.hasNonstandardCharacteristics = true;
      }
      
      console.log('   Request:', JSON.stringify(requestBody, null, 2));
      
      // Call Prices API v3 POST /total-rates/search endpoint
      // Endpoint: https://apis.usps.com/prices/v3/total-rates/search
      // Security: OAuth 2.0 with "prices" scope
      const response = await axios.post(
        `${this.pricesAPI}/total-rates/search`,
        requestBody,
        {
          headers: {
            'Authorization': authHeader, // Bearer token from OAuth
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );
      
      // Parse response - TotalRatesQueryResult contains rateOptions array
      // Response structure: { rateOptions: [ { totalBasePrice, totalPrice, rates: [...], extraServices: [...] }, ... ] }
      const rates = this.transformRatesResponse(response.data);
      
      console.log(`✅ Found ${rates.length} shipping options`);
      return rates;
      
    } catch (error) {
      console.error('❌ Error getting USPS rates (v3):', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        
        // Parse error response according to ErrorMessage schema
        const errorData = error.response.data;
        const errorDetail = errorData?.error?.errors?.[0]?.detail || 
                           errorData?.error?.message || 
                           errorData?.message || 
                           'Unknown error';
        
        // Provide specific guidance for scope errors
        if (error.response.status === 401) {
          if (errorDetail.includes('scope') || 
              errorDetail.includes('insufficient') || 
              errorDetail.includes('OAuth scope')) {
            const scopeError = new Error('USPS API: Insufficient OAuth scope. Please ensure your USPS Developer Portal app has the "prices" scope enabled at https://developers.usps.com/');
            scopeError.statusCode = 401;
            throw scopeError;
          } else {
            throw new Error('USPS API: Authentication failed. Please verify your OAuth credentials (USPS_V3_CONSUMER_KEY and USPS_V3_CONSUMER_SECRET) in backend/.env file.');
          }
        } else if (error.response.status === 400) {
          // Bad request - likely missing required fields or invalid values
          throw new Error(`USPS API: Invalid request - ${errorDetail}`);
        } else if (error.response.status === 403) {
          throw new Error('USPS API: Access denied. Please verify your app has access to the Prices API.');
        } else if (error.response.status === 429) {
          throw new Error('USPS API: Too many requests. Please wait before retrying.');
        } else if (error.response.status === 503) {
          throw new Error('USPS API: Service unavailable. Please try again later.');
        }
      }
      throw new Error(`Failed to get shipping rates: ${error.message}`);
    }
  }
  
  /**
   * Create shipping label using Labels API v3
   * Based on USPS Labels API v3 OpenAPI specification
   */
  async createShippingLabel(orderData, shippingData) {
    try {
      console.log('🏷️ Creating USPS shipping label (v3 API)...');
      console.log(`   Order ID: ${orderData.orderId}`);
      console.log(`   Service: ${shippingData.service}`);
      
      // Get OAuth token
      const authHeader = await uspsOAuth.getAuthHeader();
      
      // Map service to mail class
      const mailClass = this.mapServiceToMailClass(shippingData.service);
      
      // Parse name if provided as single string
      const toNameParts = (shippingData.toAddress.name || '').split(' ');
      const firstName = shippingData.toAddress.firstName || toNameParts[0] || '';
      const lastName = shippingData.toAddress.lastName || toNameParts.slice(1).join(' ') || '';
      
      // Extract ZIP code components
      const zipCode = shippingData.toAddress.zip.replace(/\D/g, '');
      const zip5 = zipCode.substring(0, 5);
      const zipPlus4 = zipCode.substring(5, 9) || null;
      
      // Build label request according to v3 API spec (LabelRequest schema)
      const labelRequest = {
        toAddress: {
          firstName: firstName,
          lastName: lastName,
          firm: shippingData.toAddress.firm || '',
          streetAddress: shippingData.toAddress.street1,
          secondaryAddress: shippingData.toAddress.street2 || '',
          city: shippingData.toAddress.city,
          state: shippingData.toAddress.state,
          ZIPCode: zip5,
          ZIPPlus4: zipPlus4,
          phone: shippingData.toAddress.phone || '',
          email: shippingData.toAddress.email || ''
        },
        fromAddress: {
          firstName: this.fromAddress.firstName,
          lastName: this.fromAddress.lastName,
          firm: this.fromAddress.firm,
          streetAddress: this.fromAddress.streetAddress,
          secondaryAddress: this.fromAddress.secondaryAddress || '',
          city: this.fromAddress.city,
          state: this.fromAddress.state,
          ZIPCode: this.fromAddress.ZIPCode,
          ZIPPlus4: this.fromAddress.ZIPPlus4 || null,
          phone: this.fromAddress.phone || '',
          email: this.fromAddress.email || ''
        },
        packageDescription: {
          mailClass: mailClass,
          rateIndicator: this.getRateIndicator(shippingData.packaging, shippingData.dimensions, shippingData.weight),
          weightUOM: 'lb',
          weight: shippingData.weight,
          dimensionsUOM: 'in',
          length: shippingData.dimensions.length,
          width: shippingData.dimensions.width,
          height: shippingData.dimensions.height,
          processingCategory: this.getProcessingCategory(shippingData.dimensions, shippingData.weight),
          destinationEntryFacilityType: 'NONE',
          mailingDate: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
          extraServices: shippingData.extraServices || [],
          // Add customer reference for order tracking
          customerReference: orderData.orderId ? [{
            referenceNumber: orderData.orderId.toString(),
            printReferenceNumber: true
          }] : []
        },
        imageInfo: {
          imageType: 'PDF',
          labelType: '4X6LABEL',
          receiptOption: 'SEPARATE_PAGE',
          suppressPostage: false,
          suppressMailDate: false
        }
      };
      
      console.log('   Label request prepared');
      console.log(`   Mail Class: ${mailClass}`);
      console.log(`   Rate Indicator: ${labelRequest.packageDescription.rateIndicator}`);
      
      // Call Labels API v3
      // According to spec: requires X-Payment-Authorization-Token header
      // This should be a payment authorization token from Payments API, but OAuth token may work for testing
      // Accept header: application/vnd.usps.labels+json returns vendor format with embedded base64 images
      const response = await axios.post(
        `${this.labelsAPI}/label`,
        labelRequest,
        {
          headers: {
            'Authorization': authHeader,
            'X-Payment-Authorization-Token': authHeader.replace('Bearer ', ''), // Payment token - may need separate payment auth in production
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.usps.labels+json' // Vendor format with embedded base64 images
          },
          timeout: 30000
        }
      );
      
      // Parse response - v3 API returns vendor format (LabelVendorResponse) with embedded base64 images
      const label = this.parseLabelResponse(response.data);
      
      console.log('✅ Shipping label created');
      console.log(`   Tracking Number: ${label.trackingNumber}`);
      console.log(`   Postage: $${label.postage}`);
      if (label.receiptImage) {
        console.log('   Receipt image included');
      }
      
      return label;
      
    } catch (error) {
      console.error('❌ Error creating shipping label (v3):', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        
        // Provide specific guidance for common errors
        if (error.response.status === 401) {
          if (error.response.data?.error?.message?.includes('scope')) {
            throw new Error('USPS API: Insufficient OAuth scope. Please ensure your USPS Developer Portal app has the "labels" scope enabled.');
          } else if (error.response.data?.error?.message?.includes('payment') || error.response.data?.error?.message?.includes('authorization')) {
            throw new Error('USPS API: Payment authorization failed. Please ensure you have a valid payment authorization token from the USPS Payments API.');
          }
        }
      }
      throw new Error(`Failed to create shipping label: ${error.message}`);
    }
  }
  
  /**
   * Validate address using Addresses API v3
   * Based on USPS Addresses API v3 OpenAPI specification
   * Uses GET /address endpoint for address standardization
   */
  async validateAddress(address) {
    try {
      console.log('📍 Validating address with USPS (v3 API)...');
      console.log(`   Address: ${address.street1}, ${address.city}, ${address.state} ${address.zip}`);
      
      // Get OAuth token
      const authHeader = await uspsOAuth.getAuthHeader();
      
      // Extract ZIP code components
      const zipCode = address.zip.replace(/\D/g, '');
      const zip5 = zipCode.substring(0, 5);
      const zipPlus4 = zipCode.substring(5, 9) || null;
      
      // Build query parameters for GET /address endpoint
      // According to spec: Must specify streetAddress, state, and either city or ZIPCode
      const params = new URLSearchParams();
      if (address.firm) {
        params.append('firm', address.firm);
      }
      params.append('streetAddress', address.street1);
      if (address.street2) {
        params.append('secondaryAddress', address.street2);
      }
      if (address.city) {
        params.append('city', address.city);
      }
      params.append('state', address.state);
      if (zip5) {
        params.append('ZIPCode', zip5);
      }
      if (zipPlus4) {
        params.append('ZIPPlus4', zipPlus4);
      }
      if (address.urbanization) {
        params.append('urbanization', address.urbanization);
      }
      
      // Call Addresses API v3 GET /address endpoint
      const response = await axios.get(
        `${this.addressesAPI}/address?${params.toString()}`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      
      // Parse and return validation result
      return this.parseAddressValidationResponse(response.data, address);
      
    } catch (error) {
      console.error('❌ Error validating address:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        
        // Handle specific error cases
        if (error.response.status === 404) {
          // Address not found - return invalid but don't fail shipping
          return {
            isValid: false,
            validatedAddress: address,
            corrections: ['Address not found in USPS database'],
            warnings: ['Address could not be validated. Please verify the address is correct.']
          };
        } else if (error.response.status === 400) {
          // Bad request - invalid input
          const errorDetail = error.response.data?.error?.message || 'Invalid address format';
          return {
            isValid: false,
            validatedAddress: address,
            corrections: [errorDetail],
            warnings: ['Address validation failed due to invalid input.']
          };
        } else if (error.response.status === 401) {
          if (error.response.data?.error?.message?.includes('scope')) {
            console.warn('⚠️ Insufficient OAuth scope for addresses API');
            // Fall back to legacy API if scope issue
            const legacyService = require('./uspsService');
            return await legacyService.validateAddress(address);
          }
        }
      }
      
      // Don't fail shipping if validation fails - return original address
      return {
        isValid: true,
        validatedAddress: address,
        corrections: [],
        warnings: [`Address validation unavailable: ${error.message}`]
      };
    }
  }
  
  /**
   * Track package using Tracking API v3
   */
  async trackPackage(trackingNumber) {
    try {
      console.log(`📮 Tracking USPS package (v3 API): ${trackingNumber}`);
      
      // Get OAuth token
      const authHeader = await uspsOAuth.getAuthHeader();
      
      // Call Tracking API
      const response = await axios.get(
        `${this.trackingAPI}/tracking/${trackingNumber}`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      
      // Parse tracking response
      return this.parseTrackingResponse(response.data);
      
    } catch (error) {
      console.error('❌ Error tracking package (v3):', error.message);
      throw new Error(`Failed to track package: ${error.message}`);
    }
  }
  
  /**
   * Helper: Map packaging type to rate indicator
   */
  getRateIndicator(packaging, dimensions, weight) {
    switch (packaging) {
      case 'envelope':
        return 'FE'; // Flat Rate Envelope
      case 'bubble_envelope':
        return 'FP'; // Padded Flat Rate Envelope
      case 'tshirt_envelope':
        return 'FE'; // Flat Rate Envelope (closest match)
      case 'small_box':
        return 'FS'; // Small Flat Rate Box
      case 'medium_box':
        return 'FB'; // Medium Flat Rate Box
      case 'large_box':
        return 'PL'; // Large Flat Rate Box
      case 'standard_box':
      default:
        return 'SP'; // Single Piece
    }
  }
  
  /**
   * Helper: Determine processing category from dimensions
   */
  getProcessingCategory(dimensions, weight) {
    const maxDim = Math.max(dimensions.length, dimensions.width, dimensions.height);
    
    // Check if any dimension exceeds 12 inches
    if (maxDim > 12) {
      return 'NONSTANDARD';
    }
    
    // Check weight (over 70 lbs is nonstandard, but we cap at 70)
    if (weight > 70) {
      return 'NONSTANDARD';
    }
    
    return 'MACHINABLE';
  }
  
  /**
   * Helper: Map service name to mail class
   */
  mapServiceToMailClass(service) {
    const serviceUpper = (service || '').toUpperCase();
    
    if (serviceUpper.includes('EXPRESS')) {
      return 'PRIORITY_MAIL_EXPRESS';
    } else if (serviceUpper.includes('PRIORITY')) {
      return 'PRIORITY_MAIL';
    } else {
      return 'USPS_GROUND_ADVANTAGE';
    }
  }
  
  /**
   * Transform rates response to match existing format
   * Parses TotalRatesQueryResult according to USPS Prices API v3 OpenAPI spec (version 3.4.24)
   * 
   * Response Schema: TotalRatesQueryResult
   * Structure: {
   *   rateOptions: [
   *     {
   *       totalBasePrice: number,        // Base price including rate, fees, and pound postage
   *       totalPrice: number,             // Total price including extra services (only if extraServices requested)
   *       rates: [                        // Array of RateDetails objects
   *         {
   *           SKU: string,
   *           description: string,
   *           priceType: string,          // RETAIL, COMMERCIAL, CONTRACT, NSA
   *           price: number,              // Postage price
   *           weight: number,              // Calculated weight
   *           dimWeight: number,           // Dimensional weight
   *           fees: [{ name, SKU, price }],
   *           mailClass: string,
   *           zone: string,
   *           productName: string,
   *           productDefinition: string,
   *           processingCategory: string,
   *           rateIndicator: string,
   *           destinationEntryFacilityType: string
   *         }
   *       ],
   *       extraServices: [                // Array of TotalRatesExtraServiceRateDetails (if requested)
   *         {
   *           extraService: string,       // Service code (e.g., "920")
   *           name: string,
   *           SKU: string,
   *           priceType: string,
   *           price: number,
   *           warnings: [{ warningCode, warningDescription }]
   *         }
   *       ]
   *     }
   *   ]
   * }
   */
  transformRatesResponse(data) {
    // Response structure: TotalRatesQueryResult with rateOptions array
    if (!data.rateOptions || !Array.isArray(data.rateOptions)) {
      console.warn('⚠️ No rateOptions in response:', JSON.stringify(data, null, 2));
      return [];
    }
    
    const rates = [];
    
    // Each rateOption contains rates for a specific mail class
    for (const rateOption of data.rateOptions) {
      if (!rateOption.rates || !Array.isArray(rateOption.rates)) {
        continue;
      }
      
      // Process each rate in the rateOption
      for (const rate of rateOption.rates) {
        // Calculate total price according to spec:
        // - If extraServices were requested, use totalPrice (includes base + extra services)
        // - Otherwise, use totalBasePrice (base price only)
        // - Fallback to rate.price if neither is available
        let totalPrice = rateOption.totalPrice; // Includes extra services if requested
        if (totalPrice === undefined || totalPrice === null) {
          totalPrice = rateOption.totalBasePrice || rate.price || 0;
        }
        
        // Note: According to spec, totalPrice already includes extra service prices
        // But we'll add them manually if totalPrice is not provided and extraServices exist
        if (totalPrice === rateOption.totalBasePrice && rateOption.extraServices && Array.isArray(rateOption.extraServices)) {
          const extraServiceTotal = rateOption.extraServices.reduce((sum, es) => sum + (es.price || 0), 0);
          totalPrice += extraServiceTotal;
        }
        
        // Build rate object matching existing format
        rates.push({
          service: this.mapMailClassToService(rate.mailClass),
          serviceName: rate.productName || rate.description || rate.mailClass,
          price: totalPrice,
          estimatedDays: this.estimateDeliveryDays(rate.mailClass),
          SKU: rate.SKU,
          zone: rate.zone || '',
          mailClass: rate.mailClass,
          rateIndicator: rate.rateIndicator || 'SP',
          processingCategory: rate.processingCategory || 'MACHINABLE',
          destinationEntryFacilityType: rate.destinationEntryFacilityType || 'NONE',
          basePrice: rate.price || 0, // Base postage price (from RateDetails)
          totalBasePrice: rateOption.totalBasePrice || rate.price || 0, // Total base price including fees
          fees: rate.fees || [], // Fees array from RateDetails
          extraServices: rateOption.extraServices || [], // Extra services array from RateOption
          productDefinition: rate.productDefinition || '',
          // Include dimensional weight if provided (dimWeight is preferred, dimensionalWeight is deprecated)
          dimensionalWeight: rate.dimWeight || rate.dimensionalWeight || null,
          weight: rate.weight || null,
          // Additional metadata
          priceType: rate.priceType || 'COMMERCIAL',
          startDate: rate.startDate || null,
          endDate: rate.endDate || null
        });
      }
    }
    
    // Sort by price (cheapest first)
    rates.sort((a, b) => a.price - b.price);
    
    return rates;
  }
  
  /**
   * Map mail class to service name
   */
  mapMailClassToService(mailClass) {
    const mapping = {
      'USPS_GROUND_ADVANTAGE': 'USPS Ground Advantage',
      'PRIORITY_MAIL': 'Priority Mail',
      'PRIORITY_MAIL_EXPRESS': 'Priority Mail Express',
      'FIRST_CLASS_PACKAGE_SERVICE': 'First-Class Package Service',
      'PARCEL_SELECT': 'Parcel Select'
    };
    
    return mapping[mailClass] || mailClass;
  }
  
  /**
   * Estimate delivery days based on mail class
   */
  estimateDeliveryDays(mailClass) {
    const estimates = {
      'PRIORITY_MAIL_EXPRESS': 1,
      'PRIORITY_MAIL': 2,
      'USPS_GROUND_ADVANTAGE': 5,
      'FIRST_CLASS_PACKAGE_SERVICE': 5,
      'PARCEL_SELECT': 7
    };
    
    return estimates[mailClass] || 5;
  }
  
  /**
   * Parse label response from v3 API
   * Handles vendor format (application/vnd.usps.labels+json) with embedded base64 images
   * According to OpenAPI spec: LabelVendorResponse schema
   */
  parseLabelResponse(data) {
    // v3 API returns vendor format (LabelVendorResponse) with embedded base64 images
    // Response includes labelMetadata fields plus labelImage and receiptImage as base64 strings
    
    // Check if this is multipart format (has labelMetadata wrapper)
    if (data.labelMetadata) {
      // Multipart format - extract from metadata
      const metadata = data.labelMetadata;
      return {
        trackingNumber: metadata.trackingNumber || '',
        labelImage: data.labelImage || '', // Base64 encoded PDF/image
        receiptImage: data.receiptImage || '', // Base64 encoded receipt (if SEPARATE_PAGE)
        labelFormat: 'PDF', // Default format
        postage: metadata.postage || 0,
        SKU: metadata.SKU || '',
        constructCode: metadata.constructCode || '',
        routingInformation: metadata.routingInformation || '',
        zone: metadata.zone || '',
        serviceTypeCode: metadata.serviceTypeCode || '',
        commitment: metadata.commitment || null,
        extraServices: metadata.extraServices || [],
        fees: metadata.fees || [],
        // Return label data if present
        returnLabel: data.returnLabel ? {
          trackingNumber: data.returnLabel.trackingNumber || '',
          labelImage: data.returnLabel.returnLabelImage || '',
          receiptImage: data.returnLabel.returnReceiptImage || '',
          postage: data.returnLabel.postage || 0
        } : null
      };
    } else {
      // Vendor format (application/vnd.usps.labels+json) - direct LabelVendorResponse
      // Response structure matches LabelMetadata + embedded images
      return {
        trackingNumber: data.trackingNumber || '',
        labelImage: data.labelImage || '', // Base64 encoded PDF/image
        receiptImage: data.receiptImage || '', // Base64 encoded receipt (if SEPARATE_PAGE)
        labelFormat: 'PDF', // Default format
        postage: data.postage || 0,
        SKU: data.SKU || '',
        constructCode: data.constructCode || '',
        routingInformation: data.routingInformation || '',
        zone: data.zone || '',
        serviceTypeCode: data.serviceTypeCode || '',
        commitment: data.commitment || null,
        extraServices: data.extraServices || [],
        fees: data.fees || [],
        // Return label data if present
        returnLabel: data.returnLabel ? {
          trackingNumber: data.returnLabel.trackingNumber || '',
          labelImage: data.returnLabel.returnLabelImage || '',
          receiptImage: data.returnLabel.returnReceiptImage || '',
          postage: data.returnLabel.postage || 0
        } : null
      };
    }
  }
  
  /**
   * Parse address validation response
   * Parses AddressResponse according to USPS Addresses API v3 OpenAPI spec
   */
  parseAddressValidationResponse(data, originalAddress) {
    // Response structure: AddressResponse with address, additionalInfo, corrections, matches, warnings
    if (!data.address || !data.address.ZIPCode) {
      return {
        isValid: false,
        validatedAddress: originalAddress,
        corrections: ['Address not found'],
        warnings: []
      };
    }
    
    const validatedAddress = {
      street1: data.address.streetAddress || originalAddress.street1,
      street2: data.address.secondaryAddress || originalAddress.street2 || '',
      city: data.address.city || originalAddress.city,
      state: data.address.state || originalAddress.state,
      zip: data.address.ZIPCode + (data.address.ZIPPlus4 ? `-${data.address.ZIPPlus4}` : ''),
      zipPlus4: data.address.ZIPPlus4 || null,
      firm: data.firm || originalAddress.firm || null,
      // Include abbreviations if provided
      streetAddressAbbreviation: data.address.streetAddressAbbreviation || null,
      cityAbbreviation: data.address.cityAbbreviation || null
    };
    
    // Parse corrections (array of {code, text} objects)
    const corrections = [];
    if (data.corrections && Array.isArray(data.corrections)) {
      for (const correction of data.corrections) {
        if (typeof correction === 'string') {
          corrections.push(correction);
        } else if (correction.text) {
          corrections.push(`${correction.code}: ${correction.text}`);
        } else if (correction.code) {
          corrections.push(`Code ${correction.code}`);
        }
      }
    }
    
    // Parse matches (array of {code, text} objects)
    const matches = [];
    if (data.matches && Array.isArray(data.matches)) {
      for (const match of data.matches) {
        if (typeof match === 'string') {
          matches.push(match);
        } else if (match.text) {
          matches.push(`${match.code}: ${match.text}`);
        } else if (match.code) {
          matches.push(`Code ${match.code}`);
        }
      }
    }
    
    // Determine if address is valid based on DPV confirmation and matches
    let isValid = true;
    if (data.additionalInfo) {
      // If DPV confirmation is 'N', address is not valid
      if (data.additionalInfo.DPVConfirmation === 'N') {
        isValid = false;
      }
      // If there are corrections indicating issues, mark as potentially invalid
      if (corrections.length > 0 && corrections.some(c => c.includes('32') || c.includes('22'))) {
        isValid = false;
      }
    }
    
    // Build warnings array
    const warnings = [];
    if (data.warnings && Array.isArray(data.warnings)) {
      warnings.push(...data.warnings);
    }
    if (data.additionalInfo) {
      if (data.additionalInfo.DPVConfirmation === 'D' || data.additionalInfo.DPVConfirmation === 'S') {
        warnings.push('Address partially confirmed. Secondary address information may be missing or unconfirmed.');
      }
      if (data.additionalInfo.vacant === 'Y') {
        warnings.push('Address location is currently vacant.');
      }
      if (data.additionalInfo.business === 'Y') {
        warnings.push('This is a business address.');
      }
    }
    
    return {
      isValid: isValid,
      validatedAddress: validatedAddress,
      corrections: corrections,
      matches: matches,
      warnings: warnings,
      additionalInfo: data.additionalInfo || null
    };
  }
  
  /**
   * Parse tracking response
   */
  parseTrackingResponse(data) {
    return {
      trackingNumber: data.trackingNumber || '',
      status: data.status || 'Unknown',
      events: data.events || [],
      estimatedDelivery: data.estimatedDelivery || null,
      service: data.service || ''
    };
  }
}

module.exports = new USPSV3Service();

