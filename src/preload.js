const { contextBridge, ipcRenderer } = require('electron');

// Expose Scan ID and Wix member lookup APIs
contextBridge.exposeInMainWorld('scanidAPI', {
  getLatestScan: () => ipcRenderer.invoke('scanid:get-latest'),
  findWixMember: (firstName, lastName, dateOfBirth) => ipcRenderer.invoke('wix:find-member', { firstName, lastName, dateOfBirth }),
  searchMemberByNameOrDOB: (name, dob) => ipcRenderer.invoke('wix-direct:search-member', { name, dob }),
  getMemberPricingPlans: (memberId) => ipcRenderer.invoke('wix-direct:pricing-plans', { memberId })
});

// Expose Wix API Explorer functionality
contextBridge.exposeInMainWorld('wixExplorer', {
  getConfig: () => ipcRenderer.invoke('wix-explorer:get-config'),
  getEndpoints: () => ipcRenderer.invoke('wix-explorer:get-endpoints'),
  testApiCall: (endpointId, searchParams) => ipcRenderer.invoke('wix-explorer:test-api', { endpointId, searchParams })
});

// Expose Wix SDK test functionality
contextBridge.exposeInMainWorld('wixSdk', {
  testSdk: (collectionId) => ipcRenderer.invoke('wix-sdk:test', { collectionId }),
  testSdkSimple: (collectionId) => ipcRenderer.invoke('wix-sdk:test-simple', { collectionId }),
  inspectSdk: () => ipcRenderer.invoke('wix-sdk:inspect'),
  testAdapter: (collectionId) => ipcRenderer.invoke('wix-sdk:adapter-test', { collectionId }),
  testCompatAdapter: (collectionId) => ipcRenderer.invoke('wix-sdk:compat-test', { collectionId }),
  searchMember: (params) => ipcRenderer.invoke('wix-sdk:search-member', params),
  queryAllMembers: () => ipcRenderer.invoke('wix-sdk:query-all-members')
});

// Expose Wix Direct API functionality
contextBridge.exposeInMainWorld('wixDirect', {
  testApi: (endpoint) => ipcRenderer.invoke('wix-direct:test', { endpoint })
});
