/**
 * WixService.js
 * A comprehensive Wix member verification system
 * 
 * Following the Ethereal Engineering Technical Codex principles:
 * - Boundary Protection: Implementing strict interface contracts for the Wix API
 * - Fail Fast and Learn: Using fallback mechanisms and detailed error reporting
 * - Separation of Concerns: Maintaining clear boundaries between components
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Read config from file (for security, do NOT hardcode in source)
const CONFIG_PATH = path.join(__dirname, '../../wix.config.json');
let WIX_API_KEY = '';
let WIX_SITE_ID = '';
let WIX_CLIENT_ID = '';

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    WIX_API_KEY = config.apiKey;
    WIX_SITE_ID = config.siteId;
    WIX_CLIENT_ID = config.clientId;
    console.log('Loaded Wix config with Site ID:', WIX_SITE_ID);
  } catch (e) {
    console.error('Error loading Wix config:', e.message);
  }
}

// Wix API endpoints
const WIX_API_BASE = 'https://www.wixapis.com';
const CONTACTS_API = `${WIX_API_BASE}/contacts/v4/contacts`;
// Updated Members API endpoint
const MEMBERS_API = `${WIX_API_BASE}/members/v1/members`;
// Updated pricing plans API endpoint based on latest Wix API structure
const PRICING_PLANS_API = `${WIX_API_BASE}/pricing-plans/v2/subscriptions`;
// Orders API endpoint
const ORDERS_API = `${WIX_API_BASE}/pricing-plans/v2/orders`;

// For debugging
const logApiCall = (endpoint, method, params) => {
  console.log(`Calling Wix API: ${method} ${endpoint}`);
  console.log('Params:', JSON.stringify(params, null, 2));
}

/**
 * Convert a string to title case (first letter of each word capitalized, rest lowercase)
 * This helps with matching names from Scan-ID (all caps) to Wix (proper case)
 */
const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  /**
   * Lookup Wix member by first name, last name, and DOB
   * Returns an array of matching profiles with source information
   * 
   * Following the Ethereal Engineering Technical Codex principles:
   * - Boundary Protection: Implementing strict interface contracts for the Wix API
   * - Fail Fast and Learn: Using fallback mechanisms and detailed error reporting
   * - Separation of Concerns: Maintaining clear boundaries between components
   */
  async findMember({ firstName, lastName, dateOfBirth }) {
    if (!WIX_API_KEY) {
      return { success: false, error: 'Wix API key not set. Please add it to wix.config.json.' };
    }
    
    // Validate that we have at least some search criteria
    if ((!firstName || firstName.trim() === '') && 
        (!lastName || lastName.trim() === '') && 
        (!dateOfBirth || dateOfBirth.trim() === '')) {
      return { 
        success: false, 
        error: 'At least one search parameter (firstName, lastName, or dateOfBirth) is required' 
      };
    }
    
    try {
      // Convert names to title case for better matching with Wix
      const formattedFirstName = toTitleCase(firstName);
      const formattedLastName = toTitleCase(lastName);
      
      // Also create variations of the first name to handle multi-part first names
      const firstNameParts = formattedFirstName.split(' ');
      const firstNameVariations = [];
      
      // Add the full formatted first name
      firstNameVariations.push(formattedFirstName);
      
      // Add each part of the first name separately
      firstNameParts.forEach(part => {
        if (part.length > 1) { // Only add parts that are actual names (more than 1 character)
          firstNameVariations.push(part);
        }
      });
      
      // If the first name has multiple parts, also try just the first part
      if (firstNameParts.length > 1) {
        firstNameVariations.push(firstNameParts[0]);
      }
      
      // Initialize results array
      const results = [];
      let foundExactMatch = false;
      
      // Get the WixSdkAdapter instance
      const { adapter } = require('./WixSdkAdapter');
      
      // Initialize the adapter if not already initialized
      await adapter.initialize();
      
      console.log('[WixService] Searching for member using SDK:', {
        firstName: formattedFirstName,
        lastName: formattedLastName,
        dateOfBirth
      });
      
      // Use the SDK to query members collection
      const membersQuery = await adapter.client.items
        .queryDataItems({
          dataCollectionId: 'Members'
        })
        .eq('status', 'ACTIVE')
        .find();
      
      console.log(`[WixService] Found ${membersQuery.items.length} active members`);
      
      // Filter members based on our search criteria
      const matchingMembers = membersQuery.items.filter(member => {
        // Check if member has contact info
        if (!member.contactDetails) return false;
        
        // Extract member details
        const memberFirstName = member.contactDetails.firstName || '';
        const memberLastName = member.contactDetails.lastName || '';
        const memberDob = member.dateOfBirth || '';
        
        // Check for name match (try variations of first name)
        const firstNameMatch = firstNameVariations.some(variation => 
          memberFirstName.toLowerCase().includes(variation.toLowerCase()));
        
        const lastNameMatch = formattedLastName && 
          memberLastName.toLowerCase().includes(formattedLastName.toLowerCase());
        
        // Check for DOB match if provided
        let dobMatch = true; // Default to true if no DOB provided
        if (dateOfBirth && dateOfBirth.trim() !== '') {
          // Format the DOB for comparison
          const formattedDob = dateOfBirth.replace(/\//g, '-');
          dobMatch = memberDob === formattedDob;
        }
        
        // Return true if we have matches on the provided criteria
        return (firstNameMatch || !formattedFirstName) && 
               (lastNameMatch || !formattedLastName) && 
               dobMatch;
      });
      
      console.log(`[WixService] Found ${matchingMembers.length} matching members`);
      
      // Process matching members
      for (const member of matchingMembers) {
        const contactInfo = member.contactDetails || {};
        const profile = {
          id: member._id,
          source: 'wix-sdk',
          firstName: contactInfo.firstName || '',
          lastName: contactInfo.lastName || '',
          fullName: `${contactInfo.firstName || ''} ${contactInfo.lastName || ''}`.trim(),
          email: contactInfo.email || '',
          phone: contactInfo.phone || '',
          dateOfBirth: member.dateOfBirth || '',
          status: member.status || '',
          createdDate: member._createdDate || '',
          membershipStatus: member.status || '',
          extendedFields: member.extendedFields || {}
        };
        
        // Check if this is an exact match
        const exactFirstNameMatch = contactInfo.firstName && 
          contactInfo.firstName.toLowerCase() === formattedFirstName.toLowerCase();
        const exactLastNameMatch = contactInfo.lastName && 
          contactInfo.lastName.toLowerCase() === formattedLastName.toLowerCase();
        const exactDobMatch = dateOfBirth && member.dateOfBirth === dateOfBirth;
        
        if (exactFirstNameMatch && exactLastNameMatch && exactDobMatch) {
          foundExactMatch = true;
          // Add to the beginning of the results array
          results.unshift(profile);
        } else {
          // Add to the end of the results array
          results.push(profile);
        }
      }
      
      // Return results (even if empty)
      return {
        success: true,
        members: results,
        count: results.length,
        exactMatch: foundExactMatch,
        message: results.length > 0 
          ? `Found ${results.length} matching members${foundExactMatch ? ' (with exact match)' : ''}`
          : 'No matching members found'
      };
      
    } catch (err) {
      console.error('[WixService] Error finding member:', err);
      return { 
        success: false, 
        error: `Error finding member: ${err.message}`,
        details: err.stack
      };
    }
  },
  
  /**
   * Get pricing plans for a member
   * Returns pricing plan information for the specified member
   * 
   * Following the Ethereal Engineering Technical Codex principles:
   * - Boundary Protection: Implementing strict interface contracts for the Wix API
   * - Fail Fast and Learn: Using fallback mechanisms and detailed error reporting
   */
  async getMemberPricingPlans(memberId) {
    if (!WIX_API_KEY) {
      return { success: false, error: 'Wix API key not set. Please add it to wix.config.json.' };
    }
    
    if (!memberId) {
      return { success: false, error: 'Member ID is required' };
    }
    
    try {
      console.log(`Getting pricing plans for member: ${memberId}`);
      
      // Following the memory about correct API request structure
      // Wix REST APIs expect query parameters directly in the request body, not nested under a "query" object
      const url = `${PRICING_PLANS_API}/query`;
      
      // Properly structure the query according to Wix API requirements
      const data = {
        // Direct structure without nesting under 'query'
        filter: {
          // Use 'buyerInfo.memberId' instead of just 'memberId' based on Wix API structure
          'buyerInfo.memberId': memberId
        },
        paging: { limit: 10 },
        // Include necessary fields
        fields: [
          "id",
          "status",
          "planName",
          "pricingPlanId",
          "buyerInfo",
          "startDate",
          "endDate",
          "autoRenew"
        ]
      };
      
      console.log('[WixService] Pricing Plan API request for memberId:', memberId);
      console.log('[WixService] Request data:', JSON.stringify(data, null, 2));
      
      logApiCall(url, 'POST', data);
      
      const response = await axios.post(
        url,
        data,
        {
          headers: {
            'Authorization': WIX_API_KEY,
            'Content-Type': 'application/json',
            'wix-site-id': WIX_SITE_ID
          }
        }
      );
      
      console.log('Pricing Plans API response:', response.data);
      
      return {
        success: true,
        plans: response.data.memberSubscriptions || [],
        planCount: response.data.memberSubscriptions?.length || 0,
        pagingMetadata: response.data.pagingMetadata || {}
      };
    } catch (err) {
      console.error('Pricing Plans API error:', err);
      
      // Extract error details from Axios error
      const errorDetails = err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : { message: err.message };
      
      return { 
        success: false, 
        error: `Error getting pricing plans: ${err.message}`,
        details: errorDetails
      };
    }
  },
  
  /**
   * List pricing plan orders
   * Retrieves a list of up to 50 pricing plan orders with optional filtering and sorting
   * @param {Object} options - Options for filtering and sorting orders
   * @param {Object} options.filter - Filter criteria for orders
   * @param {Object} options.sort - Sorting options (fieldName: 'createdDate'|'endDate', direction: 'ASC'|'DESC')
   * @param {Object} options.paging - Pagination options (limit, offset)
   * @returns {Promise<Object>} - List of orders and pagination metadata
   */
  async listOrders(options = {}) {
    if (!WIX_API_KEY) {
      return { success: false, error: 'Wix API key not set. Please add it to wix.config.json.' };
    }
    
    try {
      console.log('[WixService] Listing pricing plan orders with options:', JSON.stringify(options, null, 2));
      
      // Set up the request with default values
      const url = `${WIX_API_BASE}/pricing-plans/v2/orders/list`;
      
      // Prepare the request data following Wix API structure
      const data = {
        // Apply filters if provided
        filter: options.filter || {},
        // Default sort by creation date descending if not specified
        sort: options.sort || { fieldName: 'createdDate', direction: 'DESC' },
        // Default paging
        paging: options.paging || { limit: 50, offset: 0 }
      };
      
      logApiCall(url, 'POST', data);
      
      const response = await axios.post(
        url,
        data,
        {
          headers: {
            'Authorization': WIX_API_KEY,
            'Content-Type': 'application/json',
            'wix-site-id': WIX_SITE_ID
          }
        }
      );
      
      console.log('[WixService] Orders API response:', response.data);
      
      return {
        success: true,
        orders: response.data.orders || [],
        orderCount: response.data.orders?.length || 0,
        pagingMetadata: response.data.pagingMetadata || {}
      };
    } catch (err) {
      console.error('[WixService] Orders API error:', err);
      
      // Extract error details from Axios error
      const errorDetails = err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : { message: err.message };
      
      return { 
        success: false, 
        error: `Error listing orders: ${err.message}`,
        details: errorDetails
      };
    }
  }
};
