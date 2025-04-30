/**
 * WixSdkAdapter.js
 * A version-adaptive implementation for the Wix JavaScript SDK
 * 
 * Following the Ethereal Engineering Technical Codex principles:
 * - Boundary Protection: Implementing strict interface contracts for external APIs
 * - Fail Fast and Learn: Implementing early failure detection and clear error reporting
 * - Reflective Engineering: Building self-auditing capabilities
 */
const fs = require('fs');
const path = require('path');
const { createClient, OAuthStrategy } = require('@wix/sdk');
const { contacts } = require('@wix/crm');
const { items } = require('@wix/data');

// Load Wix configuration
const CONFIG_PATH = path.join(__dirname, '../../wix.config.json');
let WIX_CONFIG = {};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    WIX_CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    console.log('Loaded Wix SDK Adapter config');
  } catch (e) {
    console.error('Error loading Wix config for SDK Adapter:', e.message);
  }
}

// SDK Version detection
const SDK_VERSION = require('@wix/sdk/package.json').version;
const CRM_VERSION = require('@wix/crm/package.json').version;

console.log(`Wix SDK Adapter initialized with SDK v${SDK_VERSION}, CRM v${CRM_VERSION}`);

class WixSdkAdapter {
  constructor() {
    this.client = null;
    this.clientId = WIX_CONFIG.clientId;
    this.appSecret = WIX_CONFIG.appSecret;
    this.publicKey = WIX_CONFIG.publicKey;
    this.siteId = WIX_CONFIG.siteId;
    this.apiKey = WIX_CONFIG.apiKey;
    this.initialized = false;
    this.sdkVersion = SDK_VERSION;
    this.crmVersion = CRM_VERSION;
    this.dataVersion = require('@wix/data/package.json').version;
    this.availableMethods = [];
    this.contactsModule = null;
  }

  /**
   * Initialize the Wix client
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing Wix SDK client with API Key strategy');
      
      // Import the modules
      const { createClient, ApiKeyStrategy } = require('@wix/sdk');
      const { contacts } = require('@wix/crm');
      const { items } = require('@wix/data');
      
      // Store the modules for later use
      this.contactsModule = contacts;
      
      // Configure authentication with API Key strategy
      console.log('Authentication configured with API Key strategy');
      console.log(`- API Key: ${this.apiKey.substring(0, 20)}...`);
      console.log(`- Site ID: ${this.siteId}`);
      console.log('- Including Account ID in headers for account-level API access');
      
      // Account ID for account-level API access
      const accountId = '11a11ce3-d0da-46c7-b4e4-48c17df562f0';
      
      this.client = createClient({
        modules: { items, contacts },
        auth: ApiKeyStrategy({
          apiKey: this.apiKey,
          siteId: this.siteId
        }),
        // Add headers for account-level API access
        headers: {
          'wix-account-id': accountId
        }
      });
      
      // Detect available methods
      this.availableMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(this.client.contacts)
      ).filter(name => typeof this.client.contacts[name] === 'function');
      
      console.log('Available contacts methods:', this.availableMethods);
      
      this.initialized = true;
      return true;
    } catch (err) {
      console.error('Error initializing Wix SDK Adapter:', err);
      throw err;
    }
  }

  /**
   * Query items from a data collection using the appropriate method for the SDK version
   */
  async queryCollection(collectionId) {
    await this.initialize();
    
    console.log(`Querying collection "${collectionId}" with SDK Adapter`);
    
    // Try different methods based on availability
    if (this.availableMethods.includes('query')) {
      console.log('Using query() method');
      return await this.client.items.query({
        dataCollectionId: collectionId
      });
    } 
    else if (this.availableMethods.includes('find')) {
      console.log('Using find() method');
      return await this.client.items.find({
        dataCollectionId: collectionId
      });
    }
    else if (this.availableMethods.includes('list')) {
      console.log('Using list() method');
      return await this.client.items.list(collectionId);
    }
    else {
      throw new Error(`No compatible query method found in SDK v${this.sdkVersion}`);
    }
  }

  /**
   * Get a specific item by ID
   */
  async getItem(collectionId, itemId) {
    await this.initialize();
    
    console.log(`Getting item "${itemId}" from collection "${collectionId}"`);
    
    if (this.availableMethods.includes('get')) {
      return await this.client.items.get(collectionId, itemId);
    } else {
      throw new Error(`get() method not available in SDK v${this.sdkVersion}`);
    }
  }

  /**
   * Create a new item in a collection
   */
  async createItem(collectionId, data) {
    await this.initialize();
    
    console.log(`Creating item in collection "${collectionId}"`);
    
    if (this.availableMethods.includes('create')) {
      return await this.client.items.create(collectionId, data);
    } else {
      throw new Error(`create() method not available in SDK v${this.sdkVersion}`);
    }
  }
  
  /**
   * Search for members by name and date of birth
   * Following the Ethereal Engineering Technical Codex principles:
   * - Boundary Protection: Implementing strict interface contracts for the Wix API
   * - Separation of Concerns: Maintaining clear boundaries between components
   */
  async searchMember({ firstName, lastName, dateOfBirth }) {
    try {
      // Initialize if not already initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      console.log(`Searching for contact with SDK Adapter: ${firstName} ${lastName} ${dateOfBirth}`);
      console.log('Using CRM Contacts API for search');
      
      // Format the search parameters
      const searchParams = { firstName, lastName, dateOfBirth };
      
      // Process first name parts for more flexible matching
      let firstNameParts = [];
      if (searchParams.firstName && searchParams.firstName.trim() !== '') {
        firstNameParts = searchParams.firstName.trim().toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1));
        console.log('First name parts for search:', firstNameParts);
      }
      
      // Format last name for search
      let formattedLastName = '';
      if (lastName && lastName.trim() !== '') {
        formattedLastName = lastName.trim().toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        console.log('Formatted last name for search:', formattedLastName);
      }
        
      // Using the Wix CRM Contacts API for search
      let results = [];
      
      console.log('Using queryContacts method with query builder pattern');
      
      try {
        // Create query builder for contacts - strictly following Wix documentation
        const queryBuilder = this.client.contacts.queryContacts();
        
        // Apply filters based on provided search parameters
        let hasFilters = false;
        
        // Add first name filter if provided
        if (firstNameParts.length > 0) {
          // For each first name part, we'll create a separate query
          // and combine the results
          const firstNameResults = [];
          
          for (const namePart of firstNameParts) {
            console.log(`Searching for first name part: ${namePart}`);
            const nameQuery = this.client.contacts.queryContacts()
              .startsWith('info.name.first', namePart)
              .limit(50);
            
            try {
              const response = await nameQuery.find();
              if (response.items && response.items.length > 0) {
                firstNameResults.push(...response.items);
              }
            } catch (nameError) {
              console.warn(`Error searching for first name part ${namePart}:`, nameError.message);
            }
          }
          
          // Add these results to our main results array
          if (firstNameResults.length > 0) {
            results.push(...firstNameResults);
            hasFilters = true;
          }
        }
        
        // Add last name filter if provided
        if (formattedLastName) {
          console.log(`Searching for last name: ${formattedLastName}`);
          const lastNameQuery = this.client.contacts.queryContacts()
            .startsWith('info.name.last', formattedLastName)
            .limit(50);
          
          try {
            const response = await lastNameQuery.find();
            if (response.items && response.items.length > 0) {
              results.push(...response.items);
              hasFilters = true;
            }
          } catch (lastNameError) {
            console.warn(`Error searching for last name ${formattedLastName}:`, lastNameError.message);
          }
        }
        
        // If no specific filters were applied, get all contacts
        if (!hasFilters) {
          console.log('No specific filters applied, retrieving all contacts');
          const allContactsQuery = this.client.contacts.queryContacts()
            .limit(50);
          
          try {
            const response = await allContactsQuery.find();
            results = response.items || [];
          } catch (allContactsError) {
            console.error('Error retrieving all contacts:', allContactsError);
            results = [];
          }
        }
        
        console.log(`Found ${results.length} contacts with query builder pattern`);
      } catch (queryError) {
        console.error('Error with contacts query builder pattern:', queryError);
        // If the query fails, we'll return an empty result set
        results = [];
      }
      
      // Track unique contacts to avoid duplicates
      const uniqueContacts = new Map();
      results.forEach(contact => {
        if (contact && contact._id) {
          uniqueContacts.set(contact._id, contact);
        }
      });
      
      // Convert back to array
      results = Array.from(uniqueContacts.values());
      
      console.log(`Total unique contacts found: ${results.length}`);
      console.log(`Found ${results.length} matching contacts`);
      
      // Format the results according to Wix documentation structure
      // Include the query parameters in the response for display in the UI
      return {
        success: true,
        // Use 'items' as the property name to match Wix documentation
        items: results,
        total: results.length,
        source: 'wix-crm-contacts',
        queryDetails: {
          firstName: firstNameParts.join(', ') || '',
          lastName: formattedLastName || '',
          dateOfBirth: dateOfBirth || '',
          methodUsed: 'queryContacts'
        }
      };
    } catch (err) {
      console.error('Error searching for contact with SDK:', err);
      return {
        success: false,
        error: err.message,
        source: 'wix-crm-contacts'
      };
    }
  }

  /**
   * Get pricing plans for a member
   * Following the Ethereal Engineering Technical Codex principles:
   * - Boundary Protection: Implementing strict interface contracts for the Wix API
   * - Separation of Concerns: Maintaining clear boundaries between components
   */
  async getMemberPricingPlans(memberId) {
    try {
      await this.initialize();
      
      console.log(`Getting pricing plans for member: ${memberId} with SDK Adapter`);
      
      if (!memberId) {
        throw new Error('Member ID is required');
      }
      
      // For now, return a message that this functionality needs to be implemented
      // with the correct Wix SDK version that supports pricing plans
      console.log('The pricing plans functionality requires additional SDK configuration');
      
      return {
        success: false,
        error: 'The pricing plans functionality is not available in the current SDK configuration',
        message: 'This feature requires proper configuration with the Wix SDK. Please refer to the Wix documentation for pricing-plans integration.',
        source: 'wix-sdk'
      };
    } catch (err) {
      console.error('Error getting pricing plans with SDK:', err);
      
      return {
        success: false,
        error: `Error getting pricing plans: ${err.message}`,
        details: err.stack || '',
        source: 'wix-sdk'
      };
    }
  }
}

// Export a singleton instance
const adapter = new WixSdkAdapter();

module.exports = {
  /**
   * Search for a contact using the Wix CRM Contacts API
   * Note: Method name kept as searchMember for backward compatibility
   */
  searchMember: async function({ firstName, lastName, dateOfBirth }) {
    try {
      return await adapter.searchMember({ firstName, lastName, dateOfBirth });
    } catch (err) {
      console.error('CRM Contacts API searchMember error:', err);
      return {
        success: false,
        error: err.message,
        source: 'wix-crm-contacts-adapter'
      };
    }
  },
  
  /**
   * Get pricing plans for a member using the SDK adapter
   */
  getMemberPricingPlans: async function(memberId) {
    try {
      return await adapter.getMemberPricingPlans(memberId);
    } catch (err) {
      console.error('SDK Adapter getMemberPricingPlans error:', err);
      return {
        success: false,
        error: err.message,
        source: 'wix-sdk-adapter'
      };
    }
  },
  
  /**
   * Test the Wix SDK Adapter
   */
  async testAdapter(collectionId = "BannedNames") {
    try {
      console.log('Testing Wix SDK Adapter with collection:', collectionId);
      
      // Initialize the adapter
      await adapter.initialize();
      
      // Query the collection
      const dataItems = await adapter.queryCollection(collectionId);
      
      console.log('SDK Adapter query completed successfully');
      
      // Format the results
      let items = [];
      let total = 0;
      
      if (dataItems.items) {
        // Standard response format
        items = dataItems.items;
        total = items.length;
      } else if (Array.isArray(dataItems)) {
        // List response format
        items = dataItems;
        total = items.length;
      } else {
        // Unknown format - try to extract items
        items = dataItems.results || dataItems.data || [];
        total = items.length;
      }
      
      const result = {
        sdkVersion: adapter.sdkVersion,
        dataVersion: adapter.dataVersion,
        availableMethods: adapter.availableMethods,
        total: total,
        items: items,
        rawData: dataItems
      };
      
      return {
        success: true,
        result: result,
        message: `Successfully retrieved ${total} items from collection "${collectionId}" using SDK Adapter`
      };
    } catch (err) {
      console.error('Wix SDK Adapter Test Error:', err);
      return {
        success: false,
        error: err.message,
        details: err.stack || '',
        sdkVersion: adapter.sdkVersion,
        dataVersion: adapter.dataVersion,
        availableMethods: adapter.availableMethods || []
      };
    }
  },
  
  /**
   * Query all contacts without any filters (exported as a module function)
   */
  queryAllContacts: async function() {
    try {
      return await adapter.queryAllContacts();
    } catch (err) {
      console.error('CRM Contacts API queryAllContacts error:', err);
      return {
        success: false,
        error: err.message,
        source: 'wix-crm-contacts-adapter'
      };
    }
  },
  
  /**
   * Method to query all contacts without any filters (exported as a module function)
   */
  queryAllContactsStatic: async function() {
    try {
      console.log('Static method: Querying all contacts without filters');
      
      // Create a new adapter instance
      const adapter = new WixSdkAdapter();
      await adapter.initialize();
      
      // Create a query builder for contacts with no filters
      const queryBuilder = adapter.client.contacts.queryContacts()
        .limit(50); // Increased limit to get more results
      
      console.log('Executing query for all contacts');
      
      // Execute the query by calling find() on the query builder
      const response = await queryBuilder.find();
      
      // Get the results
      const results = response.items || [];
      console.log(`Found ${results.length} total contacts`);
      
      return {
        success: true,
        items: results,
        total: results.length,
        source: 'wix-crm-contacts'
      };
    } catch (err) {
      console.error('Error querying all contacts:', err);
      return {
        success: false,
        error: err.message,
        stack: err.stack
      };
    }
  },
  
  // Export the adapter instance for direct use
  adapter
};
