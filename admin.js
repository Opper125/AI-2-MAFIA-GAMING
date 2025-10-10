
// Supabase Configuration
const SUPABASE_URL = 'https://qcbzxalqpcppiorffpas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYnp4YWxxcGNwcGlvcmZmcGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwOTg0NTAsImV4cCI6MjA3NTY3NDQ1MH0.EQ-Wc_FJ65tuCBF3a_1_7IrKO6bJmZgN4-cJqapNoRg';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYnp4YWxxcGNwcGlvcmZmcGFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDA5ODQ1MCwiZXhwIjoyMDc1Njc0NDUwfQ.kIbGwFJCpwd2Mup1uX8JAbrgnSi4w-PFzkqGYxoGs0g';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentFilter = 'all';
let websiteSettings = null;
let allAnimations = []; // Store all animations
let currentEmojiTarget = null; // Current input field for emoji insertion
let currentSessionId = null; // Current admin session ID
let clientIpAddress = null; // Client's detected IP address
let pendingRequestCheckInterval = null; // Interval for checking pending requests

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminSystem();
});

// ==================== ENHANCED IP-BASED AUTHENTICATION SYSTEM ====================

// Initialize the admin system with IP checking
async function initializeAdminSystem() {
    showLoading();
    
    try {
        // First detect client IP address
        await detectClientIP();
        
        // Check if user has a valid session
        const savedSessionId = localStorage.getItem('adminSessionId');
        if (savedSessionId) {
            // Verify the saved session is still valid
            const isValid = await verifySavedSession(savedSessionId);
            if (isValid) {
                currentSessionId = savedSessionId;
                showDashboard();
                hideLoading();
                return;
            } else {
                localStorage.removeItem('adminSessionId');
            }
        }
        
        // Check IP authorization
        await checkIPAuthorization();
        
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoading();
        showError('System initialization failed. Please refresh the page.');
    }
}

// Detect client IP address using multiple methods
async function detectClientIP() {
    try {
        // Method 1: Use WebRTC to get local IP
        const localIP = await getLocalIP();
        if (localIP) {
            clientIpAddress = localIP;
            updateIPDisplay(localIP);
            return;
        }
        
        // Method 2: Use external service as fallback
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        clientIpAddress = data.ip;
        updateIPDisplay(data.ip);
        
    } catch (error) {
        console.error('IP detection failed:', error);
        clientIpAddress = 'unknown';
        updateIPDisplay('Unable to detect');
    }
}

// Get local IP using WebRTC
function getLocalIP() {
    return new Promise((resolve, reject) => {
        const pc = new RTCPeerConnection({iceServers: []});
        let ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
        let ipAddress = null;
        
        pc.createDataChannel("");
        
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (ice) => {
            if (!ice || !ice.candidate || !ice.candidate.candidate) return;
            
            let match = ice.candidate.candidate.match(ipRegex);
            if (match) {
                ipAddress = match[1];
                resolve(ipAddress);
                pc.close();
            }
        };
        
        // Timeout after 3 seconds
        setTimeout(() => {
            if (!ipAddress) {
                pc.close();
                resolve(null);
            }
        }, 3000);
    });
}

// Update IP display in UI
function updateIPDisplay(ip) {
    const displays = ['clientIpDisplay', 'authorizedIpDisplay', 'sessionIp'];
    displays.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = ip;
        }
    });
}

// Check if current IP is authorized
async function checkIPAuthorization() {
    try {
        const { data, error } = await supabase
            .rpc('check_ip_authorization', { client_ip: clientIpAddress });

        if (error) throw error;

        if (data.authorized) {
            // IP is authorized, show login form
            showLoginForm();
            document.getElementById('authStatus').textContent = 'Authorized ✅';
            document.getElementById('authStatus').className = 'status-authorized';
        } else {
            // IP is not authorized, show request access option
            showIPCheckScreen();
            document.getElementById('authStatus').textContent = 'Not Authorized ❌';
            document.getElementById('authStatus').className = 'status-unauthorized';
            document.getElementById('ipActions').style.display = 'block';
        }
        
    } catch (error) {
        console.error('IP authorization check failed:', error);
        showError('Unable to verify IP authorization. Please try again.');
    } finally {
        hideLoading();
    }
}

// Show IP check screen
function showIPCheckScreen() {
    document.getElementById('ipCheckScreen').style.display = 'flex';
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('ipCheckMessage').textContent = 'Your IP address authorization is being verified...';
}

// Show login form
function showLoginForm() {
    document.getElementById('ipCheckScreen').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('continueLoginBtn').style.display = 'block';
}

// Show dashboard
function showDashboard() {
    document.getElementById('ipCheckScreen').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadAllData();
    startPendingRequestsCheck();
}

// Request access for unauthorized IP
async function requestAccess() {
    if (!clientIpAddress || clientIpAddress === 'unknown') {
        showError('Unable to detect your IP address. Please refresh the page.');
        return;
    }

    const deviceInfo = navigator.platform || 'Unknown Device';
    const browserInfo = navigator.userAgent.includes('Chrome') ? 'Chrome' :
                       navigator.userAgent.includes('Firefox') ? 'Firefox' :
                       navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown Browser';
    
    showLoading();

    try {
        const { data, error } = await supabase
            .rpc('create_auth_request', {
                client_ip: clientIpAddress,
                device_info: deviceInfo,
                browser_info: browserInfo,
                location_info: null,
                user_agent: navigator.userAgent
            });

        if (error) throw error;

        if (data.success) {
            // Hide request button and show waiting state
            document.getElementById('ipActions').style.display = 'none';
            document.getElementById('waitingApproval').style.display = 'block';
            
            // Start checking approval status
            startApprovalCheck();
        } else {
            showError(data.message);
        }

    } catch (error) {
        console.error('Request access error:', error);
        showError('Failed to send access request. Please try again.');
    } finally {
        hideLoading();
    }
}

// Start checking for approval status
function startApprovalCheck() {
    const checkInterval = setInterval(async () => {
        try {
            const { data, error } = await supabase
                .rpc('check_ip_authorization', { client_ip: clientIpAddress });

            if (error) throw error;

            if (data.authorized) {
                clearInterval(checkInterval);
                showSuccess('Access approved! You can now login.');
                setTimeout(showLoginForm, 2000);
            }

        } catch (error) {
            console.error('Approval check error:', error);
        }
    }, 5000); // Check every 5 seconds

    // Stop checking after 10 minutes
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 600000);
}

// Check approval status manually
async function checkApprovalStatus() {
    showLoading();
    await checkIPAuthorization();
}

// Verify saved session
async function verifySavedSession(sessionId) {
    try {
        const { data, error } = await supabase
            .from('admin_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('ip_address', clientIpAddress)
            .eq('is_active', true)
            .eq('is_authorized', true)
            .single();

        return !error && data;
    } catch (error) {
        return false;
    }
}

// Enhanced admin login with IP verification
async function adminLogin(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput.value.trim();
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.querySelector('.btn-login');

    if (!password) {
        showError(errorEl, 'Please enter a password!');
        return;
    }

    if (!clientIpAddress) {
        showError(errorEl, 'Unable to verify your IP address. Please refresh the page.');
        return;
    }

    // Add loading state
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;

    try {
        // Verify admin login with IP check
        const { data, error } = await supabase
            .rpc('verify_admin_login', { 
                client_ip: clientIpAddress,
                input_password: password 
            });

        if (error) throw error;

        if (data.success) {
            // Login successful
            currentSessionId = data.session_id;
            localStorage.setItem('adminSessionId', currentSessionId);
            
            showSuccess(errorEl, 'Login successful! Redirecting...');
            
            setTimeout(() => {
                showDashboard();
            }, 1000);
        } else {
            // Login failed
            showError(errorEl, data.message);
        }

    } catch (error) {
        console.error('Login error:', error);
        showError(errorEl, 'Login failed. Please try again.');
    } finally {
        // Remove loading state
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        passwordInput.value = '';
    }
}

// Admin logout
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminSessionId');
        currentSessionId = null;
        stopPendingRequestsCheck();
        location.reload();
    }
}

// Change admin password
async function changeAdminPassword() {
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }

    if (newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (!currentSessionId) {
        alert('Session not found. Please login again.');
        return;
    }

    showLoading();

    try {
        // First verify current password
        const { data: loginData, error: verifyError } = await supabase
            .rpc('verify_admin_login', { 
                client_ip: clientIpAddress,
                input_password: currentPassword 
            });

        if (verifyError) throw verifyError;

        if (!loginData.success) {
            hideLoading();
            alert('Current password is incorrect');
            return;
        }

        // Update password
        const { data, error } = await supabase
            .rpc('update_admin_password_by_session', { 
                session_id: currentSessionId,
                new_password: newPassword 
            });

        if (error) throw error;

        if (data.success) {
            hideLoading();
            alert('Password changed successfully! You will be logged out.');
            localStorage.removeItem('adminSessionId');
            location.reload();
        } else {
            hideLoading();
            alert('Error changing password: ' + data.message);
        }

    } catch (error) {
        hideLoading();
        console.error('Password change error:', error);
        alert('Error changing password: ' + error.message);
    }
}

// ==================== IP MANAGEMENT FUNCTIONS ====================

// Load pending authorization requests
async function loadPendingRequests() {
    try {
        const { data, error } = await supabase
            .rpc('get_pending_requests');

        if (error) throw error;

        const container = document.getElementById('pendingRequestsContainer');
        const requests = data || [];

        if (requests.length === 0) {
            container.innerHTML = '<p class="no-data">No pending requests</p>';
            document.getElementById('pendingRequestsBadge').style.display = 'none';
            return;
        }

        // Update notification badge
        const badge = document.getElementById('pendingRequestsBadge');
        badge.textContent = requests.length;
        badge.style.display = 'block';

        // Display requests
        container.innerHTML = requests.map(request => `
            <div class="request-card">
                <div class="request-header">
                    <h4>🔑 Access Request</h4>
                    <span class="request-time">${new Date(request.requested_at).toLocaleString()}</span>
                </div>
                <div class="request-details">
                    <p><strong>IP Address:</strong> ${request.ip_address}</p>
                    <p><strong>Device:</strong> ${request.device_info || 'Unknown'}</p>
                    <p><strong>Browser:</strong> ${request.browser_info || 'Unknown'}</p>
                    <p><strong>Expires:</strong> ${new Date(request.expires_at).toLocaleString()}</p>
                </div>
                <div class="request-actions">
                    <button onclick="viewRequestDetails(${request.id})" class="btn-secondary">
                        📋 Details
                    </button>
                    <button onclick="approveRequest(${request.id})" class="btn-success">
                        ✅ Approve
                    </button>
                    <button onclick="rejectRequest(${request.id})" class="btn-danger">
                        ❌ Reject
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading pending requests:', error);
    }
}

// View request details
async function viewRequestDetails(requestId) {
    try {
        const { data, error } = await supabase
            .from('admin_auth_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error) throw error;

        const modalBody = document.getElementById('ipRequestModalBody');
        modalBody.innerHTML = `
            <div class="request-details-full">
                <h3>Authorization Request Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Request ID:</label>
                        <span>${data.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>IP Address:</label>
                        <span>${data.ip_address}</span>
                    </div>
                    <div class="detail-item">
                        <label>Device Info:</label>
                        <span>${data.device_info || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Browser Info:</label>
                        <span>${data.browser_info || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Location Info:</label>
                        <span>${data.location_info || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <label>User Agent:</label>
                        <span style="font-size: 12px; word-break: break-all;">${data.user_agent || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Requested At:</label>
                        <span>${new Date(data.requested_at).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Expires At:</label>
                        <span>${new Date(data.expires_at).toLocaleString()}</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="closeIpRequestModal(); approveRequest(${requestId})" class="btn-success">
                        ✅ Approve Request
                    </button>
                    <button onclick="closeIpRequestModal(); rejectRequest(${requestId})" class="btn-danger">
                        ❌ Reject Request
                    </button>
                </div>
            </div>
        `;

        document.getElementById('ipRequestModal').classList.add('active');

    } catch (error) {
        console.error('Error loading request details:', error);
        alert('Error loading request details');
    }
}

// Approve request
async function approveRequest(requestId) {
    const password = prompt('Enter password for the new admin access:');
    if (!password) return;

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    showLoading();

    try {
        const { data, error } = await supabase
            .rpc('approve_auth_request', {
                request_id: requestId,
                approver_session_id: currentSessionId,
                new_password: password
            });

        if (error) throw error;

        if (data.success) {
            hideLoading();
            alert('Access request approved successfully!');
            await loadPendingRequests();
            await loadAdminSessions();
        } else {
            hideLoading();
            alert('Error approving request: ' + data.message);
        }

    } catch (error) {
        hideLoading();
        console.error('Error approving request:', error);
        alert('Error approving request');
    }
}

// Reject request
async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this access request?')) return;

    showLoading();

    try {
        const { data, error } = await supabase
            .rpc('reject_auth_request', { request_id: requestId });

        if (error) throw error;

        if (data.success) {
            hideLoading();
            alert('Access request rejected');
            await loadPendingRequests();
        } else {
            hideLoading();
            alert('Error rejecting request: ' + data.message);
        }

    } catch (error) {
        hideLoading();
        console.error('Error rejecting request:', error);
        alert('Error rejecting request');
    }
}

// Create new admin access manually
async function createNewAdmin() {
    const ipAddress = document.getElementById('newAdminIp').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const deviceInfo = document.getElementById('newAdminDevice').value.trim() || 'Manual Creation';

    if (!ipAddress || !password) {
        alert('Please enter IP address and password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^fe80::[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){3}$/;
    
    if (!ipRegex.test(ipAddress)) {
        alert('Please enter a valid IP address');
        return;
    }

    showLoading();

    try {
        const { data, error } = await supabase
            .rpc('create_admin_password', {
                target_ip: ipAddress,
                new_password: password,
                device_info: deviceInfo
            });

        if (error) throw error;

        if (data.success) {
            hideLoading();
            alert(`Admin access created successfully!\n\nIP: ${data.ip_address}\nPassword: ${data.password}`);
            
            // Clear form
            document.getElementById('newAdminIp').value = '';
            document.getElementById('newAdminPassword').value = '';
            document.getElementById('newAdminDevice').value = '';
            
            await loadAdminSessions();
        } else {
            hideLoading();
            alert('Error creating admin access: ' + data.message);
        }

    } catch (error) {
        hideLoading();
        console.error('Error creating admin:', error);
        alert('Error creating admin access');
    }
}

// Load admin sessions
async function loadAdminSessions() {
    try {
        const { data, error } = await supabase
            .rpc('get_all_admin_sessions');

        if (error) throw error;

        const container = document.getElementById('adminSessionsContainer');
        const sessions = data || [];

        if (sessions.length === 0) {
            container.innerHTML = '<p class="no-data">No admin sessions found</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="session-card ${session.id === currentSessionId ? 'current-session' : ''}">
                <div class="session-header">
                    <h4>
                        ${session.id === currentSessionId ? '🟢 Current Session' : '👤 Admin Session'}
                        ${!session.is_active ? ' (Inactive)' : ''}
                    </h4>
                    <span class="session-time">Created: ${new Date(session.created_at).toLocaleString()}</span>
                </div>
                <div class="session-details">
                    <p><strong>IP Address:</strong> ${session.ip_address}</p>
                    <p><strong>Password:</strong> <code>${session.plain_password}</code></p>
                    <p><strong>Device:</strong> ${session.device_info || 'Unknown'}</p>
                    <p><strong>Status:</strong> 
                        <span class="status ${session.is_active ? 'active' : 'inactive'}">
                            ${session.is_active ? 'Active' : 'Inactive'}
                        </span>
                        ${session.is_authorized ? '✅ Authorized' : '❌ Not Authorized'}
                    </p>
                    <p><strong>Last Login:</strong> ${session.last_login ? new Date(session.last_login).toLocaleString() : 'Never'}</p>
                    <p><strong>Login Attempts:</strong> ${session.login_attempts}</p>
                </div>
                ${session.id !== currentSessionId ? `
                <div class="session-actions">
                    <button onclick="revokeSession(${session.id})" class="btn-danger">
                        🚫 Revoke Access
                    </button>
                </div>
                ` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading admin sessions:', error);
    }
}

// Revoke admin session
async function revokeSession(sessionId) {
    if (!confirm('Are you sure you want to revoke this admin session?')) return;

    showLoading();

    try {
        const { data, error } = await supabase
            .rpc('revoke_admin_session', { session_id: sessionId });

        if (error) throw error;

        if (data.success) {
            hideLoading();
            alert('Admin session revoked successfully');
            await loadAdminSessions();
        } else {
            hideLoading();
            alert('Error revoking session: ' + data.message);
        }

    } catch (error) {
        hideLoading();
        console.error('Error revoking session:', error);
        alert('Error revoking session');
    }
}

// Refresh pending requests
async function refreshPendingRequests() {
    await loadPendingRequests();
}

// Start checking for pending requests periodically
function startPendingRequestsCheck() {
    // Load initially
    loadPendingRequests();
    
    // Check every 30 seconds
    pendingRequestCheckInterval = setInterval(loadPendingRequests, 30000);
}

// Stop checking for pending requests
function stopPendingRequestsCheck() {
    if (pendingRequestCheckInterval) {
        clearInterval(pendingRequestCheckInterval);
        pendingRequestCheckInterval = null;
    }
}

// Close IP request modal
function closeIpRequestModal() {
    document.getElementById('ipRequestModal').classList.remove('active');
}

// ==================== UTILITY FUNCTIONS ====================

// Loading functions
function showLoading() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoading() {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 500);
}

// Error and success message functions
function showError(element, message) {
    if (typeof element === 'string') {
        alert(element);
        return;
    }
    element.textContent = message;
    element.className = 'error-message show';
    setTimeout(() => {
        element.className = 'error-message';
    }, 5000);
}

function showSuccess(element, message) {
    if (typeof element === 'string') {
        alert(element);
        return;
    }
    element.textContent = message;
    element.className = 'success-message show';
    setTimeout(() => {
        element.className = 'success-message';
    }, 5000);
}

// Switch Section
function switchSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    loadSectionData(sectionName);
}

async function loadAllData() {
    await Promise.all([
        loadWebsiteSettings(),
        loadCategories(),
        loadBanners(),
        loadAnimations() // Load animations globally
    ]);
}

// Load Section Data
function loadSectionData(section) {
    switch(section) {
        case 'website-settings':
            loadWebsiteSettings();
            break;
        case 'banners':
            loadBanners();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'buttons':
            loadCategoryButtons();
            loadCategoriesForSelect();
            break;
        case 'tables':
            loadInputTables();
            loadCategoriesForSelect();
            break;
        case 'menus':
            loadMenus();
            loadCategoriesForSelect();
            break;
        case 'payments':
            loadPaymentMethods();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'videos':
            loadVideos();
            loadCategoriesForSelect();
            break;
        case 'animations':
            loadAnimations();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// ==================== FILE UPLOAD HELPER ====================

async function uploadFile(file, folder) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('website-assets')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('website-assets')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

// ==================== ANIMATIONS/EMOJI SYSTEM ====================

// Load All Animations
async function loadAnimations() {
    try {
        console.log('✨ Loading animations...');
        const { data, error } = await supabase
            .from('animations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allAnimations = data || [];
        console.log(`✅ Loaded ${allAnimations.length} animations`);
        
        displayAnimations(allAnimations);
    } catch (error) {
        console.error('❌ Error loading animations:', error);
        allAnimations = [];
    }
}

// Display Animations
function displayAnimations(animations) {
    const container = document.getElementById('animationsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (animations.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px;">No animations yet. Upload your first animation!</p>';
        return;
    }

    animations.forEach(anim => {
        const item = document.createElement('div');
        item.className = 'animation-item';
        
        let preview = '';
        if (anim.file_type === 'gif' || anim.file_type === 'png' || anim.file_type === 'jpg' || anim.file_type === 'jpeg') {
            preview = `<img src="${anim.file_url}" alt="${anim.name}">`;
        } else if (anim.file_type === 'video' || anim.file_type === 'webm' || anim.file_type === 'mp4') {
            preview = `<video autoplay loop muted><source src="${anim.file_url}" type="video/${anim.file_type}"></video>`;
        } else if (anim.file_type === 'json') {
            preview = `<img src="${anim.file_url}" alt="${anim.name}">`;
        }

        item.innerHTML = `
            <div class="animation-preview">${preview}</div>
            <div class="animation-name">${anim.name}</div>
            <div class="animation-type">${anim.file_type.toUpperCase()}</div>
            <button class="animation-delete" onclick="deleteAnimation(${anim.id})">×</button>
        `;

        container.appendChild(item);
    });
}

// Upload Animation
async function uploadAnimation() {
    const name = document.getElementById('animationName').value.trim();
    const file = document.getElementById('animationFile').files[0];

    if (!name || !file) {
        alert('Please enter name and select file');
        return;
    }

    showLoading();

    try {
        // Upload file
        const fileUrl = await uploadFile(file, 'animations');
        
        if (!fileUrl) {
            throw new Error('File upload failed');
        }

        // Get file type
        const fileExt = file.name.split('.').pop().toLowerCase();
        
        // Insert into database
        const { data, error } = await supabase
            .from('animations')
            .insert([{
                name: name,
                file_url: fileUrl,
                file_type: fileExt,
                file_size: file.size,
                width: null,
                height: null
            }])
            .select()
            .single();

        if (error) throw error;

        hideLoading();
        alert('✅ Animation uploaded successfully!');
        
        // Reset form
        document.getElementById('animationName').value = '';
        document.getElementById('animationFile').value = '';
        document.getElementById('animationFileInfo').innerHTML = '';
        
        // Reload animations
        await loadAnimations();

    } catch (error) {
        hideLoading();
        console.error('❌ Upload error:', error);
        alert('Error uploading animation: ' + error.message);
    }
}

// Delete Animation
async function deleteAnimation(id) {
    if (!confirm('Delete this animation?')) return;

    showLoading();

    try {
        const { error } = await supabase
            .from('animations')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('✅ Animation deleted!');
        await loadAnimations();

    } catch (error) {
        hideLoading();
        console.error('❌ Delete error:', error);
        alert('Error deleting animation');
    }
}

// Show file info when selected
document.addEventListener('DOMContentLoaded', () => {
    const animFileInput = document.getElementById('animationFile');
    if (animFileInput) {
        animFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const infoDiv = document.getElementById('animationFileInfo');
            
            if (file) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                infoDiv.innerHTML = `
                    <strong>File:</strong> ${file.name}<br>
                    <strong>Type:</strong> ${file.type}<br>
                    <strong>Size:</strong> ${sizeMB} MB
                `;
            } else {
                infoDiv.innerHTML = '';
            }
        });
    }
});

// ==================== EMOJI PICKER ====================

// Open Emoji Picker for specific input
function openEmojiPicker(inputId) {
    currentEmojiTarget = document.getElementById(inputId);
    if (!currentEmojiTarget) return;

    const modal = document.getElementById('emojiPickerModal');
    const grid = document.getElementById('emojiGrid');
    
    // Load emoji grid
    grid.innerHTML = '';
    
    if (allAnimations.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px;">No animations available. Upload some first!</p>';
    } else {
        allAnimations.forEach(anim => {
            const item = document.createElement('div');
            item.className = 'emoji-item';
            item.onclick = () => insertEmoji(anim);
            
            let preview = '';
            if (anim.file_type === 'gif' || anim.file_type === 'png' || anim.file_type === 'jpg' || anim.file_type === 'jpeg') {
                preview = `<img src="${anim.file_url}" alt="${anim.name}">`;
            } else if (anim.file_type === 'video' || anim.file_type === 'webm' || anim.file_type === 'mp4') {
                preview = `<video autoplay loop muted><source src="${anim.file_url}" type="video/${anim.file_type}"></video>`;
            } else {
                preview = `<img src="${anim.file_url}" alt="${anim.name}">`;
            }
            
            item.innerHTML = `
                ${preview}
                <div class="emoji-item-name">${anim.name}</div>
            `;
            
            grid.appendChild(item);
        });
    }
    
    modal.classList.add('active');
}

// Open Emoji Picker for class-based inputs
function openEmojiPickerForClass(button, className) {
    const inputGroup = button.closest('.table-input-group, .menu-input-group');
    if (inputGroup) {
        currentEmojiTarget = inputGroup.querySelector('.' + className);
    } else {
        currentEmojiTarget = button.previousElementSibling;
    }
    
    if (!currentEmojiTarget) return;

    const modal = document.getElementById('emojiPickerModal');
    const grid = document.getElementById('emojiGrid');
    
    grid.innerHTML = '';
    
    if (allAnimations.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px;">No animations available</p>';
    } else {
        allAnimations.forEach(anim => {
            const item = document.createElement('div');
            item.className = 'emoji-item';
            item.onclick = () => insertEmoji(anim);
            
            let preview = '';
            if (anim.file_type === 'gif' || anim.file_type === 'png' || anim.file_type === 'jpg' || anim.file_type === 'jpeg') {
                preview = `<img src="${anim.file_url}" alt="${anim.name}">`;
            } else if (anim.file_type === 'video' || anim.file_type === 'webm' || anim.file_type === 'mp4') {
                preview = `<video autoplay loop muted><source src="${anim.file_url}" type="video/${anim.file_type}"></video>`;
            } else {
                preview = `<img src="${anim.file_url}" alt="${anim.name}">`;
            }
            
            item.innerHTML = `
                ${preview}
                <div class="emoji-item-name">${anim.name}</div>
            `;
            
            grid.appendChild(item);
        });
    }
    
    modal.classList.add('active');
}

// Insert Emoji into target input
function insertEmoji(animation) {
    if (!currentEmojiTarget) return;

    const cursorPos = currentEmojiTarget.selectionStart || currentEmojiTarget.value.length;
    const textBefore = currentEmojiTarget.value.substring(0, cursorPos);
    const textAfter = currentEmojiTarget.value.substring(cursorPos);
    
    // Insert emoji marker: {anim:ID:URL:TYPE}
    const emojiCode = `{anim:${animation.id}:${animation.file_url}:${animation.file_type}}`;
    
    currentEmojiTarget.value = textBefore + emojiCode + textAfter;
    
    // Set cursor position after emoji
    const newPos = cursorPos + emojiCode.length;
    currentEmojiTarget.setSelectionRange(newPos, newPos);
    currentEmojiTarget.focus();
    
    closeEmojiPicker();
}

// Close Emoji Picker
function closeEmojiPicker() {
    document.getElementById('emojiPickerModal').classList.remove('active');
    currentEmojiTarget = null;
}

// Filter Emojis
function filterEmojis() {
    const searchTerm = document.getElementById('emojiSearch').value.toLowerCase();
    const items = document.querySelectorAll('.emoji-item');
    
    items.forEach(item => {
        const name = item.querySelector('.emoji-item-name').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Render Animated Emojis in HTML
function renderAnimatedText(text) {
    if (!text) return text;
    
    // Replace {anim:ID:URL:TYPE} with actual HTML
    return text.replace(/\{anim:(\d+):([^:]+):([^}]+)\}/g, (match, id, url, type) => {
        if (type === 'gif' || type === 'png' || type === 'jpg' || type === 'jpeg') {
            return `<span class="animated-emoji"><img src="${url}" alt="emoji"></span>`;
        } else if (type === 'video' || type === 'webm' || type === 'mp4') {
            return `<span class="animated-emoji"><video autoplay loop muted><source src="${url}" type="video/${type}"></video></span>`;
        } else {
            return `<span class="animated-emoji"><img src="${url}" alt="emoji"></span>`;
        }
    });
}

// ==================== WEBSITE SETTINGS ====================

async function loadWebsiteSettings() {
    try {
        const { data, error } = await supabase
            .from('website_settings')
            .select('*')
            .single();

        if (data) {
            websiteSettings = data;
            document.getElementById('websiteName').value = data.website_name || '';
            
            if (data.logo_url) {
                document.getElementById('logoPreview').innerHTML = `<img src="${data.logo_url}">`;
            }
            if (data.background_url) {
                document.getElementById('bgPreview').innerHTML = `<img src="${data.background_url}">`;
            }
            if (data.loading_animation_url) {
                document.getElementById('loadingPreview').innerHTML = `<img src="${data.loading_animation_url}">`;
            }
            if (data.button_style_url) {
                document.getElementById('buttonPreview').innerHTML = `<img src="${data.button_style_url}">`;
            }
        } else {
            await supabase.from('website_settings').insert([{
                website_name: 'Gaming Store'
            }]);
            loadWebsiteSettings();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function updateWebsiteName() {
    const name = document.getElementById('websiteName').value;
    showLoading();

    try {
        const { error } = await supabase
            .from('website_settings')
            .update({ website_name: name })
            .eq('id', websiteSettings.id);

        if (error) throw error;

        hideLoading();
        alert('Website name updated!');
        loadWebsiteSettings();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

function previewLogo() {
    const file = document.getElementById('logoFile').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('logoPreview').innerHTML = `<img src="${e.target.result}">`;
        };
        reader.readAsDataURL(file);
    }
}

async function uploadLogo() {
    const file = document.getElementById('logoFile').files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'logos');
    
    if (url) {
        await updateSettings({ logo_url: url });
        hideLoading();
        alert('Logo uploaded!');
    } else {
        hideLoading();
        alert('Error uploading');
    }
}

function previewBackground() {
    const file = document.getElementById('bgFile').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('bgPreview').innerHTML = `<img src="${e.target.result}">`;
        };
        reader.readAsDataURL(file);
    }
}

async function uploadBackground() {
    const file = document.getElementById('bgFile').files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'backgrounds');
    
    if (url) {
        await updateSettings({ background_url: url });
        hideLoading();
        alert('Background uploaded!');
    } else {
        hideLoading();
        alert('Error uploading');
    }
}

async function uploadLoadingAnimation() {
    const file = document.getElementById('loadingFile').files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'animations');
    
    if (url) {
        await updateSettings({ loading_animation_url: url });
        hideLoading();
        alert('Loading animation uploaded!');
    } else {
        hideLoading();
        alert('Error uploading');
    }
}

async function uploadButtonStyle() {
    const file = document.getElementById('buttonFile').files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'buttons');
    
    if (url) {
        await updateSettings({ button_style_url: url });
        hideLoading();
        alert('Button style uploaded!');
    } else {
        hideLoading();
        alert('Error uploading');
    }
}

async function updateSettings(updates) {
    try {
        const { error } = await supabase
            .from('website_settings')
            .update(updates)
            .eq('id', websiteSettings.id);

        if (error) throw error;
        loadWebsiteSettings();
    } catch (error) {
        console.error('Error updating settings:', error);
    }
}

// ==================== BANNERS ====================

async function loadBanners() {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('created_at', { ascending: false });

        const container = document.getElementById('bannersContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(banner => {
                container.innerHTML += `
                    <div class="item-card">
                        <img src="${banner.image_url}" alt="Banner">
                        <div class="item-actions">
                            <button class="btn-danger" onclick="deleteBanner(${banner.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No banners yet</p>';
        }
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

async function addBanner() {
    const file = document.getElementById('bannerFile').files[0];
    if (!file) {
        alert('Please select a banner image');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'banners');
    
    if (url) {
        try {
            const { error } = await supabase
                .from('banners')
                .insert([{ image_url: url }]);

            if (error) throw error;

            hideLoading();
            alert('Banner added!');
            document.getElementById('bannerFile').value = '';
            loadBanners();
        } catch (error) {
            hideLoading();
            alert('Error adding banner');
            console.error(error);
        }
    } else {
        hideLoading();
        alert('Error uploading');
    }
}

async function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Banner deleted!');
        loadBanners();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== CATEGORIES ====================

async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });

        const container = document.getElementById('categoriesContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(category => {
                const titleHtml = renderAnimatedText(category.title);
                container.innerHTML += `
                    <div class="item-card">
                        <h4>${titleHtml}</h4>
                        <p>Created: ${new Date(category.created_at).toLocaleDateString()}</p>
                        <div class="item-actions">
                            <button class="btn-secondary" onclick="editCategory(${category.id}, '${category.title.replace(/'/g, "\\'")}')">Edit</button>
                            <button class="btn-danger" onclick="deleteCategory(${category.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No categories yet</p>';
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function addCategory() {
    const title = document.getElementById('categoryTitle').value.trim();
    if (!title) {
        alert('Please enter a category title');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('categories')
            .insert([{ title: title }]);

        if (error) throw error;

        hideLoading();
        alert('Category added!');
        document.getElementById('categoryTitle').value = '';
        loadCategories();
        loadCategoriesForSelect();
    } catch (error) {
        hideLoading();
        alert('Error adding category');
        console.error(error);
    }
}

async function editCategory(id, currentTitle) {
    const newTitle = prompt('Enter new category title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('categories')
            .update({ title: newTitle })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Category updated!');
        loadCategories();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? All related data will be deleted!')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Category deleted!');
        loadCategories();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== CATEGORY BUTTONS ====================

async function loadCategoriesForSelect() {
    try {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });

        const selects = [
            'buttonCategorySelect',
            'tableCategorySelect',
            'menuCategorySelect',
            'videoCategorySelect'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Category</option>';
                if (data) {
                    data.forEach(cat => {
                        const titleText = cat.title.replace(/\{anim:[^}]+\}/g, ''); // Remove emoji codes for select
                        select.innerHTML += `<option value="${cat.id}">${titleText}</option>`;
                    });
                }
            }
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadCategoryButtons() {
    try {
        const { data, error } = await supabase
            .from('category_buttons')
            .select(`
                *,
                categories (title)
            `)
            .order('created_at', { ascending: true });

        const container = document.getElementById('buttonsContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(button => {
                const nameHtml = renderAnimatedText(button.name);
                const categoryHtml = renderAnimatedText(button.categories.title);
                container.innerHTML += `
                    <div class="item-card">
                        <img src="${button.icon_url}" alt="${button.name}">
                        <h4>${nameHtml}</h4>
                        <p>Category: ${categoryHtml}</p>
                        <div class="item-actions">
                            <button class="btn-secondary" onclick="editButton(${button.id})">Edit</button>
                            <button class="btn-danger" onclick="deleteButton(${button.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No buttons yet</p>';
        }
    } catch (error) {
        console.error('Error loading buttons:', error);
    }
}

async function addCategoryButton() {
    const categoryId = document.getElementById('buttonCategorySelect').value;
    const name = document.getElementById('buttonName').value.trim();
    const file = document.getElementById('buttonIconFile').files[0];

    if (!categoryId || !name || !file) {
        alert('Please fill all fields and select an icon');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'category-icons');
    
    if (url) {
        try {
            const { error } = await supabase
                .from('category_buttons')
                .insert([{
                    category_id: categoryId,
                    name: name,
                    icon_url: url
                }]);

            if (error) throw error;

            hideLoading();
            alert('Button added!');
            document.getElementById('buttonName').value = '';
            document.getElementById('buttonIconFile').value = '';
            loadCategoryButtons();
        } catch (error) {
            hideLoading();
            alert('Error adding button');
            console.error(error);
        }
    } else {
        hideLoading();
        alert('Error uploading icon');
    }
}

async function editButton(id) {
    const { data: button } = await supabase
        .from('category_buttons')
        .select('*')
        .eq('id', id)
        .single();

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label>Name</label>
            <div class="input-with-emoji">
                <input type="text" id="editButtonName" value="${button.name}">
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editButtonName')">😀</button>
            </div>
        </div>
        <button class="btn-primary" onclick="updateButton(${id})">Save Changes</button>
    `;

    document.getElementById('editModal').classList.add('active');
}

async function updateButton(id) {
    const name = document.getElementById('editButtonName').value.trim();

    if (!name) {
        alert('Please enter a name');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('category_buttons')
            .update({ name: name })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        closeEditModal();
        alert('Button updated!');
        loadCategoryButtons();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

async function deleteButton(id) {
    if (!confirm('Delete this button? All related data will be deleted!')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('category_buttons')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Button deleted!');
        loadCategoryButtons();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== INPUT TABLES ====================

async function loadButtonsForTables() {
    const categoryId = document.getElementById('tableCategorySelect').value;
    if (!categoryId) {
        document.getElementById('tableButtonSelect').innerHTML = '<option value="">Select Button</option>';
        return;
    }

    try {
        const { data } = await supabase
            .from('category_buttons')
            .select('*')
            .eq('category_id', categoryId);

        const select = document.getElementById('tableButtonSelect');
        select.innerHTML = '<option value="">Select Button</option>';
        
        if (data) {
            data.forEach(btn => {
                const nameText = btn.name.replace(/\{anim:[^}]+\}/g, '');
                select.innerHTML += `<option value="${btn.id}">${nameText}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading buttons:', error);
    }
}

function addTableInput() {
    const container = document.getElementById('tablesInputContainer');
    const newInput = document.createElement('div');
    newInput.className = 'table-input-group';
    newInput.innerHTML = `
        <button class="remove-input" onclick="this.parentElement.remove()">×</button>
        <div class="input-with-emoji">
            <input type="text" class="table-name" placeholder="Table Name">
            <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'table-name')">😀</button>
        </div>
        <div class="input-with-emoji">
            <input type="text" class="table-instruction" placeholder="Instruction">
            <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'table-instruction')">😀</button>
        </div>
    `;
    container.appendChild(newInput);
}

async function saveTables() {
    const buttonId = document.getElementById('tableButtonSelect').value;
    if (!buttonId) {
        alert('Please select a button');
        return;
    }

    const tables = [];
    document.querySelectorAll('.table-input-group').forEach(group => {
        const name = group.querySelector('.table-name').value.trim();
        const instruction = group.querySelector('.table-instruction').value.trim();
        if (name && instruction) {
            tables.push({
                button_id: buttonId,
                name: name,
                instruction: instruction
            });
        }
    });

    if (tables.length === 0) {
        alert('Please add at least one table');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('input_tables')
            .insert(tables);

        if (error) throw error;

        hideLoading();
        alert('Tables saved!');
        document.getElementById('tablesInputContainer').innerHTML = `
            <div class="table-input-group">
                <div class="input-with-emoji">
                    <input type="text" class="table-name" placeholder="Table Name">
                    <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'table-name')">😀</button>
                </div>
                <div class="input-with-emoji">
                    <input type="text" class="table-instruction" placeholder="Instruction">
                    <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'table-instruction')">😀</button>
                </div>
            </div>
        `;
        loadInputTables();
    } catch (error) {
        hideLoading();
        alert('Error saving tables');
        console.error(error);
    }
}

async function loadInputTables() {
    try {
        const { data, error } = await supabase
            .from('input_tables')
            .select(`
                *,
                category_buttons (name, categories (title))
            `)
            .order('created_at', { ascending: true });

        const container = document.getElementById('tablesContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(table => {
                const nameHtml = renderAnimatedText(table.name);
                const instructionHtml = renderAnimatedText(table.instruction);
                const buttonNameHtml = renderAnimatedText(table.category_buttons.name);
                const categoryHtml = renderAnimatedText(table.category_buttons.categories.title);
                
                container.innerHTML += `
                    <div class="item-card">
                        <h4>${nameHtml}</h4>
                        <p>Button: ${buttonNameHtml}</p>
                        <p>Category: ${categoryHtml}</p>
                        <p>Instruction: ${instructionHtml}</p>
                        <div class="item-actions">
                            <button class="btn-danger" onclick="deleteTable(${table.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No tables yet</p>';
        }
    } catch (error) {
        console.error('Error loading tables:', error);
    }
}

async function deleteTable(id) {
    if (!confirm('Delete?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('input_tables')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Table deleted!');
        loadInputTables();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== MENUS/PRODUCTS ====================

async function loadButtonsForMenus() {
    const categoryId = document.getElementById('menuCategorySelect').value;
    if (!categoryId) {
        document.getElementById('menuButtonSelect').innerHTML = '<option value="">Select Button</option>';
        return;
    }

    try {
        const { data } = await supabase
            .from('category_buttons')
            .select('*')
            .eq('category_id', categoryId);

        const select = document.getElementById('menuButtonSelect');
        select.innerHTML = '<option value="">Select Button</option>';
        
        if (data) {
            data.forEach(btn => {
                const nameText = btn.name.replace(/\{anim:[^}]+\}/g, '');
                select.innerHTML += `<option value="${btn.id}">${nameText}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading buttons:', error);
    }
}

function addMenuInput() {
    const container = document.getElementById('menusInputContainer');
    const newInput = document.createElement('div');
    newInput.className = 'menu-input-group';
    newInput.innerHTML = `
        <button class="remove-input" onclick="this.parentElement.remove()">×</button>
        <div class="input-with-emoji">
            <input type="text" class="menu-name" placeholder="Product Name">
            <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'menu-name')">😀</button>
        </div>
        <div class="input-with-emoji">
            <input type="text" class="menu-amount" placeholder="Amount/Details">
            <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'menu-amount')">😀</button>
        </div>
        <input type="number" class="menu-price" placeholder="Price">
    `;
    container.appendChild(newInput);
}

async function saveMenus() {
    const buttonId = document.getElementById('menuButtonSelect').value;
    if (!buttonId) {
        alert('Please select a button');
        return;
    }

    const firstIcon = document.querySelector('.menu-icon').files[0];
    let iconUrl = null;

    if (firstIcon) {
        showLoading();
        iconUrl = await uploadFile(firstIcon, 'menu-icons');
        hideLoading();
    }

    const menus = [];
    document.querySelectorAll('.menu-input-group').forEach((group, index) => {
        const name = group.querySelector('.menu-name').value.trim();
        const amount = group.querySelector('.menu-amount').value.trim();
        const price = group.querySelector('.menu-price').value;
        
        if (name && amount && price) {
            menus.push({
                button_id: buttonId,
                name: name,
                amount: amount,
                price: parseInt(price),
                icon_url: index === 0 ? iconUrl : null
            });
        }
    });

    if (menus.length === 0) {
        alert('Please add at least one product');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('menus')
            .insert(menus);

        if (error) throw error;

        hideLoading();
        alert('Products saved!');
        document.getElementById('menusInputContainer').innerHTML = `
            <div class="menu-input-group">
                <div class="input-with-emoji">
                    <input type="text" class="menu-name" placeholder="Product Name">
                    <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'menu-name')">😀</button>
                </div>
                <div class="input-with-emoji">
                    <input type="text" class="menu-amount" placeholder="Amount/Details">
                    <button class="emoji-picker-btn" onclick="openEmojiPickerForClass(this, 'menu-amount')">😀</button>
                </div>
                <input type="number" class="menu-price" placeholder="Price">
                <input type="file" class="menu-icon" accept="image/*">
            </div>
        `;
        loadMenus();
    } catch (error) {
        hideLoading();
        alert('Error saving products');
        console.error(error);
    }
}

async function loadMenus() {
    try {
        const { data, error } = await supabase
            .from('menus')
            .select(`
                *,
                category_buttons (name, categories (title))
            `)
            .order('created_at', { ascending: true });

        const container = document.getElementById('menusContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(menu => {
                const nameHtml = renderAnimatedText(menu.name);
                const amountHtml = renderAnimatedText(menu.amount);
                const buttonNameHtml = renderAnimatedText(menu.category_buttons.name);
                
                container.innerHTML += `
                    <div class="item-card">
                        ${menu.icon_url ? `<img src="${menu.icon_url}" alt="${menu.name}">` : ''}
                        <h4>${nameHtml}</h4>
                        <p>${amountHtml}</p>
                        <p><strong>${menu.price} MMK</strong></p>
                        <p>Button: ${buttonNameHtml}</p>
                        <div class="item-actions">
                            <button class="btn-secondary" onclick="editMenu(${menu.id})">Edit</button>
                            <button class="btn-danger" onclick="deleteMenu(${menu.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No products yet</p>';
        }
    } catch (error) {
        console.error('Error loading menus:', error);
    }
}

async function editMenu(id) {
    const { data: menu } = await supabase
        .from('menus')
        .select('*')
        .eq('id', id)
        .single();

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label>Name</label>
            <div class="input-with-emoji">
                <input type="text" id="editMenuName" value="${menu.name}">
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editMenuName')">😀</button>
            </div>
        </div>
        <div class="form-group">
            <label>Amount</label>
            <div class="input-with-emoji">
                <input type="text" id="editMenuAmount" value="${menu.amount}">
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editMenuAmount')">😀</button>
            </div>
        </div>
        <div class="form-group">
            <label>Price</label>
            <input type="number" id="editMenuPrice" value="${menu.price}">
        </div>
        <button class="btn-primary" onclick="updateMenu(${id})">Save Changes</button>
    `;

    document.getElementById('editModal').classList.add('active');
}

async function updateMenu(id) {
    const name = document.getElementById('editMenuName').value.trim();
    const amount = document.getElementById('editMenuAmount').value.trim();
    const price = document.getElementById('editMenuPrice').value;

    if (!name || !amount || !price) {
        alert('Please fill all fields');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('menus')
            .update({
                name: name,
                amount: amount,
                price: parseInt(price)
            })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        closeEditModal();
        alert('Menu updated!');
        loadMenus();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

async function deleteMenu(id) {
    if (!confirm('Delete?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('menus')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Menu deleted!');
        loadMenus();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== PAYMENT METHODS ====================

async function loadPaymentMethods() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('created_at', { ascending: true });

        const container = document.getElementById('paymentsContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(payment => {
                const nameHtml = renderAnimatedText(payment.name);
                const instructionsHtml = renderAnimatedText(payment.instructions || '');
                
                container.innerHTML += `
                    <div class="item-card">
                        <img src="${payment.icon_url}" alt="${payment.name}">
                        <h4>${nameHtml}</h4>
                        <p>${payment.address}</p>
                        <p>${instructionsHtml}</p>
                        <div class="item-actions">
                            <button class="btn-secondary" onclick="editPayment(${payment.id})">Edit</button>
                            <button class="btn-danger" onclick="deletePayment(${payment.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No payment methods yet</p>';
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

async function addPaymentMethod() {
    const name = document.getElementById('paymentName').value.trim();
    const address = document.getElementById('paymentAddress').value.trim();
    const instructions = document.getElementById('paymentInstructions').value.trim();
    const file = document.getElementById('paymentIconFile').files[0];

    if (!name || !address || !file) {
        alert('Please fill all required fields');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'payment-icons');
    
    if (url) {
        try {
            const { error } = await supabase
                .from('payment_methods')
                .insert([{
                    name: name,
                    address: address,
                    instructions: instructions,
                    icon_url: url
                }]);

            if (error) throw error;

            hideLoading();
            alert('Payment method added!');
            document.getElementById('paymentName').value = '';
            document.getElementById('paymentAddress').value = '';
            document.getElementById('paymentInstructions').value = '';
            document.getElementById('paymentIconFile').value = '';
            loadPaymentMethods();
        } catch (error) {
            hideLoading();
            alert('Error adding payment method');
            console.error(error);
        }
    } else {
        hideLoading();
        alert('Error uploading icon');
    }
}

async function editPayment(id) {
    const { data: payment } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .single();

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label>Name</label>
            <div class="input-with-emoji">
                <input type="text" id="editPaymentName" value="${payment.name}">
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editPaymentName')">😀</button>
            </div>
        </div>
        <div class="form-group">
            <label>Address</label>
            <input type="text" id="editPaymentAddress" value="${payment.address}">
        </div>
        <div class="form-group">
            <label>Instructions</label>
            <div class="textarea-with-emoji">
                <textarea id="editPaymentInstructions">${payment.instructions || ''}</textarea>
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editPaymentInstructions')">😀</button>
            </div>
        </div>
        <button class="btn-primary" onclick="updatePayment(${id})">Save Changes</button>
    `;

    document.getElementById('editModal').classList.add('active');
}

async function updatePayment(id) {
    const name = document.getElementById('editPaymentName').value.trim();
    const address = document.getElementById('editPaymentAddress').value.trim();
    const instructions = document.getElementById('editPaymentInstructions').value.trim();

    if (!name || !address) {
        alert('Please fill all required fields');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('payment_methods')
            .update({
                name: name,
                address: address,
                instructions: instructions
            })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        closeEditModal();
        alert('Payment method updated!');
        loadPaymentMethods();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

async function deletePayment(id) {
    if (!confirm('Delete?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Payment method deleted!');
        loadPaymentMethods();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== CONTACTS ====================

async function loadContacts() {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: true });

        const container = document.getElementById('contactsContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(contact => {
                const nameHtml = renderAnimatedText(contact.name);
                const descHtml = renderAnimatedText(contact.description || '');
                
                container.innerHTML += `
                    <div class="item-card">
                        <img src="${contact.icon_url}" alt="${contact.name}">
                        <h4>${nameHtml}</h4>
                        <p>${descHtml}</p>
                        <p>${contact.link || contact.address || ''}</p>
                        <div class="item-actions">
                            <button class="btn-secondary" onclick="editContact(${contact.id})">Edit</button>
                            <button class="btn-danger" onclick="deleteContact(${contact.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No contacts yet</p>';
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

async function addContact() {
    const name = document.getElementById('contactName').value.trim();
    const description = document.getElementById('contactDescription').value.trim();
    const link = document.getElementById('contactLink').value.trim();
    const address = document.getElementById('contactAddress').value.trim();
    const file = document.getElementById('contactIconFile').files[0];

    if (!name || !file) {
        alert('Please fill required fields');
        return;
    }

    showLoading();
    const url = await uploadFile(file, 'contact-icons');
    
    if (url) {
        try {
            const { error } = await supabase
                .from('contacts')
                .insert([{
                    name: name,
                    description: description,
                    link: link,
                    address: address,
                    icon_url: url
                }]);

            if (error) throw error;

            hideLoading();
            alert('Contact added!');
            document.getElementById('contactName').value = '';
            document.getElementById('contactDescription').value = '';
            document.getElementById('contactLink').value = '';
            document.getElementById('contactAddress').value = '';
            document.getElementById('contactIconFile').value = '';
            loadContacts();
        } catch (error) {
            hideLoading();
            alert('Error adding contact');
            console.error(error);
        }
    } else {
        hideLoading();
        alert('Error uploading icon');
    }
}

async function editContact(id) {
    const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label>Name</label>
            <div class="input-with-emoji">
                <input type="text" id="editContactName" value="${contact.name}">
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editContactName')">😀</button>
            </div>
        </div>
        <div class="form-group">
            <label>Description</label>
            <div class="textarea-with-emoji">
                <textarea id="editContactDescription">${contact.description || ''}</textarea>
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editContactDescription')">😀</button>
            </div>
        </div>
        <div class="form-group">
            <label>Link</label>
            <input type="text" id="editContactLink" value="${contact.link || ''}">
        </div>
        <div class="form-group">
            <label>Address</label>
            <input type="text" id="editContactAddress" value="${contact.address || ''}">
        </div>
        <button class="btn-primary" onclick="updateContact(${id})">Save Changes</button>
    `;

    document.getElementById('editModal').classList.add('active');
}

async function updateContact(id) {
    const name = document.getElementById('editContactName').value.trim();
    const description = document.getElementById('editContactDescription').value.trim();
    const link = document.getElementById('editContactLink').value.trim();
    const address = document.getElementById('editContactAddress').value.trim();

    if (!name) {
        alert('Please enter a name');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('contacts')
            .update({
                name: name,
                description: description,
                link: link,
                address: address
            })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        closeEditModal();
        alert('Contact updated!');
        loadContacts();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

async function deleteContact(id) {
    if (!confirm('Delete?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Contact deleted!');
        loadContacts();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== YOUTUBE VIDEOS ====================

async function loadButtonsForVideos() {
    const categoryId = document.getElementById('videoCategorySelect').value;
    if (!categoryId) {
        document.getElementById('videoButtonSelect').innerHTML = '<option value="">Select Button</option>';
        return;
    }

    try {
        const { data } = await supabase
            .from('category_buttons')
            .select('*')
            .eq('category_id', categoryId);

        const select = document.getElementById('videoButtonSelect');
        select.innerHTML = '<option value="">Select Button</option>';
        
        if (data) {
            data.forEach(btn => {
                const nameText = btn.name.replace(/\{anim:[^}]+\}/g, '');
                select.innerHTML += `<option value="${btn.id}">${nameText}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading buttons:', error);
    }
}

async function loadVideos() {
    try {
        const { data, error } = await supabase
            .from('youtube_videos')
            .select(`
                *,
                category_buttons (name, categories (title))
            `)
            .order('created_at', { ascending: true });

        const container = document.getElementById('videosContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(video => {
                const descHtml = renderAnimatedText(video.description);
                const buttonNameHtml = renderAnimatedText(video.category_buttons.name);
                
                container.innerHTML += `
                    <div class="item-card">
                        <img src="${video.banner_url}" alt="Video">
                        <h4>${descHtml}</h4>
                        <p>Button: ${buttonNameHtml}</p>
                        <p><a href="${video.video_url}" target="_blank">View Video</a></p>
                        <div class="item-actions">
                            <button class="btn-secondary" onclick="editVideo(${video.id})">Edit</button>
                            <button class="btn-danger" onclick="deleteVideo(${video.id})">Delete</button>
                        </div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No videos yet</p>';
        }
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

async function addVideo() {
    const buttonId = document.getElementById('videoButtonSelect').value;
    const file = document.getElementById('videoBannerFile').files[0];
    const videoUrl = document.getElementById('videoUrl').value.trim();
    const description = document.getElementById('videoDescription').value.trim();

    if (!buttonId || !file || !videoUrl || !description) {
        alert('Please fill all fields');
        return;
    }

    showLoading();
    const bannerUrl = await uploadFile(file, 'video-banners');
    
    if (bannerUrl) {
        try {
            const { error } = await supabase
                .from('youtube_videos')
                .insert([{
                    button_id: buttonId,
                    banner_url: bannerUrl,
                    video_url: videoUrl,
                    description: description
                }]);

            if (error) throw error;

            hideLoading();
            alert('Video added!');
            document.getElementById('videoBannerFile').value = '';
            document.getElementById('videoUrl').value = '';
            document.getElementById('videoDescription').value = '';
            loadVideos();
        } catch (error) {
            hideLoading();
            alert('Error adding video');
            console.error(error);
        }
    } else {
        hideLoading();
        alert('Error uploading banner');
    }
}

async function editVideo(id) {
    const { data: video } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('id', id)
        .single();

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label>Video URL</label>
            <input type="text" id="editVideoUrl" value="${video.video_url}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <div class="textarea-with-emoji">
                <textarea id="editVideoDescription">${video.description}</textarea>
                <button class="emoji-picker-btn" onclick="openEmojiPicker('editVideoDescription')">😀</button>
            </div>
        </div>
        <button class="btn-primary" onclick="updateVideo(${id})">Save Changes</button>
    `;

    document.getElementById('editModal').classList.add('active');
}

async function updateVideo(id) {
    const videoUrl = document.getElementById('editVideoUrl').value.trim();
    const description = document.getElementById('editVideoDescription').value.trim();

    if (!videoUrl || !description) {
        alert('Please fill all fields');
        return;
    }

    showLoading();
    try {
        const { error } = await supabase
            .from('youtube_videos')
            .update({
                video_url: videoUrl,
                description: description
            })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        closeEditModal();
        alert('Video updated!');
        loadVideos();
    } catch (error) {
        hideLoading();
        alert('Error updating');
        console.error(error);
    }
}

async function deleteVideo(id) {
    if (!confirm('Delete?')) return;

    showLoading();
    try {
        const { error } = await supabase
            .from('youtube_videos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Video deleted!');
        loadVideos();
    } catch (error) {
        hideLoading();
        alert('Error deleting');
        console.error(error);
    }
}

// ==================== ORDERS ====================

function filterOrders(status) {
    currentFilter = status;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadOrders();
}

async function loadOrders() {
    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                users (name, username, email),
                menus (name, amount, price),
                payment_methods (name)
            `)
            .order('created_at', { ascending: false });

        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data, error } = await query;

        const container = document.getElementById('ordersContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(order => {
                let statusClass = 'pending';
                if (order.status === 'approved') statusClass = 'approved';
                if (order.status === 'rejected') statusClass = 'rejected';

                const menuNameHtml = renderAnimatedText(order.menus?.name || 'Unknown');
                const menuAmountHtml = renderAnimatedText(order.menus?.amount || '');
                const paymentNameHtml = renderAnimatedText(order.payment_methods?.name || 'N/A');

                container.innerHTML += `
                    <div class="order-card">
                        <div class="order-header">
                            <div>
                                <h3>Order #${order.id}</h3>
                                <p>${new Date(order.created_at).toLocaleString()}</p>
                            </div>
                            <span class="order-status ${statusClass}">${order.status.toUpperCase()}</span>
                        </div>
                        <div class="order-info">
                            <div class="info-item">
                                <span class="info-label">Customer</span>
                                <span class="info-value">${order.users.name} (@${order.users.username})</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Email</span>
                                <span class="info-value">${order.users.email}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Product</span>
                                <span class="info-value">${menuNameHtml}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Amount</span>
                                <span class="info-value">${menuAmountHtml}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Price</span>
                                <span class="info-value">${order.menus?.price || 0} MMK</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Payment</span>
                                <span class="info-value">${paymentNameHtml}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Transaction Code</span>
                                <span class="info-value">${order.transaction_code}</span>
                            </div>
                        </div>
                        ${order.status === 'pending' ? `
                            <div class="order-actions">
                                <button class="btn-success" onclick="approveOrder(${order.id})">Approve</button>
                                <button class="btn-danger" onclick="rejectOrder(${order.id})">Reject</button>
                            </div>
                        ` : ''}
                        ${order.admin_message ? `<p style="margin-top: 15px; color: #fbbf24;"><strong>Message:</strong> ${order.admin_message}</p>` : ''}
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No orders found</p>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function approveOrder(id) {
    const message = prompt('Enter message (optional):');
    
    showLoading();
    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'approved',
                admin_message: message || 'Your order has been approved!'
            })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Order approved!');
        loadOrders();
    } catch (error) {
        hideLoading();
        alert('Error approving');
        console.error(error);
    }
}

async function rejectOrder(id) {
    const message = prompt('Enter rejection reason:');
    if (!message) return;
    
    showLoading();
    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'rejected',
                admin_message: message
            })
            .eq('id', id);

        if (error) throw error;

        hideLoading();
        alert('Order rejected!');
        loadOrders();
    } catch (error) {
        hideLoading();
        alert('Error rejecting');
        console.error(error);
    }
}

// ==================== USERS ====================

async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        const container = document.getElementById('usersContainer');
        container.innerHTML = '';

        if (data && data.length > 0) {
            document.getElementById('totalUsers').textContent = data.length;
            
            const today = new Date().toDateString();
            const todayUsers = data.filter(user => {
                return new Date(user.created_at).toDateString() === today;
            });
            document.getElementById('todayUsers').textContent = todayUsers.length;

            data.forEach(user => {
                container.innerHTML += `
                    <div class="user-card">
                        <div class="user-info">
                            <h4>${user.name}</h4>
                            <p>@${user.username} | ${user.email}</p>
                            <p style="font-size: 12px; color: #94a3b8;">Joined: ${new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="user-badge">Active</div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<p>No users yet</p>';
            document.getElementById('totalUsers').textContent = '0';
            document.getElementById('todayUsers').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ==================== MODALS ====================

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// ==================== UTILITY FUNCTIONS ====================

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 5000);
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 5000);
}

console.log('✅ Admin panel initialized with animations support!');
