const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const SCAN_ID_CSV_PATH = path.join(__dirname, '../../src/assets/scan-id-export.csv');

module.exports = {
  getLatestScan: function() {
    try {
      console.log('Looking for Scan-ID CSV at:', SCAN_ID_CSV_PATH);
      if (!fs.existsSync(SCAN_ID_CSV_PATH)) {
        console.error('Scan-ID CSV file not found at:', SCAN_ID_CSV_PATH);
        return { error: 'Scan-ID CSV file not found' };
      }
      const csvContent = fs.readFileSync(SCAN_ID_CSV_PATH, 'utf8');
      console.log('CSV content loaded, parsing...');
      const records = parse(csvContent, { columns: true, skip_empty_lines: true });
      if (!records.length) {
        console.warn('No records found in Scan-ID CSV');
        return { error: 'No records found in CSV file' };
      }
      console.log(`Found ${records.length} records, returning the latest one`);
      
      // Get the latest record (by created date/time)
      // Sort records by CREATED field in descending order
      records.sort((a, b) => {
        const dateA = new Date(a.CREATED.split(' ')[0].replace(/\//g, '-'));
        const dateB = new Date(b.CREATED.split(' ')[0].replace(/\//g, '-'));
        return dateB - dateA;
      });
      
      const latestRecord = records[0];
      
      // Map the Scan-ID CSV fields to our expected format
      return {
        FirstName: latestRecord['FIRST NAME'],
        LastName: latestRecord['LAST NAME'],
        FullName: latestRecord['FULL NAME'],
        DateOfBirth: latestRecord['BIRTHDATE'],
        Age: latestRecord['AGE'],
        IDNumber: latestRecord['DRV LC NO'],
        IDExpiration: latestRecord['EXPIRES ON'],
        IDIssued: latestRecord['ISSUED ON'],
        ScanTime: latestRecord['CREATED'],
        PhotoPath: latestRecord['Image1']
      };
    } catch (err) {
      console.error('Error processing Scan-ID CSV:', err);
      return { error: err.message };
    }
  }
};
