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
      
      console.log(`Looking up member: ${formattedFirstName} ${formattedLastName}, DOB: ${dateOfBirth}`);
      console.log(`Original names: ${firstName} ${lastName}`);
      console.log(`First name variations: ${firstNameVariations.join(', ')}`);
      
      // Format DOB for Wix API (convert from MM-DD-YYYY to YYYY-MM-DD)
      let formattedDOB = '';
      let originalDOB = '';
      if (dateOfBirth) {
        originalDOB = dateOfBirth;
        try {
          // Handle MM-DD-YYYY format from Scan-ID and convert to YYYY-MM-DD for Wix
          const [month, day, year] = dateOfBirth.split('-');
          formattedDOB = `${year}-${month}-${day}`; // YYYY-MM-DD format
          console.log(`Formatted DOB for Wix API: ${formattedDOB}`);
        } catch (e) {
          console.warn('Could not parse date:', dateOfBirth);
          formattedDOB = dateOfBirth;
        }
      }
      
      // Try multiple approaches to find the member
      let results = [];
      let source = null;
      
      // Following the Ethereal Engineering Technical Codex principle of Fail Fast and Learn
      // We'll implement a multi-layered search approach with fallbacks
      
      // 1. First try Members API with combined search criteria
      try {
        // Build a comprehensive filter based on all available name variations and DOB
        const membersFilters = [];
        
        // Add filters for each first name variation
        firstNameVariations.forEach(nameVariation => {
          membersFilters.push({
            filter: { fieldName: "profile.firstName", operator: "contains", value: nameVariation }
          });
        });
        
        // Add last name filter
        if (formattedLastName) {
          membersFilters.push({
            filter: { fieldName: "profile.lastName", operator: "contains", value: formattedLastName }
          });
        }
        
        // Add DOB filters if available
        if (formattedDOB) {
          // Try both standard and extended fields for DOB
          membersFilters.push({
            filter: { fieldName: "extendedFields.dob", operator: "eq", value: formattedDOB }
          });
          membersFilters.push({
            filter: { fieldName: "extendedFields.birthdate", operator: "eq", value: formattedDOB }
          });
          membersFilters.push({
            filter: { fieldName: "extendedFields.dateOfBirth", operator: "eq", value: formattedDOB }
          });
          
          // Also try with original DOB format
          membersFilters.push({
            filter: { fieldName: "extendedFields.dob", operator: "eq", value: originalDOB }
          });
          membersFilters.push({
            filter: { fieldName: "extendedFields.birthdate", operator: "eq", value: originalDOB }
          });
          membersFilters.push({
            filter: { fieldName: "extendedFields.dateOfBirth", operator: "eq", value: originalDOB }
          });
        }
        
        // Try full name combinations
        if (formattedFirstName && formattedLastName) {
          const fullName = `${formattedFirstName} ${formattedLastName}`.trim();
          membersFilters.push({
            filter: { fieldName: "profile.name", operator: "contains", value: fullName }
          });
        }
        
        // Properly structure the query according to Wix API requirements
        // Following the memory about correct API request structure
        const membersData = {
          // Direct structure without nesting under 'query'
          filter: {
            or: membersFilters
          },
          paging: { limit: 10 },
          fields: [
            "profile",
            "privacyStatus",
            "status",
            "activityStatus",
            "extendedFields",
            "membershipStatus"
          ]
        };
        
        console.log('[WixService] Members API request:', JSON.stringify(membersData, null, 2));
        
        const membersResponse = await axios.post(
          `${MEMBERS_API}/query`,
          membersData,
          {
            headers: {
              'Authorization': WIX_API_KEY,
              'Content-Type': 'application/json',
              'wix-site-id': WIX_SITE_ID
            }
          }
        );
        
        console.log('[WixService] Members API response:', membersResponse.data);
        
        if (membersResponse.data.members && membersResponse.data.members.length > 0) {
          // Log the first member to debug the structure
          console.log('Found member structure:', JSON.stringify(membersResponse.data.members[0], null, 2));
          
          // Ensure each member has an _id property (following the memory about Member ID extraction)
          const members = membersResponse.data.members.map(member => {
            // If the member doesn't have an _id property but has an id property, use that
            if (!member._id && member.id) {
              member._id = member.id;
            } else if (!member._id && member.memberId) {
              member._id = member.memberId;
            }
            return member;
          });
          
          results = members;
          source = 'members';
          console.log('Found members by Members API search');
        }
      } catch (membersErr) {
        console.warn('Members API search failed:', membersErr.message);
        // Continue to fallback approach
      }
      
      // 2. If no matches from Members API, try Contacts API as fallback
      if (!results.length) {
        try {
          // Build a comprehensive filter for Contacts API
          const contactsFilters = [];
          
          // Add filters for each first name variation
          firstNameVariations.forEach(nameVariation => {
            contactsFilters.push({
              filter: { fieldName: "info.name.first", operator: "contains", value: nameVariation }
            });
          });
          
          // Add last name filter
          if (formattedLastName) {
            contactsFilters.push({
              filter: { fieldName: "info.name.last", operator: "contains", value: formattedLastName }
            });
          }
          
          // Add DOB filters if available
          if (formattedDOB) {
            contactsFilters.push({
              filter: { fieldName: "extendedFields.dob", operator: "eq", value: formattedDOB }
            });
            contactsFilters.push({
              filter: { fieldName: "extendedFields.birthdate", operator: "eq", value: formattedDOB }
            });
            contactsFilters.push({
              filter: { fieldName: "extendedFields.dateOfBirth", operator: "eq", value: formattedDOB }
            });
            
            // Also try with original DOB format
            contactsFilters.push({
              filter: { fieldName: "extendedFields.dob", operator: "eq", value: originalDOB }
            });
            contactsFilters.push({
              filter: { fieldName: "extendedFields.birthdate", operator: "eq", value: originalDOB }
            });
            contactsFilters.push({
              filter: { fieldName: "extendedFields.dateOfBirth", operator: "eq", value: originalDOB }
            });
          }
          
          // Try full name combinations
          if (formattedFirstName && formattedLastName) {
            const fullName = `${formattedFirstName} ${formattedLastName}`.trim();
            contactsFilters.push({
              filter: { fieldName: "info.name.full", operator: "contains", value: fullName }
            });
          }
          
          // Properly structure the contacts query according to Wix API requirements
          const contactsData = {
            // Direct structure without nesting under 'query'
            filter: {
              or: contactsFilters
            },
            paging: { limit: 10 },
            fields: [
              "info",
              "customFields",
              "extendedFields"
            ]
          };
          
          console.log('[WixService] Contacts API request:', JSON.stringify(contactsData, null, 2));
          
          const contactsResponse = await axios.post(
            `${CONTACTS_API}/query`,
            contactsData,
            {
              headers: {
                'Authorization': WIX_API_KEY,
                'Content-Type': 'application/json',
                'wix-site-id': WIX_SITE_ID
              }
            }
          );
          
          console.log('[WixService] Contacts API response:', contactsResponse.data);
          
          if (contactsResponse.data.contacts && contactsResponse.data.contacts.length > 0) {
            results = contactsResponse.data.contacts;
            source = 'contacts';
            console.log('Found members by Contacts API search');
          }
        } catch (contactsErr) {
          console.warn('Contacts API search failed:', contactsErr.message);
          
          // Last resort: try a simple free text search
          try {
            const fullName = `${formattedFirstName} ${formattedLastName}`.trim();
            const simpleParams = {
              search: { freeText: fullName },
              fields: ['info', 'customFields', 'picture']
            };
            
            console.log('[WixService] Simple search request:', JSON.stringify(simpleParams, null, 2));
            
            const simpleResponse = await axios.post(
              `${CONTACTS_API}/search`,
              simpleParams,
              {
                headers: {
                  'Authorization': WIX_API_KEY,
                  'Content-Type': 'application/json',
                  'wix-site-id': WIX_SITE_ID
                }
              }
            );
            
            console.log('[WixService] Simple search response:', simpleResponse.data);
            if (simpleResponse.data.contacts && simpleResponse.data.contacts.length > 0) {
              results = simpleResponse.data.contacts;
              source = 'contacts';
              console.log('Found members by simple text search');
            }
          } catch (simpleErr) {
            console.warn('Simple search failed:', simpleErr.message);
          }
        }
      }
      
      // Process results based on the source
      if (source === 'members') {
        // Extract member IDs from Members API response
        return {
          success: true,
          members: results.map(member => {
            // Log the full member object to help with debugging
            console.log('Processing member:', JSON.stringify(member, null, 2));
            
            // Extract name from nickname or other available fields
            let firstName = '';
            let lastName = '';
            
            // Try to extract from profile.nickname if available
            if (member.profile?.nickname) {
              const nameParts = member.profile.nickname.split(' ');
              if (nameParts.length >= 2) {
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
              } else {
                firstName = member.profile.nickname;
              }
            }
            
            // Fallback to other fields if available
            firstName = firstName || member.profile?.firstName || member.contact?.firstName || '';
            lastName = lastName || member.profile?.lastName || member.contact?.lastName || '';
            
            return {
              id: member._id || member.id || member.memberId,
              firstName,
              lastName,
              email: member.loginEmail || member.contact?.emails?.[0] || member.profile?.email || '',
              phone: member.contact?.phones?.[0] || member.profile?.phone || '',
              picture: member.profile?.photo?.url || '',
              dateOfBirth: member.contact?.birthdate || member.extendedFields?.dob || member.extendedFields?.birthdate || '',
              source: 'members',
              nickname: member.profile?.nickname || ''
            };
          })
        };
      } else if (source === 'contacts') {
        // Extract member IDs from Contacts API response
        return {
          success: true,
          members: results.map(contact => {
            // Log the full contact object to help with debugging
            console.log('Processing contact:', JSON.stringify(contact, null, 2));
            
            // Extract member ID from various possible locations
            const memberId = contact.memberInfo?.id || 
                            contact.info?.memberId || 
                            contact.info?.id || 
                            contact.id;
            
            console.log(`Extracted member ID: ${memberId} from contact`);
            
            return {
              id: memberId,
              firstName: contact.info?.name?.first || '',
              lastName: contact.info?.name?.last || '',
              email: contact.primaryEmail?.email || contact.info?.emails?.[0]?.email || '',
              phone: contact.primaryPhone?.phone || contact.info?.phones?.[0]?.phone || '',
              picture: contact.picture?.image?.url || '',
              dateOfBirth: contact.info?.birthdate || contact.customFields?.birthdate || contact.customFields?.dob || '',
              source: 'contacts'
            };
          })
        };
      } else {
        return {
          success: false,
          error: 'No members found matching the search criteria'
        };
      }
    } catch (err) {
      console.error('Wix API error:', err);
      return { 
        success: false, 
        error: err.message,
        details: err.response ? err.response.data : null
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
