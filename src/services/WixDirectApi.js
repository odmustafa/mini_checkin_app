/**
 * WixDirectApi.js
 * A direct REST API implementation for Wix integration
 * 
 * Following the Ethereal Engineering Technical Codex principles:
 * - Boundary Protection: Implementing strict interface contracts for external APIs
 * - Fail Fast and Learn: Implementing early failure detection and clear error reporting
 * - Separation of Concerns: Maintaining clear boundaries between components
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load Wix configuration
const CONFIG_PATH = path.join(__dirname, '../../wix.config.json');
let WIX_CONFIG = {};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    WIX_CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    console.log('Loaded Wix Direct API config');
  } catch (e) {
    console.error('Error loading Wix config for Direct API:', e.message);
  }
}

class WixDirectApi {
  constructor() {
    this.apiKey = WIX_CONFIG.apiKey;
    this.siteId = WIX_CONFIG.siteId;
    this.baseUrl = 'https://www.wixapis.com';
    this.initialized = !!this.apiKey && !!this.siteId;
    
    if (!this.initialized) {
      console.error('Wix Direct API not properly initialized. Missing API key or site ID.');
    } else {
      console.log('Wix Direct API initialized with Site ID:', this.siteId);
    }
  }

  /**
   * Get the headers for Wix API requests
   */
  getHeaders() {
    return {
      'Authorization': this.apiKey,
      'wix-site-id': this.siteId,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Query a data collection
   */
  async queryCollection(collectionId, query = {}) {
    if (!this.initialized) {
      throw new Error('Wix Direct API not properly initialized');
    }
    
    try {
      console.log(`Querying collection "${collectionId}" with Direct API`);
      
      // Prepare the request
      const url = `${this.baseUrl}/wix-data/v2/collections/${collectionId}/items/query`;
      const headers = this.getHeaders();
      const data = {
        query: query || {
          paging: { limit: 50 }
        }
      };
      
      // Make the request
      const response = await axios.post(url, data, { headers });
      
      return {
        success: true,
        items: response.data.items || [],
        totalCount: response.data.totalCount || 0,
        pagingMetadata: response.data.pagingMetadata || {}
      };
    } catch (err) {
      console.error('Wix Direct API Query Error:', err.message);
      
      // Extract error details from Axios error
      const errorDetails = err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : { message: err.message };
      
      throw {
        message: `Error querying collection "${collectionId}": ${err.message}`,
        details: errorDetails
      };
    }
  }

  /**
   * Get a specific item from a collection
   */
  async getItem(collectionId, itemId) {
    if (!this.initialized) {
      throw new Error('Wix Direct API not properly initialized');
    }
    
    try {
      console.log(`Getting item "${itemId}" from collection "${collectionId}"`);
      
      // Prepare the request
      const url = `${this.baseUrl}/wix-data/v2/collections/${collectionId}/items/${itemId}`;
      const headers = this.getHeaders();
      
      // Make the request
      const response = await axios.get(url, { headers });
      
      return {
        success: true,
        item: response.data.item || {}
      };
    } catch (err) {
      console.error('Wix Direct API Get Item Error:', err.message);
      
      // Extract error details from Axios error
      const errorDetails = err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : { message: err.message };
      
      throw {
        message: `Error getting item "${itemId}" from collection "${collectionId}": ${err.message}`,
        details: errorDetails
      };
    }
  }

  /**
   * Query members
   */
  async queryMembers(query = {}) {
    if (!this.initialized) {
      throw new Error('Wix Direct API not properly initialized');
    }
    
    try {
      console.log('Querying members with Direct API');
      
      // Prepare the request
      const url = `${this.baseUrl}/members/v1/members/query`;
      const headers = this.getHeaders();
      // Properly structure the query according to Wix API requirements
      const data = query || {
        // The query parameters need to be directly in the request body
        paging: { limit: 10 },
        fields: [
          "profile",
          "privacyStatus",
          "status",
          "activityStatus",
          "lastLoginDate",
          "registrationDate",
          "lastUpdateDate",
          "extendedFields"
        ]
      };
      
      // Make the request
      const response = await axios.post(url, data, { headers });
      
      return {
        success: true,
        members: response.data.members || [],
        totalCount: response.data.totalCount || 0,
        pagingMetadata: response.data.pagingMetadata || {}
      };
    } catch (err) {
      console.error('Wix Direct API Query Members Error:', err.message);
      
      // Extract error details from Axios error
      const errorDetails = err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : { message: err.message };
      
      throw {
        message: `Error querying members: ${err.message}`,
        details: errorDetails
      };
    }
  }

  /**
   * Query contacts
   */
  async queryContacts(query = {}) {
    if (!this.initialized) {
      throw new Error('Wix Direct API not properly initialized');
    }
    
    try {
      console.log('Querying contacts with Direct API');
      
      // Prepare the request
      const url = `${this.baseUrl}/contacts/v4/contacts/query`;
      const headers = this.getHeaders();
      // Properly structure the query according to Wix API requirements
      const data = query || {
        // The query parameters need to be directly in the request body
        paging: { limit: 10 },
        fields: [
          "info",
          "customFields",
          "extendedFields"
        ]
      };
      
      // Make the request
      const response = await axios.post(url, data, { headers });
      
      return {
        success: true,
        contacts: response.data.contacts || [],
        totalCount: response.data.totalCount || 0,
        pagingMetadata: response.data.pagingMetadata || {}
      };
    } catch (err) {
      console.error('Wix Direct API Query Contacts Error:', err.message);
      
      // Extract error details from Axios error
      const errorDetails = err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : { message: err.message };
      
      throw {
        message: `Error querying contacts: ${err.message}`,
        details: errorDetails
      };
    }
  }
  
  /**
   * Search for a member by name or DOB
   * Following the Ethereal Engineering Technical Codex principles:
   * - Boundary Protection: Implementing strict interface contracts for the Wix API
   * - Fail Fast and Learn: Implementing early failure detection with fallback mechanisms
   */
  async searchMemberByNameOrDOB(name, dob) {
    console.log('[WixDirectApi] searchMemberByNameOrDOB called with:', { name, dob });
    if (!this.initialized) {
      return {
        success: false,
        error: 'Wix Direct API not properly initialized'
      };
    }
    
    try {
      console.log(`Searching for member with name: ${name || 'N/A'} or DOB: ${dob || 'N/A'}`);
      
      // Try Members API first
      const membersUrl = `${this.baseUrl}/members/v1/members/query`;
      const headers = this.getHeaders();
      
      // Build filter based on provided parameters
      const filters = [];
      if (name) {
        // Split the name into parts and search for each part individually
        const nameParts = name.split(' ').filter(part => part.trim().length > 0);
        
        // Create a more flexible search by looking for any name part in any name field
        nameParts.forEach(part => {
          // Try to match the part against first name
          filters.push({
            filter: { fieldName: "profile.firstName", operator: "contains", value: part }
          });
          
          // Try to match the part against last name
          filters.push({
            filter: { fieldName: "profile.lastName", operator: "contains", value: part }
          });
          
          // Try to match against the full name field if it exists
          filters.push({
            filter: { fieldName: "profile.name", operator: "contains", value: part }
          });
          
          // Try to match against any custom name fields that might exist
          filters.push({
            filter: { fieldName: "extendedFields.fullName", operator: "contains", value: part }
          });
        });
        
        // Also try the full name as one search term
        filters.push({
          filter: { fieldName: "profile.name", operator: "contains", value: name }
        });
      }
      
      if (dob) {
        // Format DOB if needed (assuming input is MM-DD-YYYY and API needs YYYY-MM-DD)
        let formattedDob = dob;
        if (dob.includes('-')) {
          const parts = dob.split('-');
          if (parts.length === 3 && parts[2].length === 4) {
            // Convert from MM-DD-YYYY to YYYY-MM-DD
            formattedDob = `${parts[2]}-${parts[0]}-${parts[1]}`;
          }
        }
        
        // Try both standard and extended fields for DOB
        filters.push({
          filter: { fieldName: "extendedFields.dob", operator: "eq", value: formattedDob }
        });
        filters.push({
          filter: { fieldName: "extendedFields.birthdate", operator: "eq", value: formattedDob }
        });
        filters.push({
          filter: { fieldName: "extendedFields.dateOfBirth", operator: "eq", value: formattedDob }
        });
      }
      
      // If no search criteria provided, return empty results
      if (filters.length === 0) {
        return {
          success: true,
          source: 'none',
          results: []
        };
      }
      
      // Properly structure the query according to Wix API requirements
      const data = {
        // The query object needs to be directly in the request body
        filter: {
          or: filters
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
      
      // Make the request
      let membersResponse;
      try {
        console.log('[WixDirectApi] Members API request:', data);
        membersResponse = await axios.post(membersUrl, data, { headers });
        console.log('[WixDirectApi] Members API response:', membersResponse.data);
        console.log('Members API search successful');
      } catch (error) {
        console.warn('Members API search failed:', error.message);
        membersResponse = { data: { members: [] } };
      }
      
      // If we found members, return them
      if (membersResponse.data.members && membersResponse.data.members.length > 0) {
        // Log the first member to debug the structure
        console.log('Found member structure:', JSON.stringify(membersResponse.data.members[0], null, 2));
        
        // Ensure each member has an _id property
        const members = membersResponse.data.members.map(member => {
          // If the member doesn't have an _id property but has an id property, use that
          if (!member._id && member.id) {
            member._id = member.id;
          }
          return member;
        });
        
        return {
          success: true,
          source: 'members',
          results: members
        };
      }
      
      // Fallback to Contacts API if no members found
      console.log('No members found, trying Contacts API');
      const contactsUrl = `${this.baseUrl}/contacts/v4/contacts/query`;
      
      // Rebuild filters for contacts API
      const contactFilters = [];
      if (name) {
        // Split the name into parts and search for each part individually
        const nameParts = name.split(' ').filter(part => part.trim().length > 0);
        
        // Create a more flexible search by looking for any name part in any name field
        nameParts.forEach(part => {
          // Try to match the part against first name
          contactFilters.push({
            filter: { fieldName: "info.name.first", operator: "contains", value: part }
          });
          
          // Try to match the part against last name
          contactFilters.push({
            filter: { fieldName: "info.name.last", operator: "contains", value: part }
          });
          
          // Try to match against the display name if it exists
          contactFilters.push({
            filter: { fieldName: "info.name.full", operator: "contains", value: part }
          });
          
          // Try to match against any custom name fields that might exist
          contactFilters.push({
            filter: { fieldName: "customFields.fullName", operator: "contains", value: part }
          });
        });
        
        // Also try the full name as one search term
        contactFilters.push({
          filter: { fieldName: "info.name.full", operator: "contains", value: name }
        });
      }
      
      if (dob) {
        // Format DOB if needed
        let formattedDob = dob;
        if (dob.includes('-')) {
          const parts = dob.split('-');
          if (parts.length === 3 && parts[2].length === 4) {
            // Convert from MM-DD-YYYY to YYYY-MM-DD
            formattedDob = `${parts[2]}-${parts[0]}-${parts[1]}`;
          }
        }
        
        contactFilters.push({
          filter: { fieldName: "extendedFields.dob", operator: "eq", value: formattedDob }
        });
        contactFilters.push({
          filter: { fieldName: "extendedFields.birthdate", operator: "eq", value: formattedDob }
        });
        contactFilters.push({
          filter: { fieldName: "extendedFields.dateOfBirth", operator: "eq", value: formattedDob }
        });
      }
      
      // Properly structure the contacts query according to Wix API requirements
      const contactsData = {
        // The query object needs to be directly in the request body
        filter: {
          or: contactFilters
        },
        paging: { limit: 10 },
        fields: [
          "info",
          "customFields",
          "extendedFields"
        ]
      };
      
      let contactsResponse;
      try {
        console.log('[WixDirectApi] Contacts API request:', contactsData);
        contactsResponse = await axios.post(contactsUrl, contactsData, { headers });
        console.log('[WixDirectApi] Contacts API response:', contactsResponse.data);
        console.log('Contacts API search successful');
      } catch (error) {
        console.error('Contacts API search failed:', error.message);
        contactsResponse = { data: { contacts: [] } };
      }
      
      return {
        success: true,
        source: 'contacts',
        results: contactsResponse.data.contacts || []
      };
    } catch (err) {
      console.error('Wix Direct API Search Error:', err.message);
      return {
        success: false,
        error: `Error searching for member: ${err.message}`,
        details: err.response ? err.response.data : err
      };
    }
  }
  
  /**
   * Get pricing plans for a member
   * Following the Ethereal Engineering Technical Codex principles:
   * - Boundary Protection: Implementing strict interface contracts for the Wix API
   * - Fail Fast and Learn: Implementing early failure detection and clear error reporting
   */
  async getMemberPricingPlans(memberId) {
    console.log('[WixDirectApi] getMemberPricingPlans called with:', { memberId });
    if (!this.initialized) {
      throw new Error('Wix Direct API not properly initialized');
    }
    
    try {
      console.log(`Getting pricing plans for member: ${memberId}`);
      
      const url = `${this.baseUrl}/pricing-plans/v2/member-subscriptions/query`;
      const headers = this.getHeaders();
      
      const data = {
        query: {
          filter: {
            fieldName: "memberId",
            operator: "eq",
            value: memberId
          },
          paging: { limit: 10 }
        }
      };
      
      console.log('[WixDirectApi] Pricing Plan API request for memberId:', memberId, data);
      const response = await axios.post(url, data, { headers });
      console.log('[WixDirectApi] Pricing Plan API response:', response.data);
      
      return {
        success: true,
        plans: response.data.memberSubscriptions || [],
        planCount: response.data.memberSubscriptions?.length || 0,
        pagingMetadata: response.data.pagingMetadata || {}
      };
    } catch (err) {
      console.error('Wix Direct API Pricing Plans Error:', err.message);
      
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
  }
}

// Create a singleton instance
const directApi = new WixDirectApi();

module.exports = {
  /**
   * Test the Wix Direct API
   */
  async testDirectApi(endpoint = "members") {
    try {
      console.log('Testing Wix Direct API with endpoint:', endpoint);
      
      let result;
      
      // Call the appropriate endpoint
      switch (endpoint) {
        case 'members':
          result = await directApi.queryMembers();
          break;
        case 'contacts':
          console.log('[WixDirectApi] queryContacts with filters:');
          const filters = {};
          console.log('[WixDirectApi] queryContacts with filters:', filters);
          const contacts = await directApi.queryContacts(filters);
          result = contacts;
          break;
        case 'collection':
          result = await directApi.queryCollection('BannedNames');
          break;
        case 'search':
          result = await directApi.searchMemberByNameOrDOB('John Smith', '01-01-1990');
          break;
        case 'pricing':
          // First get a member ID from a search
          const searchResult = await directApi.searchMemberByNameOrDOB('John', null);
          if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
            const memberId = searchResult.source === 'members' 
              ? searchResult.results[0]._id 
              : searchResult.results[0].info.memberId;
            result = await directApi.getMemberPricingPlans(memberId);
          } else {
            result = { success: false, error: 'No members found to test pricing plans' };
          }
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }
      
      console.log('Direct API test completed successfully');
      
      return {
        success: true,
        endpoint,
        result,
        message: `Successfully queried ${endpoint} using Direct API`
      };
    } catch (err) {
      console.error('Wix Direct API Test Error:', err);
      return {
        success: false,
        endpoint,
        error: err.message,
        details: err.details || err.stack || ''
      };
    }
  },
  
  // Export the direct API instance for direct use
  directApi
};
