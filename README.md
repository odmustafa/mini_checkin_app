# Mini Check-In App

A check-in application that reads Scan-ID export data from a CSV file and integrates with Wix APIs for member verification and pricing plan retrieval. The app can run either as an Electron desktop application or as a web-based application in your browser.

## Features
- Scan ID data parsing from CSV exports
- Member verification using Wix Members and Contacts APIs
- Pricing plan retrieval for verified members
- Flexible name matching for better search results
- API Explorer for testing different Wix API endpoints
- Real-time Scan-ID file watching
- Proper case conversion for improved member matching

## Recent Improvements
- Enhanced name extraction from Wix API responses
- Improved member search with multiple name variations
- Updated pricing plans API endpoint and request structure
- Fixed Scan-ID data mapping for proper member lookup
- Added detailed diagnostics for API requests and responses

## New Account Activation Flow - Explained
- Check [New Account Activation Flow](./New-Account-Activation-flow.md) for a detailed explanation of the New Account Activation flow (now with a neat flowchart!) 

## How it works
- Click "Scan ID" to read the latest scan from the Scan-ID CSV export
- The app displays the member's name, DOB, ID number, and other details
- It then searches for matching members in Wix using the Direct API
- If a match is found, it displays the member information and their pricing plans
- You can also click "Watch Scan-ID" to monitor for new scans automatically

## Running the App

### As a Desktop App (Electron)
```
npm start
```

### As a Web App
```
npm run web
```
Then open http://localhost:3000 (or the port shown in the console) in your browser.

## Configuration
- The Scan-ID CSV export path is located at: `src/assets/scan-id-export.csv`
- Wix API credentials are stored in `wix.config.json` in the root directory
- Sample format for `wix.config.json`:
```json
{
  "apiKey": "YOUR_WIX_API_KEY",
  "siteId": "YOUR_WIX_SITE_ID",
  "clientId": "YOUR_WIX_CLIENT_ID"
}
```

## Architecture
- **Frontend**: HTML, CSS, JavaScript in `src/renderer/`
- **Backend**: Node.js with Express server in `src/web-server.js`
- **Electron**: Main process in `src/main.js`
- **Services**: Wix API integration in `src/services/`


## Setup
```bash
npm install
```

## Running the App

### As Desktop App (Electron)
```bash
npm start
```

### As Web App (Browser)
```bash
npm run web
```
This will start a web server and automatically open your browser to the app. The server will try port 3000 first, and if it's in use, it will try 3001, 3002, etc.

---

## Development
This project follows the Ethereal Engineering Technical Codex principles:
- **Boundary Protection**: Implementing strict interface contracts for APIs
- **Fail Fast and Learn**: Using fallback mechanisms and detailed error reporting
- **Separation of Concerns**: Maintaining clear boundaries between components
  
It serves as a focused prototype for the check-in workflow, based on the architecture and best practices of the main Front Desk Ops application.

## AI Usage
This project relies heavily on AI technologies including:
- Windsurf (Pro)
- Claude 3.7 Sonnet (within Windsurf via Cascade)
- GPT-4.1 (free limited time) (within Windsurf via Cascade)
- ChatGPT (Pro)

## Useage
This project is for developing an application that will be used by staff at Tribute Music Gallery primarily to 
- Check-in members upon arrival
- New account activation

## TO-DO
- (MISSION CRITICAL) Get all of the parts of the New Account Activation flow functioning.
- (MISSION CRITICAL) Get Member Check-in process functioning
- (Not as critical, but still important) DJ/Artist list and check-in
- (Not as critical, but still important) DJ/Artist guestlist check-in
- (Not as critical, but still important) Incident Report Module (for staff to create Incident Reports - hopefully implimented before incident occures which requires reporting (i.e. Breach of the Peace Report (Tx Tabc Enf 5122))
- Not cry (...I am but a simple man .__.;; )
- (Future components) Staff Task List (for internal use)
- (Future components) Staff Schedule Management (for internal use)
- (Future components) Implimentation of Guest Pass feature (this will enable new Membership Perk for month/year membership renewals)

