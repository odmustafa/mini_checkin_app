/**
 * Check-in functionality for the mini check-in app
 * 
 * Following the Ethereal Engineering Technical Codex principles:
 * - Boundary Protection: Implementing strict interface contracts for APIs
 * - Fail Fast and Learn: Using fallback mechanisms and detailed error reporting
 * - Separation of Concerns: Maintaining clear boundaries between components
 */

// Add a Watch button next to the Scan button
const scanBtn = document.getElementById('scan-btn');
const watchBtnContainer = document.createElement('div');
watchBtnContainer.className = 'watch-btn-container';
watchBtnContainer.innerHTML = `
  <button id="watch-btn" class="secondary-btn">Watch Scan-ID</button>
  <span id="watch-status" class="watch-status">Not watching</span>
`;
scanBtn.parentNode.insertBefore(watchBtnContainer, scanBtn.nextSibling);

// Get references to the new elements
const watchBtn = document.getElementById('watch-btn');
const watchStatus = document.getElementById('watch-status');

// Set up watch button hover effects and click handler
watchBtn.addEventListener('mouseenter', () => {
  if (watchBtn.getAttribute('data-watching') === 'true') {
    watchBtn.textContent = 'End Watch';
    watchBtn.classList.add('end-watch-hover');
  }
  // No hover effect when not watching
});

watchBtn.addEventListener('mouseleave', () => {
  if (watchBtn.getAttribute('data-watching') === 'true') {
    watchBtn.textContent = 'Stop Watching';
    watchBtn.classList.remove('end-watch-hover');
  }
  // No hover effect to remove when not watching
});

// Set up watch button click handler
watchBtn.addEventListener('click', async () => {
  // Toggle watching state
  const status = await window.scanidAPI.getWatchStatus();
  
  if (status.success && status.watching) {
    // Currently watching, so stop
    const result = await window.scanidAPI.stopWatching();
    if (result.success) {
      watchBtn.textContent = 'Watch Scan-ID';
      watchBtn.setAttribute('data-watching', 'false');
      watchBtn.classList.remove('end-watch-hover');
      watchStatus.textContent = 'Not watching';
      watchStatus.className = 'watch-status';
    } else {
      console.error('Failed to stop watching:', result.error);
    }
  } else {
    // Not watching, so start
    const result = await window.scanidAPI.startWatching();
    if (result.success) {
      watchBtn.textContent = 'Stop Watching';
      watchBtn.setAttribute('data-watching', 'true');
      watchStatus.textContent = 'Watching for scans...';
      watchStatus.className = 'watch-status watching';
    } else {
      console.error('Failed to start watching:', result.error);
    }
  }
});

// Register for scan watch events
let unregisterCallback;
document.addEventListener('DOMContentLoaded', () => {
  // Set up the scan watch callback
  unregisterCallback = window.scanidAPI.onScanWatchEvent((eventType, data) => {
    if (eventType === 'status') {
      // Update the watch status UI
      if (data.watching) {
        watchBtn.textContent = 'Stop Watching';
        watchBtn.setAttribute('data-watching', 'true');
        watchStatus.textContent = 'Watching for scans...';
        watchStatus.className = 'watch-status watching';
      } else {
        watchBtn.textContent = 'Watch Scan-ID';
        watchBtn.setAttribute('data-watching', 'false');
        watchStatus.textContent = 'Not watching';
        watchStatus.className = 'watch-status';
      }
    } else if (eventType === 'newscan') {
      // New scan detected, process it
      watchStatus.textContent = 'New scan detected!';
      watchStatus.className = 'watch-status new-scan';
      
      // Process the scan automatically
      processScan(data);
      
      // Reset the status after a delay
      setTimeout(() => {
        watchStatus.textContent = 'Watching for scans...';
        watchStatus.className = 'watch-status watching';
      }, 3000);
    } else if (eventType === 'error') {
      // Error occurred
      watchStatus.textContent = `Error: ${data.error}`;
      watchStatus.className = 'watch-status error';
    }
  });
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (unregisterCallback) {
    unregisterCallback();
  }
});

// Main function to process a scan (either from button click or watch feature)
async function processScan(scan) {
  const resultDiv = document.getElementById('scan-result');
  const accountDiv = document.getElementById('account-info');
  
  // Diagnostics panel
  let diagPanel = document.getElementById('diagnostics-panel');
  if (!diagPanel) {
    diagPanel = document.createElement('div');
    diagPanel.id = 'diagnostics-panel';
    diagPanel.style = 'background:#f4f4f4;border:1px solid #ccc;padding:8px;margin:8px 0;overflow:auto;max-height:200px;font-size:12px;';
    resultDiv.parentNode.insertBefore(diagPanel, resultDiv.nextSibling);
  }
  
  function showDiagnostics(title, data) {
    diagPanel.innerHTML = `<strong>${title}</strong><pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
  
  resultDiv.textContent = 'Processing scan...';
  accountDiv.textContent = '';
  
  try {
    if (!scan) {
      // If no scan provided, fetch the latest
      scan = await window.scanidAPI.getLatestScan();
    }
    
    if (!scan) {
      resultDiv.textContent = JSON.stringify(scan, null, 2);
      showDiagnostics('Scan API Response', scan);
      return;
    }
    
    if (scan.error) {
      resultDiv.textContent = 'Error: ' + scan.error;
      showDiagnostics('Scan API Error', scan);
      return;
    }
    
    // Format the date in a more readable format
    const dob = scan.DateOfBirth ? new Date(scan.DateOfBirth.replace(/-/g, '/')).toLocaleDateString() : 'N/A';
    const scanTime = scan.ScanTime ? new Date(scan.ScanTime.split(' ')[0].replace(/\//g, '-')).toLocaleString() : 'N/A';
    const expires = scan.IDExpiration ? new Date(scan.IDExpiration.replace(/-/g, '/')).toLocaleDateString() : 'N/A';
    
    resultDiv.innerHTML = `
      <div class="scan-card">
        <h3>ID Scan Result</h3>
        <div class="scan-details">
          <div class="scan-photo">
            <div class="photo-placeholder">ID Photo</div>
          </div>
          <div class="scan-info">
            <p><strong>Full Name:</strong> ${scan.FullName || 'N/A'}</p>
            <p><strong>DOB:</strong> ${dob} (Age: ${scan.Age || 'N/A'})</p>
            <p><strong>ID Number:</strong> ${scan.IDNumber || 'N/A'}</p>
            <p><strong>Expires:</strong> ${expires}</p>
            <p><strong>Scan Time:</strong> ${scanTime}</p>
          </div>
        </div>
      </div>
    `;
    
    showDiagnostics('Scan API Response', scan);
    
    // Step 2: Search for the member in Wix
    try {
      accountDiv.innerHTML = '<div class="loading">Looking up member in Wix...</div>';
      
      // Get the first name, last name, and DOB from the scan
      const firstName = scan.FirstName || '';
      const lastName = scan.LastName || '';
      const dateOfBirth = scan.DateOfBirth || '';
      
      // Search by name and DOB using either SDK or Direct API based on selected mode
      showDiagnostics('Member Search API Request', { firstName, lastName, dateOfBirth });
    
      // Use the Wix JavaScript SDK for member search as per Wix documentation
      console.log('Using Wix SDK for member search');
      const memberResult = await window.wixSdk.searchMember(
        scan.FirstName,
        scan.LastName,
        scan.DateOfBirth
      );
    
      // Show the diagnostics panel with the raw API response
      showDiagnostics('Wix SDK Response', memberResult);
      
      if (!memberResult.success) {
        accountDiv.innerHTML = `<div class="error">Wix API Error: ${memberResult.error}</div>`;
        return;
      }
      
      if (!memberResult.results || memberResult.results.length === 0) {
        accountDiv.innerHTML = '<div class="error">No matching Wix member found.</div>';
        return;
      }
    
      // Format the member data for display
      let memberHtml = `
        <div class="member-info">
          <h3>Member Found</h3>
          <p class="member-source">Source: ${memberResult.source}</p>
          <div class="member-details">
            <div class="member-name">${memberResult.results[0].firstName} ${memberResult.results[0].lastName}</div>
            <div class="member-id">ID: ${memberResult.results[0]._id || memberResult.results[0].id || 'N/A'}</div>
            <div class="member-email">Email: ${memberResult.results[0].loginEmail || memberResult.results[0].email || 'N/A'}</div>
            <div class="member-status">Status: ${memberResult.results[0].status || 'Unknown'}</div>
            <div class="member-created">Created: ${new Date(memberResult.results[0]._createdDate || memberResult.results[0].createdDate).toLocaleString()}</div>
          </div>
          <div class="member-actions">
            <button class="view-plans-btn" data-member-id="${memberResult.results[0]._id || memberResult.results[0].id}">View Plans</button>
          </div>
          <div id="plans-${memberResult.results[0]._id || memberResult.results[0].id}" class="member-plans"></div>
        </div>
      `;
      
      accountDiv.innerHTML = memberHtml;
      
      // Add event listeners for the View Plans buttons
      setTimeout(() => {
        // Set up the view plans buttons
        document.querySelectorAll('.view-plans-btn').forEach(button => {
          button.addEventListener('click', async function() {
            const memberId = this.getAttribute('data-member-id');
            const plansContainer = document.getElementById(`plans-${memberId}`);
            
            if (plansContainer) {
              plansContainer.innerHTML = '<div class="loading">Loading plans and orders...</div>';
              
              // Always use direct API for plans and orders as SDK implementation is not yet available
              const [plansResult, ordersResult] = await Promise.all([
                window.scanidAPI.getMemberPricingPlans(memberId),
                window.scanidAPI.listPricingPlanOrders({ filter: { memberId } })
              ]);
            
            // Log the results for debugging
            console.log('Plans result:', plansResult);
            console.log('Orders result:', ordersResult);
            
            // Build the HTML for plans
            let plansHtml = '';
            if (plansResult.success && plansResult.plans && plansResult.plans.length > 0) {
              plansHtml = `
                <div class="pricing-plans">
                  <h4>Current Membership Plans</h4>
                  <ul class="plans-list">
                    ${plansResult.plans.map(plan => `
                      <li class="plan-item ${plan.status === 'ACTIVE' ? 'active-plan' : 'inactive-plan'}">
                        <div class="plan-name">${plan.planName || 'Unnamed Plan'}</div>
                        <div class="plan-details">
                          <span class="plan-status">${plan.status || 'Unknown'}</span>
                          ${plan.validFrom ? `<span class="plan-dates">From: ${new Date(plan.validFrom).toLocaleDateString()}</span>` : ''}
                          ${plan.expiresAt ? `<span class="plan-dates">To: ${new Date(plan.expiresAt).toLocaleDateString()}</span>` : ''}
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `;
            } else {
              plansHtml = `<div class="no-plans">No active membership plans found</div>`;
            }
            
            // Build the HTML for orders
            let ordersHtml = '';
            if (ordersResult.success && ordersResult.orders && ordersResult.orders.length > 0) {
              ordersHtml = `
                <div class="pricing-orders">
                  <h4>Order History</h4>
                  <ul class="orders-list">
                    ${ordersResult.orders.map(order => `
                      <li class="order-item">
                        <div class="order-name">${order.planName || 'Unnamed Order'}</div>
                        <div class="order-details">
                          <span class="order-status">${order.status || 'Unknown'}</span>
                          <span class="order-id">Order ID: ${order._id || 'N/A'}</span>
                          ${order.createdDate ? `<span class="order-dates">Created: ${new Date(order.createdDate).toLocaleDateString()}</span>` : ''}
                          ${order.endDate ? `<span class="order-dates">Ends: ${new Date(order.endDate).toLocaleDateString()}</span>` : ''}
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `;
            } else {
              ordersHtml = `<div class="no-orders">No order history found</div>`;
            }
            
            // Combine plans and orders HTML
            plansContainer.innerHTML = `
              <div class="member-subscription-info">
                ${plansHtml}
                ${ordersHtml}
              </div>
            `;
          }
        });
      });
    }, 100);
    } catch (err) {
      console.error('Error processing member lookup:', err);
      accountDiv.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
  } catch (err) {
    resultDiv.textContent = 'Error: ' + err.message;
  }
}

// Original scan button click handler
document.getElementById('scan-btn').addEventListener('click', async () => {
  // Simply call the processScan function with no arguments
  // This will fetch the latest scan and process it
  await processScan();
});
