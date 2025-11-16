const axios = require('axios');

/**
 * USPS Shipping Service
 * Handles shipping rates, label generation, and tracking
 */
class USPSService {
  constructor() {
    // USPS API credentials from environment
    this.username = process.env.USPS_USERNAME;
    this.password = process.env.USPS_PASSWORD;
    this.userId = process.env.USPS_USER_ID; // For Shipping API
    
    // USPS API endpoints
    this.rateAPI = 'https://secure.shippingapis.com/ShippingAPI.dll';
    this.trackingAPI = 'https://secure.shippingapis.com/ShippingAPI.dll';
    this.labelAPI = 'https://secure.shippingapis.com/ShippingAPI.dll';
    this.addressAPI = 'https://secure.shippingapis.com/ShippingAPI.dll';
    this.postageAdjustmentAPI = 'https://secure.shippingapis.com/ShippingAPI.dll';
    
    // Your business address (from which packages ship)
    this.fromAddress = {
      name: process.env.SHIPPING_FROM_NAME || 'Wicked Donuts',
      street1: process.env.SHIPPING_FROM_STREET1 || '',
      street2: process.env.SHIPPING_FROM_STREET2 || '',
      city: process.env.SHIPPING_FROM_CITY || '',
      state: process.env.SHIPPING_FROM_STATE || '',
      zip: process.env.SHIPPING_FROM_ZIP || '',
      phone: process.env.SHIPPING_FROM_PHONE || ''
    };
  }
  
  /**
   * Get shipping rates for a package
   */
  async getShippingRates(toAddress, weight, dimensions) {
    try {
      console.log('📦 Getting USPS shipping rates...');
      console.log(`   To: ${toAddress.city}, ${toAddress.state} ${toAddress.zip}`);
      console.log(`   Weight: ${weight} lbs`);
      console.log(`   Dimensions: ${dimensions.length}" x ${dimensions.width}" x ${dimensions.height}"`);
      
      // Check if USPS credentials are configured
      if (!this.username) {
        console.error('❌ USPS_USERNAME not configured');
        throw new Error('USPS API credentials not configured. Please set USPS_USERNAME in your .env file.');
      }
      
      // Build USPS RateV4 API request
      const request = this.buildRateRequest(toAddress, weight, dimensions);
      console.log('   Request XML length:', request.length, 'characters');
      
      const response = await axios.get(this.rateAPI, {
        params: {
          API: 'RateV4',
          XML: request
        },
        timeout: 15000, // Increased timeout to 15 seconds
        validateStatus: function (status) {
          return status < 500; // Don't throw for 4xx errors, we'll handle them
        }
      });
      
      // Check for USPS API errors in response
      if (response.status !== 200) {
        console.error('❌ USPS API returned error status:', response.status);
        console.error('   Response data:', response.data);
        throw new Error(`USPS API error: ${response.status} - ${response.data}`);
      }
      
      // Check if response contains error
      if (typeof response.data === 'string' && response.data.includes('<Error>')) {
        const errorMatch = response.data.match(/<Description>([^<]+)<\/Description>/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Unknown USPS API error';
        console.error('❌ USPS API error:', errorMsg);
        throw new Error(`USPS API error: ${errorMsg}`);
      }
      
      // Parse USPS XML response
      const rates = this.parseRateResponse(response.data);
      
      if (rates.length === 0) {
        console.warn('⚠️ No shipping rates found in USPS response');
        console.log('   Response data:', response.data.substring(0, 500));
      }
      
      console.log(`✅ Found ${rates.length} shipping options`);
      return rates;
      
    } catch (error) {
      console.error('❌ Error getting USPS rates:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
      if (error.request) {
        console.error('   Request made but no response received');
        console.error('   Request URL:', error.config?.url);
      }
      throw new Error(`Failed to get shipping rates: ${error.message}`);
    }
  }
  
  /**
   * Generate shipping label
   */
  async createShippingLabel(orderData, shippingData) {
    try {
      console.log('🏷️ Creating USPS shipping label...');
      console.log(`   Order ID: ${orderData.orderId}`);
      console.log(`   Service: ${shippingData.service}`);
      
      // Build USPS Label API request
      const request = this.buildLabelRequest(orderData, shippingData);
      
      const response = await axios.post(this.labelAPI, request, {
        headers: {
          'Content-Type': 'application/xml'
        },
        timeout: 30000
      });
      
      // Parse label response
      const label = this.parseLabelResponse(response.data);
      
      console.log('✅ Shipping label created');
      console.log(`   Tracking Number: ${label.trackingNumber}`);
      
      return label;
      
    } catch (error) {
      console.error('❌ Error creating shipping label:', error.message);
      if (error.response) {
        console.error('   Response:', error.response.data);
      }
      throw new Error(`Failed to create shipping label: ${error.message}`);
    }
  }
  
  /**
   * Validate and standardize address using USPS Address Validation API
   */
  async validateAddress(address) {
    try {
      console.log('📍 Validating address with USPS...');
      console.log(`   Address: ${address.street1}, ${address.city}, ${address.state} ${address.zip}`);
      
      // Check if USPS credentials are configured
      if (!this.username) {
        console.warn('⚠️ USPS_USERNAME not configured, skipping address validation');
        return {
          isValid: true,
          validatedAddress: address,
          corrections: [],
          warnings: []
        };
      }
      
      // Build AddressValidate API request
      const request = this.buildAddressValidationRequest(address);
      
      const response = await axios.get(this.addressAPI, {
        params: {
          API: 'Verify',
          XML: request
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      // Check for errors
      if (response.status !== 200) {
        console.error('❌ USPS Address API error:', response.status);
        throw new Error(`USPS Address API error: ${response.status}`);
      }
      
      // Parse response
      const validationResult = this.parseAddressValidationResponse(response.data, address);
      
      if (validationResult.isValid) {
        console.log('✅ Address validated successfully');
        if (validationResult.validatedAddress.zipPlus4) {
          console.log(`   ZIP+4: ${validationResult.validatedAddress.zipPlus4}`);
        }
      } else {
        console.warn('⚠️ Address validation issues found');
        if (validationResult.corrections.length > 0) {
          console.warn('   Corrections:', validationResult.corrections);
        }
      }
      
      return validationResult;
      
    } catch (error) {
      console.error('❌ Error validating address:', error.message);
      // Don't fail shipping if validation fails - just return original address
      return {
        isValid: true,
        validatedAddress: address,
        corrections: [],
        warnings: [`Address validation unavailable: ${error.message}`]
      };
    }
  }
  
  /**
   * Build AddressValidate API request XML
   */
  buildAddressValidationRequest(address) {
    // Extract ZIP code (5 digits)
    const zip5 = address.zip.replace(/\D/g, '').substring(0, 5);
    const zip4 = address.zip.replace(/\D/g, '').substring(5, 9);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<AddressValidateRequest USERID="${this.username}">
  <Address ID="0">
    <Address1>${this.escapeXml(address.street2 || '')}</Address1>
    <Address2>${this.escapeXml(address.street1 || '')}</Address2>
    <City>${this.escapeXml(address.city || '')}</City>
    <State>${this.escapeXml(address.state || '')}</State>
    <Zip5>${zip5}</Zip5>
    <Zip4>${zip4 || ''}</Zip4>
  </Address>
</AddressValidateRequest>`;
  }
  
  /**
   * Parse AddressValidate API response
   */
  parseAddressValidationResponse(xmlData, originalAddress) {
    const result = {
      isValid: true,
      validatedAddress: { ...originalAddress },
      corrections: [],
      warnings: [],
      additionalInfo: {}
    };
    
    try {
      // Check for errors
      if (typeof xmlData === 'string' && xmlData.includes('<Error>')) {
        const errorMatch = xmlData.match(/<Description>([^<]+)<\/Description>/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Unknown error';
        result.isValid = false;
        result.corrections.push({
          code: 'ERROR',
          text: errorMsg
        });
        return result;
      }
      
      // Extract validated address components
      const addressMatch = xmlData.match(/<Address[^>]*>([\s\S]*?)<\/Address>/);
      if (addressMatch) {
        const addressXml = addressMatch[1];
        
        // Extract street address
        const street2Match = addressXml.match(/<Address2>([^<]+)<\/Address2>/);
        const street1Match = addressXml.match(/<Address1>([^<]+)<\/Address1>/);
        
        if (street1Match) {
          result.validatedAddress.street1 = street1Match[1].trim();
        }
        if (street2Match && street2Match[1].trim()) {
          result.validatedAddress.street2 = street2Match[1].trim();
        }
        
        // Extract city
        const cityMatch = addressXml.match(/<City>([^<]+)<\/City>/);
        if (cityMatch) {
          result.validatedAddress.city = cityMatch[1].trim();
        }
        
        // Extract state
        const stateMatch = addressXml.match(/<State>([^<]+)<\/State>/);
        if (stateMatch) {
          result.validatedAddress.state = stateMatch[1].trim();
        }
        
        // Extract ZIP codes
        const zip5Match = addressXml.match(/<Zip5>([^<]+)<\/Zip5>/);
        const zip4Match = addressXml.match(/<Zip4>([^<]+)<\/Zip4>/);
        
        if (zip5Match) {
          const zip5 = zip5Match[1].trim();
          const zip4 = zip4Match ? zip4Match[1].trim() : '';
          result.validatedAddress.zip = zip4 ? `${zip5}-${zip4}` : zip5;
          result.validatedAddress.zipPlus4 = zip4 || null;
        }
        
        // Extract additional info
        const dpvMatch = addressXml.match(/<DPVConfirmation>([^<]+)<\/DPVConfirmation>/);
        if (dpvMatch) {
          result.additionalInfo.DPVConfirmation = dpvMatch[1].trim();
          // DPVConfirmation: Y = Confirmed, N = Not Confirmed, S = Confirmed with secondary
          if (dpvMatch[1].trim() !== 'Y' && dpvMatch[1].trim() !== 'S') {
            result.warnings.push('Address could not be confirmed by USPS');
          }
        }
        
        // Extract corrections
        const correctionMatches = xmlData.match(/<ReturnText>([^<]+)<\/ReturnText>/g);
        if (correctionMatches) {
          correctionMatches.forEach(match => {
            const text = match.replace(/<\/?ReturnText>/g, '');
            if (text && !text.includes('Default address')) {
              result.corrections.push({
                code: 'CORRECTION',
                text: text.trim()
              });
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error parsing address validation response:', error);
      result.warnings.push('Could not parse validation response');
    }
    
    return result;
  }
  
  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Track package
   */
  async trackPackage(trackingNumber) {
    try {
      console.log(`📮 Tracking USPS package: ${trackingNumber}`);
      
      const request = this.buildTrackingRequest(trackingNumber);
      
      const response = await axios.get(this.trackingAPI, {
        params: {
          API: 'TrackV2',
          XML: request
        },
        timeout: 10000
      });
      
      const tracking = this.parseTrackingResponse(response.data);
      
      console.log(`✅ Tracking info retrieved: ${tracking.status}`);
      return tracking;
      
    } catch (error) {
      console.error('❌ Error tracking package:', error.message);
      throw new Error(`Failed to track package: ${error.message}`);
    }
  }
  
  /**
   * Build RateV4 API request XML
   */
  buildRateRequest(toAddress, weight, dimensions) {
    const weightOz = Math.max(1, Math.ceil(weight * 16)); // Convert lbs to oz, minimum 1 oz
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<RateV4Request USERID="${this.username}">
  <Package ID="1">
    <Service>ALL</Service>
    <ZipOrigination>${this.fromAddress.zip}</ZipOrigination>
    <ZipDestination>${toAddress.zip}</ZipDestination>
    <Pounds>${Math.floor(weight)}</Pounds>
    <Ounces>${weightOz % 16}</Ounces>
    <Container>RECTANGULAR</Container>
    <Size>REGULAR</Size>
    <Width>${dimensions.width || 6}</Width>
    <Length>${dimensions.length || 6}</Length>
    <Height>${dimensions.height || 4}</Height>
    <Girth>${(dimensions.width + dimensions.height) * 2 || 20}</Girth>
    <Machinable>true</Machinable>
  </Package>
</RateV4Request>`;
  }
  
  /**
   * Build Label API request XML
   */
  buildLabelRequest(orderData, shippingData) {
    const { toAddress, service, weight, dimensions, packaging } = shippingData;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<eVSRequest USERID="${this.username}">
  <Option>1</Option>
  <Revision>2</Revision>
  <ImageParameters>
    <ImageParameter>PDF</ImageParameter>
  </ImageParameters>
  <FromName>${this.fromAddress.name}</FromName>
  <FromFirm></FromFirm>
  <FromAddress1>${this.fromAddress.street1}</FromAddress1>
  <FromAddress2>${this.fromAddress.street2 || ''}</FromAddress2>
  <FromCity>${this.fromAddress.city}</FromCity>
  <FromState>${this.fromAddress.state}</FromState>
  <FromZip5>${this.fromAddress.zip.substring(0, 5)}</FromZip5>
  <FromZip4>${this.fromAddress.zip.length > 5 ? this.fromAddress.zip.substring(5) : ''}</FromZip4>
  <FromPhone>${this.fromAddress.phone}</FromPhone>
  <ToName>${toAddress.name}</ToName>
  <ToFirm></ToFirm>
  <ToAddress1>${toAddress.street1}</ToAddress1>
  <ToAddress2>${toAddress.street2 || ''}</ToAddress2>
  <ToCity>${toAddress.city}</ToCity>
  <ToState>${toAddress.state}</ToState>
  <ToZip5>${toAddress.zip.substring(0, 5)}</ToZip5>
  <ToZip4>${toAddress.zip.length > 5 ? toAddress.zip.substring(5) : ''}</ToZip4>
  <ToPhone>${toAddress.phone || ''}</ToPhone>
  <WeightInOunces>${Math.max(1, Math.ceil(weight * 16))}</WeightInOunces>
  <ServiceType>${service}</ServiceType>
  <Container>${this.getContainerType(packaging)}</Container>
  <Width>${dimensions.width || 6}</Width>
  <Length>${dimensions.length || 6}</Length>
  <Height>${dimensions.height || 4}</Height>
  <Girth>${(dimensions.width + dimensions.height) * 2 || 20}</Girth>
  <Machinable>true</Machinable>
  <LabelDate>${new Date().toISOString().split('T')[0]}</LabelDate>
  <CustomerRefNo>${orderData.orderId}</CustomerRefNo>
  <AddressServiceRequested>false</AddressServiceRequested>
  <SenderName>${this.fromAddress.name}</SenderName>
  <SenderEMail>${process.env.SHIPPING_FROM_EMAIL || ''}</SenderEMail>
  <RecipientName>${toAddress.name}</RecipientName>
  <RecipientEMail>${toAddress.email || ''}</RecipientEMail>
</eVSRequest>`;
  }
  
  /**
   * Build tracking request XML
   */
  buildTrackingRequest(trackingNumber) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<TrackFieldRequest USERID="${this.username}">
  <TrackID ID="${trackingNumber}"></TrackID>
</TrackFieldRequest>`;
  }
  
  /**
   * Parse RateV4 response
   */
  parseRateResponse(xmlData) {
    const rates = [];
    
    // Parse XML (simplified - in production, use proper XML parser)
    const rateMatches = xmlData.match(/<Postage CLASSID="(\d+)"[^>]*>[\s\S]*?<Rate>([\d.]+)<\/Rate>/g);
    
    if (rateMatches) {
      rateMatches.forEach(match => {
        const classId = match.match(/CLASSID="(\d+)"/)?.[1];
        const rate = parseFloat(match.match(/<Rate>([\d.]+)<\/Rate>/)?.[1] || '0');
        const service = match.match(/<MailService>([^<]+)<\/MailService>/)?.[1] || '';
        
        if (classId && rate > 0) {
          rates.push({
            service: this.mapServiceName(service),
            serviceCode: classId,
            rate: rate,
            deliveryDays: this.estimateDeliveryDays(classId),
            description: service.trim()
          });
        }
      });
    }
    
    // Sort by rate (cheapest first)
    rates.sort((a, b) => a.rate - b.rate);
    
    return rates;
  }
  
  /**
   * Parse label response
   */
  parseLabelResponse(xmlData) {
    // Parse XML response
    const trackingMatch = xmlData.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
    const labelMatch = xmlData.match(/<LabelImage>([^<]+)<\/LabelImage>/);
    
    return {
      trackingNumber: trackingMatch?.[1] || '',
      labelImage: labelMatch?.[1] || '', // Base64 encoded PDF
      labelFormat: 'PDF'
    };
  }
  
  /**
   * Parse tracking response
   */
  parseTrackingResponse(xmlData) {
    const statusMatch = xmlData.match(/<Event>[\s\S]*?<EventCity>([^<]+)<\/EventCity>[\s\S]*?<EventState>([^<]+)<\/EventState>[\s\S]*?<EventDate>([^<]+)<\/EventDate>[\s\S]*?<EventTime>([^<]+)<\/EventTime>[\s\S]*?<Event>[\s\S]*?<Description>([^<]+)<\/Description>/);
    
    return {
      trackingNumber: xmlData.match(/<TrackID ID="([^"]+)"/)?.[1] || '',
      status: statusMatch?.[5] || 'In Transit',
      location: statusMatch ? `${statusMatch[1]}, ${statusMatch[2]}` : '',
      date: statusMatch?.[3] || '',
      time: statusMatch?.[4] || ''
    };
  }
  
  /**
   * Map USPS service codes to friendly names
   */
  mapServiceName(service) {
    const serviceLower = service.toLowerCase();
    
    if (serviceLower.includes('priority')) {
      return 'PRIORITY';
    } else if (serviceLower.includes('first-class')) {
      return 'FIRST_CLASS';
    } else if (serviceLower.includes('parcel')) {
      return 'PARCEL_SELECT';
    } else if (serviceLower.includes('media')) {
      return 'MEDIA_MAIL';
    } else if (serviceLower.includes('express')) {
      return 'EXPRESS';
    }
    
    return 'PRIORITY'; // Default
  }
  
  /**
   * Estimate delivery days based on service
   */
  estimateDeliveryDays(serviceCode) {
    const code = parseInt(serviceCode);
    
    // USPS service codes
    if (code === 1) return 1; // Express Mail
    if (code === 2 || code === 3) return 2; // Priority Mail
    if (code === 15 || code === 16) return 3; // First-Class
    if (code === 4 || code === 5) return 5; // Parcel Select
    
    return 3; // Default
  }
  
  /**
   * Get container type for packaging
   */
  getContainerType(packaging) {
    switch (packaging) {
      // Merchandise packaging
      case 'envelope':
        return 'FLAT RATE ENVELOPE';
      case 'bubble_envelope':
        return 'PADDED FLAT RATE ENVELOPE';
      case 'tshirt_envelope':
        return 'TYVEK ENVELOPE';
      case 'small_box':
        return 'SMALL FLAT RATE BOX';
      case 'medium_box':
        return 'MEDIUM FLAT RATE BOX';
      case 'large_box':
        return 'LARGE FLAT RATE BOX';
      
      // Food-safe packaging (use rectangular boxes, not flat rate)
      case 'food_small_box':
      case 'food_medium_box':
      case 'food_large_box':
      case 'insulated_box':
        return 'RECTANGULAR'; // Food boxes need custom dimensions, not flat rate
      
      case 'standard_box':
      default:
        return 'RECTANGULAR';
    }
  }
  
  /**
   * Calculate package weight from items
   */
  calculateWeight(items) {
    // Estimate weight based on product types
    let totalWeight = 0;
    
    items.forEach(item => {
      const productName = item.productName.toLowerCase();
      let itemWeight = 0.5; // Default 0.5 lbs per item
      
      // Food items (donuts, drinks)
      if (productName.includes('donut') || productName.includes('doughnut')) {
        itemWeight = 0.15; // ~2.4 oz per donut
      } else if (productName.includes('drink') || productName.includes('coffee') || productName.includes('latte')) {
        itemWeight = 0.5; // Drinks are typically not shipped, but if they are
      }
      // Merchandise items
      else if (productName.includes('t-shirt') || productName.includes('tshirt')) {
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
    
    // Add packaging weight (food-safe boxes are heavier)
    // This will be adjusted based on packaging type in calculateDimensions
    totalWeight += 0.2; // Base packaging weight
    
    return Math.max(0.1, totalWeight); // Minimum 0.1 lbs
  }
  
  /**
   * Get postage adjustment information for a tracking number
   * Used to check for postage discrepancies or adjustments
   */
  async getPostageAdjustment(trackingNumber) {
    try {
      console.log(`💰 Checking postage adjustment for: ${trackingNumber}`);
      
      // Check if USPS credentials are configured
      if (!this.username) {
        throw new Error('USPS API credentials not configured');
      }
      
      // Build Postage Adjustment API request
      const request = this.buildPostageAdjustmentRequest(trackingNumber);
      
      const response = await axios.get(this.postageAdjustmentAPI, {
        params: {
          API: 'PostageAdjustment',
          XML: request
        },
        timeout: 15000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      // Check for errors
      if (response.status !== 200) {
        console.error('❌ USPS Postage Adjustment API error:', response.status);
        throw new Error(`USPS Postage Adjustment API error: ${response.status}`);
      }
      
      // Parse response
      const adjustment = this.parsePostageAdjustmentResponse(response.data);
      
      if (adjustment) {
        console.log(`✅ Postage adjustment retrieved`);
        console.log(`   Status: ${adjustment.adjustmentStatus}`);
        console.log(`   Adjustment: $${adjustment.postageAdjustment || 0}`);
      }
      
      return adjustment;
      
    } catch (error) {
      console.error('❌ Error getting postage adjustment:', error.message);
      throw new Error(`Failed to get postage adjustment: ${error.message}`);
    }
  }
  
  /**
   * Build Postage Adjustment API request XML
   */
  buildPostageAdjustmentRequest(trackingNumber) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<PostageAdjustmentRequest USERID="${this.username}">
  <TrackingNumber>${trackingNumber}</TrackingNumber>
</PostageAdjustmentRequest>`;
  }
  
  /**
   * Parse Postage Adjustment API response
   */
  parsePostageAdjustmentResponse(xmlData) {
    try {
      const adjustment = {
        trackingNumber: null,
        manifestNumber: null,
        rootCause: [],
        pricingCharacteristics: [],
        USPSPackagingBarcode: null,
        postageAdjustment: 0,
        totalPostage: { claimed: 0, assessed: 0 },
        basePostage: { claimed: 0, assessed: 0 },
        fees: [],
        accountNumber: null,
        transactionID: null,
        earliestScanDate: null,
        MID: null,
        CRID: null,
        adjustmentStatus: null
      };
      
      // Extract tracking number
      const trackingMatch = xmlData.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
      if (trackingMatch) {
        adjustment.trackingNumber = trackingMatch[1].trim();
      }
      
      // Extract manifest number
      const manifestMatch = xmlData.match(/<ManifestNumber>([^<]+)<\/ManifestNumber>/);
      if (manifestMatch) {
        adjustment.manifestNumber = manifestMatch[1].trim();
      }
      
      // Extract root causes
      const rootCauseMatches = xmlData.match(/<RootCause>([^<]+)<\/RootCause>/g);
      if (rootCauseMatches) {
        adjustment.rootCause = rootCauseMatches.map(match => 
          match.replace(/<\/?RootCause>/g, '').trim()
        );
      }
      
      // Extract postage adjustment
      const adjustmentMatch = xmlData.match(/<PostageAdjustment>([^<]+)<\/PostageAdjustment>/);
      if (adjustmentMatch) {
        adjustment.postageAdjustment = parseFloat(adjustmentMatch[1].trim()) || 0;
      }
      
      // Extract total postage
      const totalClaimedMatch = xmlData.match(/<TotalPostageClaimed>([^<]+)<\/TotalPostageClaimed>/);
      const totalAssessedMatch = xmlData.match(/<TotalPostageAssessed>([^<]+)<\/TotalPostageAssessed>/);
      if (totalClaimedMatch) {
        adjustment.totalPostage.claimed = parseFloat(totalClaimedMatch[1].trim()) || 0;
      }
      if (totalAssessedMatch) {
        adjustment.totalPostage.assessed = parseFloat(totalAssessedMatch[1].trim()) || 0;
      }
      
      // Extract base postage
      const baseClaimedMatch = xmlData.match(/<BasePostageClaimed>([^<]+)<\/BasePostageClaimed>/);
      const baseAssessedMatch = xmlData.match(/<BasePostageAssessed>([^<]+)<\/BasePostageAssessed>/);
      if (baseClaimedMatch) {
        adjustment.basePostage.claimed = parseFloat(baseClaimedMatch[1].trim()) || 0;
      }
      if (baseAssessedMatch) {
        adjustment.basePostage.assessed = parseFloat(baseAssessedMatch[1].trim()) || 0;
      }
      
      // Extract fees
      const feeMatches = xmlData.match(/<Fee>[\s\S]*?<\/Fee>/g);
      if (feeMatches) {
        adjustment.fees = feeMatches.map(feeXml => {
          const fee = {
            name: '',
            claimedPostage: 0,
            assessedPostage: 0
          };
          
          const nameMatch = feeXml.match(/<FeeName>([^<]+)<\/FeeName>/);
          const claimedMatch = feeXml.match(/<FeeClaimedPostage>([^<]+)<\/FeeClaimedPostage>/);
          const assessedMatch = feeXml.match(/<FeeAssessedPostage>([^<]+)<\/FeeAssessedPostage>/);
          
          if (nameMatch) fee.name = nameMatch[1].trim();
          if (claimedMatch) fee.claimedPostage = parseFloat(claimedMatch[1].trim()) || 0;
          if (assessedMatch) fee.assessedPostage = parseFloat(assessedMatch[1].trim()) || 0;
          
          return fee;
        });
      }
      
      // Extract adjustment status
      const statusMatch = xmlData.match(/<AdjustmentStatus>([^<]+)<\/AdjustmentStatus>/);
      if (statusMatch) {
        adjustment.adjustmentStatus = statusMatch[1].trim();
      }
      
      // Extract other fields
      const accountMatch = xmlData.match(/<AccountNumber>([^<]+)<\/AccountNumber>/);
      const transactionMatch = xmlData.match(/<TransactionID>([^<]+)<\/TransactionID>/);
      const scanDateMatch = xmlData.match(/<EarliestScanDate>([^<]+)<\/EarliestScanDate>/);
      const midMatch = xmlData.match(/<MID>([^<]+)<\/MID>/);
      const cridMatch = xmlData.match(/<CRID>([^<]+)<\/CRID>/);
      const barcodeMatch = xmlData.match(/<USPSPackagingBarcode>([^<]+)<\/USPSPackagingBarcode>/);
      
      if (accountMatch) adjustment.accountNumber = accountMatch[1].trim();
      if (transactionMatch) adjustment.transactionID = transactionMatch[1].trim();
      if (scanDateMatch) adjustment.earliestScanDate = scanDateMatch[1].trim();
      if (midMatch) adjustment.MID = midMatch[1].trim();
      if (cridMatch) adjustment.CRID = cridMatch[1].trim();
      if (barcodeMatch) adjustment.USPSPackagingBarcode = barcodeMatch[1].trim();
      
      // Extract pricing characteristics
      const pricingMatches = xmlData.match(/<PricingCharacteristic>[\s\S]*?<\/PricingCharacteristic>/g);
      if (pricingMatches) {
        adjustment.pricingCharacteristics = pricingMatches.map(pcXml => {
          const pc = {
            pricingCharacteristic: '',
            claimed: '',
            assessed: ''
          };
          
          const charMatch = pcXml.match(/<PricingCharacteristicType>([^<]+)<\/PricingCharacteristicType>/);
          const claimedMatch = pcXml.match(/<Claimed>([^<]+)<\/Claimed>/);
          const assessedMatch = pcXml.match(/<Assessed>([^<]+)<\/Assessed>/);
          
          if (charMatch) pc.pricingCharacteristic = charMatch[1].trim();
          if (claimedMatch) pc.claimed = claimedMatch[1].trim();
          if (assessedMatch) pc.assessed = assessedMatch[1].trim();
          
          return pc;
        });
      }
      
      return adjustment;
      
    } catch (error) {
      console.error('Error parsing postage adjustment response:', error);
      return null;
    }
  }
  
  /**
   * Calculate package dimensions from items
   */
  calculateDimensions(items, packaging) {
    // Default dimensions based on packaging type
    switch (packaging) {
      case 'envelope':
        return { length: 12, width: 9, height: 1 };
      case 'bubble_envelope':
        return { length: 12.5, width: 9.5, height: 1.5 }; // Priority Mail Flat Rate Padded Envelope
      case 'tshirt_envelope':
        return { length: 11, width: 15, height: 1 }; // Tyvek Envelope
      case 'small_box':
        return { length: 8, width: 6, height: 4 };
      case 'medium_box':
        return { length: 11, width: 8, height: 5 };
      case 'large_box':
        return { length: 12, width: 12, height: 6 };
      
      // Food-safe packaging (insulated boxes with padding)
      case 'food_small_box':
        return { length: 10, width: 8, height: 4 }; // Small food-safe box (1-3 donuts)
      case 'food_medium_box':
        return { length: 12, width: 10, height: 5 }; // Medium food-safe box (4-6 donuts)
      case 'food_large_box':
        return { length: 14, width: 12, height: 6 }; // Large food-safe box (7-12 donuts)
      case 'insulated_box':
        return { length: 14, width: 12, height: 7 }; // Insulated box with gel packs (6-12 donuts)
      
      case 'standard_box':
      default:
        // Calculate based on item count and type
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const hasFood = items.some(item => {
          const name = item.productName.toLowerCase();
          return name.includes('donut') || name.includes('doughnut') || name.includes('drink');
        });
        
        if (hasFood) {
          // Food items need food-safe boxes
          if (itemCount <= 3) {
            return { length: 10, width: 8, height: 4 };
          } else if (itemCount <= 6) {
            return { length: 12, width: 10, height: 5 };
          } else {
            return { length: 14, width: 12, height: 6 };
          }
        } else {
          // Regular merchandise
          if (itemCount <= 2) {
            return { length: 10, width: 8, height: 4 };
          } else if (itemCount <= 5) {
            return { length: 12, width: 10, height: 5 };
          } else {
            return { length: 14, width: 12, height: 6 };
          }
        }
    }
  }
}

// Export singleton instance
module.exports = new USPSService();


