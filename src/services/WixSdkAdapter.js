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
const DATA_VERSION = require('@wix/data/package.json').version;

console.log(`Wix SDK Adapter initialized with SDK v${SDK_VERSION}, Data v${DATA_VERSION}`);

class WixSdkAdapter {
  constructor() {
    this.client = null;
    this.clientId = WIX_CONFIG.clientId || '8efc3d0c-9cfb-4d5d-a596-91c4eaa38bb9';
    this.initialized = false;
    this.sdkVersion = SDK_VERSION;
    this.dataVersion = DATA_VERSION;
    this.availableMethods = [];
  }

  /**
   * Initialize the Wix client
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing Wix SDK client with client ID:', this.clientId);
      
      // Create the Wix client
      this.client = createClient({
        modules: { items },
        auth: OAuthStrategy({ clientId: this.clientId }),
      });
      
      // Detect available methods
      this.availableMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(this.client.items)
      ).filter(name => typeof this.client.items[name] === 'function');
      
      console.log('Available methods:', this.availableMethods);
      
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
}

// Export a singleton instance
const adapter = new WixSdkAdapter();

module.exports = {
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
  
  // Export the adapter instance for direct use
  adapter
};
