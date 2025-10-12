
// Supabase Configuration
const SUPABASE_URL = 'https://qcbzxalqpcppiorffpas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYnp4YWxxcGNwcGlvcmZmcGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwOTg0NTAsImV4cCI6MjA3NTY3NDQ1MH0.EQ-Wc_FJ65tuCBF3a_1_7IrKO6bJmZgN4-cJqapNoRg';

// Initialize Supabase Client
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ GG Gaming Supabase initialized successfully');
} catch (error) {
    console.error('❌ GG Gaming Supabase initialization failed:', error);
}

// ========== GLOBAL STATE ==========
window.appState = {
    currentUser: null,
    websiteSettings: null,
    categories: [],
    payments: [],
    contacts: [],
    selectedMenuItem: null,
    currentMenu: null,
    selectedPayment: null,
    currentButtonId: null,
    currentTableData: {},
    allMenus: [],
    currentTables: [],
    currentBannerIndex: 0,
    bannerInterval: null,
    currentCategory: null
};

// ========== DISABLE RIGHT CLICK & CONTEXT MENU ==========
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
});

document.addEventListener('selectstart', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return true;
    }
    e.preventDefault();
    return false;
});

// Prevent F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
document.addEventListener('keydown', function(e) {
    // F12
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+S (Save)
    if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
    }
});

// ========== TOAST NOTIFICATION SYSTEM ==========
function showToast(message, type = 'success', duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '🎮',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '🎯'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    if (toast && toast.parentElement) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }
}

// ========== ANIMATION STICKER SUPPORT ==========
function renderAnimatedContent(text) {
    if (!text) return '';
    
    const urlPattern = /(https?:\/\/[^\s]+\.(?:gif|png|jpg|jpeg|webp|mp4|webm)(\?[^\s]*)?)/gi;
    
    return text.replace(urlPattern, (url) => {
        const extension = url.split('.').pop().toLowerCase().split('?')[0];
        
        if (['mp4', 'webm'].includes(extension)) {
            return `<video class="inline-animation" autoplay loop muted playsinline><source src="${url}" type="video/${extension}"></video>`;
        }
        
        if (['gif', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
            return `<img class="inline-animation" src="${url}" alt="sticker">`;
        }
        
        return url;
    });
}

function applyAnimationRendering(element, text) {
    if (!element || !text) return;
    element.innerHTML = renderAnimatedContent(text);
}

function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .inline-animation {
            display: inline-block;
            width: 20px;
            height: 20px;
            object-fit: contain;
            vertical-align: middle;
            margin: 0 2px;
            border-radius: 4px;
            pointer-events: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        .menu-item-name .inline-animation,
        .menu-item-amount .inline-animation {
            width: 18px;
            height: 18px;
        }
        
        .history-item .inline-animation,
        .contact-info .inline-animation {
            width: 16px;
            height: 16px;
        }
        
        .payment-info .inline-animation {
            width: 20px;
            height: 20px;
        }

        .order-summary .inline-animation {
            width: 20px;
            height: 20px;
        }
    `;
    document.head.appendChild(style);
}

// ========== GAMING CATEGORY CARD RENDERING ==========
function createGamingCategoryCard(category) {
    return `
        <div class="category-card glow-effect" onclick="openCategory('${category.id}')" data-category-id="${category.id}">
            <div class="category-header">
                <div class="category-icon">
                    ${category.icon || '🎮'}
                </div>
                <div class="category-name">${category.name || 'Gaming Category'}</div>
            </div>
            <div class="category-description">
                ${category.description || 'Explore amazing gaming products and services'}
            </div>
            <div class="category-stats">
                <div class="stat-item">
                    <span>📦</span>
                    <span>${category.item_count || 0} Items</span>
                </div>
                <div class="stat-item">
                    <span>⭐</span>
                    <span>4.9/5</span>
                </div>
            </div>
        </div>
    `;
}

// ========== GAMING MENU ITEM RENDERING ==========
function createGamingMenuItem(item) {
    return `
        <div class="menu-item" data-item-id="${item.id}">
            <div class="menu-header">
                <div class="menu-name">${item.name || 'Gaming Item'}</div>
                <div class="menu-price">${item.price || '0'} MMK</div>
            </div>
            <div class="menu-description">
                ${item.description || 'Premium gaming product with exclusive features'}
            </div>
            <button class="buy-button" onclick="openPurchaseModal('${item.id}')">
                🛒 Buy Now
            </button>
        </div>
    `;
}

// ========== DATABASE CONNECTION ==========
async function testDatabaseConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const statusText = statusElement.querySelector('.status-text');
    const statusIcon = statusElement.querySelector('.status-icon');
    
    try {
        statusText.textContent = 'Testing GG Gaming database...';
        statusIcon.textContent = '⚡';
        
        const { data, error } = await supabase
            .from('buttons')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
        statusElement.classList.add('connected');
        statusText.textContent = 'GG Gaming connected!';
        statusIcon.textContent = '🎮';
        
        setTimeout(() => {
            statusElement.classList.add('hide');
        }, 3000);
        
        console.log('✅ GG Gaming database connection successful');
        
    } catch (error) {
        console.error('❌ GG Gaming database connection failed:', error);
        statusElement.classList.add('error');
        statusText.textContent = 'Connection failed!';
        statusIcon.textContent = '❌';
        
        setTimeout(() => {
            statusElement.classList.add('hide');
        }, 5000);
    }
}

// ========== WEBSITE SETTINGS ==========
async function loadWebsiteSettings() {
    try {
        const { data, error } = await supabase
            .from('website_settings')
            .select('*')
            .limit(1)
            .single();
        
        if (error) {
            console.log('No website settings found, using defaults');
            return;
        }
        
        window.appState.websiteSettings = data;
        
        // Update branding
        if (data.website_name) {
            document.title = `${data.website_name} - GG Gaming`;
            const titleElements = document.querySelectorAll('#authWebsiteName, #appWebsiteName');
            titleElements.forEach(el => el.textContent = data.website_name);
        }
        
        // Update logos
        if (data.logo_url) {
            const logoElements = document.querySelectorAll('#authLogo, #appLogo');
            logoElements.forEach(el => {
                el.src = data.logo_url;
                el.style.display = 'block';
            });
        }
        
        // Update background
        if (data.background_image) {
            const bgElement = document.getElementById('dynamicBackground');
            bgElement.style.backgroundImage = `url(${data.background_image})`;
        }
        
        console.log('✅ GG Gaming website settings loaded');
        
    } catch (error) {
        console.error('❌ Error loading website settings:', error);
    }
}

// ========== AUTHENTICATION ==========
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        try {
            window.appState.currentUser = JSON.parse(user);
            showApp();
        } catch (error) {
            console.error('❌ Invalid user data:', error);
            localStorage.removeItem('currentUser');
            showAuth();
        }
    } else {
        showAuth();
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        errorElement.textContent = 'Please enter both email and password';
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .limit(1)
            .single();
        
        if (error || !data) {
            errorElement.textContent = 'Invalid gamer credentials';
            return;
        }
        
        window.appState.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        
        showApp();
        showToast(`Welcome back, ${data.name}! 🎮`, 'success');
        
    } catch (error) {
        console.error('❌ Login error:', error);
        errorElement.textContent = 'Login failed. Please try again.';
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const termsAccepted = document.getElementById('termsCheckbox').checked;
    const errorElement = document.getElementById('signupError');
    
    if (!name || !username || !email || !password) {
        errorElement.textContent = 'Please fill in all gamer details';
        return;
    }
    
    if (!termsAccepted) {
        errorElement.textContent = 'Please accept the gaming terms';
        return;
    }
    
    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email, username')
            .or(`email.eq.${email},username.eq.${username}`)
            .limit(1);
        
        if (existingUser && existingUser.length > 0) {
            errorElement.textContent = 'Gamer email or username already exists';
            return;
        }
        
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                username,
                email,
                password,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        window.appState.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        
        showApp();
        showToast(`Welcome to GG Gaming, ${data.name}! 🎮`, 'success');
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        errorElement.textContent = 'Signup failed. Please try again.';
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.appState.currentUser = null;
    showAuth();
    showToast('Logged out successfully! See you next game! 👋', 'success');
}

function showLogin() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
}

function showSignup() {
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
}

function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    loadAppData();
    updateProfile();
}

// ========== APP DATA LOADING ==========
async function loadAppData() {
    await Promise.all([
        loadBanners(),
        loadCategories(),
        loadPayments(),
        loadContacts()
    ]);
}

async function loadBanners() {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            renderBanners(data);
            startBannerSlideshow(data);
        }
        
    } catch (error) {
        console.error('❌ Error loading banners:', error);
    }
}

async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('buttons')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true });
        
        if (error) throw error;
        
        window.appState.categories = data || [];
        renderGamingCategories(data || []);
        
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        renderGamingCategories([]);
    }
}

async function loadPayments() {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('active', true)
            .order('name');
        
        if (error) throw error;
        
        window.appState.payments = data || [];
        
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        window.appState.payments = [];
    }
}

async function loadContacts() {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('active', true)
            .order('name');
        
        if (error) throw error;
        
        window.appState.contacts = data || [];
        renderContacts(data || []);
        
    } catch (error) {
        console.error('❌ Error loading contacts:', error);
        renderContacts([]);
    }
}

// ========== GAMING CATEGORY RENDERING ==========
function renderGamingCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    
    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <div class="category-card" style="text-align: center; padding: 40px;">
                <div class="category-icon" style="font-size: 48px; margin-bottom: 20px;">🎮</div>
                <div class="category-name">No Gaming Categories</div>
                <div class="category-description">Gaming categories will appear here when added by admin</div>
            </div>
        `;
        return;
    }
    
    const categoryCards = categories.map(createGamingCategoryCard).join('');
    container.innerHTML = categoryCards;
    
    // Add hover effects
    container.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// ========== CATEGORY DETAIL PAGE ==========
async function openCategory(categoryId) {
    const category = window.appState.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    window.appState.currentCategory = category;
    
    // Show category detail page
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('categoryDetailPage').classList.add('active');
    
    // Update title
    const titleElement = document.getElementById('categoryDetailTitle');
    titleElement.textContent = category.name || 'Gaming Category';
    
    // Load category items
    await loadCategoryItems(categoryId);
}

async function loadCategoryItems(categoryId) {
    const container = document.getElementById('categoryDetailContainer');
    container.innerHTML = '<div class="loading-placeholder">Loading gaming items...</div>';
    
    try {
        const { data, error } = await supabase
            .from('menus')
            .select('*')
            .eq('button_id', categoryId)
            .eq('active', true)
            .order('name');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="menu-item" style="text-align: center; padding: 40px;">
                    <div class="menu-header">
                        <div class="menu-name">No Items Available</div>
                    </div>
                    <div class="menu-description">Gaming items will appear here when added by admin</div>
                </div>
            `;
            return;
        }
        
        const menuItems = data.map(createGamingMenuItem).join('');
        container.innerHTML = menuItems;
        
    } catch (error) {
        console.error('❌ Error loading category items:', error);
        container.innerHTML = '<div class="error-message">Failed to load gaming items</div>';
    }
}

function showHomePage() {
    document.getElementById('categoryDetailPage').classList.remove('active');
    document.getElementById('homePage').classList.add('active');
}

// ========== BANNER FUNCTIONALITY ==========
function renderBanners(banners) {
    const container = document.getElementById('bannerContainer');
    const pagination = document.getElementById('bannerPagination');
    
    if (!banners || banners.length === 0) {
        document.getElementById('bannerSection').style.display = 'none';
        return;
    }
    
    document.getElementById('bannerSection').style.display = 'block';
    
    const bannerHTML = banners.map((banner, index) => `
        <div class="banner-slide ${index === 0 ? 'active' : ''}" 
             style="background-image: url('${banner.image_url}')">
            <div class="banner-content">
                <h3>${banner.title || 'Gaming Banner'}</h3>
                <p>${banner.description || 'Discover amazing gaming experiences'}</p>
            </div>
        </div>
    `).join('');
    
    const paginationHTML = banners.map((_, index) => `
        <div class="pagination-dot ${index === 0 ? 'active' : ''}" 
             onclick="showBanner(${index})"></div>
    `).join('');
    
    container.innerHTML = bannerHTML;
    pagination.innerHTML = paginationHTML;
}

function startBannerSlideshow(banners) {
    if (window.appState.bannerInterval) {
        clearInterval(window.appState.bannerInterval);
    }
    
    if (!banners || banners.length <= 1) return;
    
    window.appState.bannerInterval = setInterval(() => {
        window.appState.currentBannerIndex = (window.appState.currentBannerIndex + 1) % banners.length;
        showBanner(window.appState.currentBannerIndex);
    }, 5000);
}

function showBanner(index) {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.pagination-dot');
    
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    window.appState.currentBannerIndex = index;
}

// ========== PAGE NAVIGATION ==========
function switchPage(pageName) {
    // Remove active class from all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    // Add active class to selected nav item
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    
    // Load page-specific data
    switch(pageName) {
        case 'history':
            loadOrderHistory();
            break;
        case 'contacts':
            renderContacts(window.appState.contacts);
            break;
        case 'mi':
            updateProfile();
            break;
    }
}

// ========== PROFILE MANAGEMENT ==========
function updateProfile() {
    const user = window.appState.currentUser;
    if (!user) return;
    
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileUsername').value = user.username || '';
    document.getElementById('profileEmail').value = user.email || '';
    
    // Update avatar
    const avatar = document.getElementById('profileAvatar');
    avatar.textContent = (user.name || 'G').charAt(0).toUpperCase();
}

async function updateProfile() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const errorElement = document.getElementById('profileError');
    const successElement = document.getElementById('profileSuccess');
    
    errorElement.textContent = '';
    successElement.textContent = '';
    
    if (!currentPassword || !newPassword) {
        errorElement.textContent = 'Please enter both current and new passwords';
        return;
    }
    
    const user = window.appState.currentUser;
    if (user.password !== currentPassword) {
        errorElement.textContent = 'Current password is incorrect';
        return;
    }
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ password: newPassword })
            .eq('id', user.id);
        
        if (error) throw error;
        
        user.password = newPassword;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        successElement.textContent = 'Password updated successfully! 🎮';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        
    } catch (error) {
        console.error('❌ Profile update error:', error);
        errorElement.textContent = 'Failed to update password';
    }
}

// ========== ORDER HISTORY ==========
async function loadOrderHistory() {
    const container = document.getElementById('historyContainer');
    container.innerHTML = '<div class="loading-placeholder">Loading gaming history...</div>';
    
    try {
        const user = window.appState.currentUser;
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                menus(name, price),
                payments(name, qr_code)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="history-item" style="text-align: center; padding: 40px;">
                    <h3>No Gaming History</h3>
                    <p>Your gaming purchases will appear here</p>
                </div>
            `;
            return;
        }
        
        const historyHTML = data.map(order => `
            <div class="history-item">
                <div class="history-header">
                    <h3>${order.menus?.name || 'Gaming Item'}</h3>
                    <span class="history-date">${new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div class="history-details">
                    <p><strong>Amount:</strong> ${order.total_amount} MMK</p>
                    <p><strong>Status:</strong> <span class="status-${order.status}">${order.status}</span></p>
                    <p><strong>Payment:</strong> ${order.payments?.name || 'N/A'}</p>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = historyHTML;
        
    } catch (error) {
        console.error('❌ Error loading order history:', error);
        container.innerHTML = '<div class="error-message">Failed to load gaming history</div>';
    }
}

// ========== CONTACTS RENDERING ==========
function renderContacts(contacts) {
    const container = document.getElementById('contactsContainer');
    
    if (!contacts || contacts.length === 0) {
        container.innerHTML = `
            <div class="contact-item" style="text-align: center; padding: 40px;">
                <h3>No Support Contacts</h3>
                <p>Gaming support contacts will appear here</p>
            </div>
        `;
        return;
    }
    
    const contactsHTML = contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-header">
                <h3>${contact.name || 'Gaming Support'}</h3>
            </div>
            <div class="contact-info">
                ${contact.phone ? `<p><strong>📞 Phone:</strong> ${contact.phone}</p>` : ''}
                ${contact.email ? `<p><strong>📧 Email:</strong> ${contact.email}</p>` : ''}
                ${contact.telegram ? `<p><strong>💬 Telegram:</strong> ${contact.telegram}</p>` : ''}
                ${contact.facebook ? `<p><strong>📘 Facebook:</strong> ${contact.facebook}</p>` : ''}
                ${contact.description ? `<p class="contact-description">${contact.description}</p>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = contactsHTML;
}

// ========== PURCHASE MODAL ==========
async function openPurchaseModal(itemId) {
    const modal = document.getElementById('purchaseModal');
    const content = document.getElementById('purchaseContent');
    
    try {
        const { data: item, error } = await supabase
            .from('menus')
            .select('*')
            .eq('id', itemId)
            .single();
        
        if (error) throw error;
        
        window.appState.selectedMenuItem = item;
        
        const tablesHTML = item.tables && item.tables.length > 0 ? `
            <div class="table-selection">
                <h4>Select Gaming Option:</h4>
                ${item.tables.map(table => `
                    <div class="table-option" onclick="selectTable('${table.id}')">
                        <span>${table.name}</span>
                        <span>${table.price} MMK</span>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        content.innerHTML = `
            <div class="purchase-item">
                <h3>${item.name}</h3>
                <p class="purchase-description">${item.description || ''}</p>
                <div class="purchase-price">
                    <strong>Price: ${item.price} MMK</strong>
                </div>
                ${tablesHTML}
                <div class="purchase-form">
                    <div class="form-group">
                        <label>Gaming Details (optional):</label>
                        <textarea id="purchaseDetails" placeholder="Add any special gaming requirements..."></textarea>
                    </div>
                    <button class="btn-primary" onclick="proceedToPurchase()">
                        🎮 Proceed to Payment
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
    } catch (error) {
        console.error('❌ Error loading item:', error);
        showToast('Failed to load gaming item', 'error');
    }
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.remove('active');
    window.appState.selectedMenuItem = null;
}

async function proceedToPurchase() {
    if (!window.appState.selectedMenuItem) return;
    
    closePurchaseModal();
    openPaymentModal();
}

// ========== PAYMENT MODAL ==========
function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const content = document.getElementById('paymentContent');
    
    const payments = window.appState.payments;
    
    if (!payments || payments.length === 0) {
        content.innerHTML = `
            <div class="payment-error">
                <h3>No Payment Methods Available</h3>
                <p>Please contact gaming support to process your order</p>
            </div>
        `;
        modal.classList.add('active');
        return;
    }
    
    const paymentsHTML = payments.map(payment => `
        <div class="payment-option" onclick="selectPayment('${payment.id}')">
            <div class="payment-info">
                <h4>${payment.name}</h4>
                <p>${payment.account_number || ''}</p>
                <p>${payment.description || ''}</p>
            </div>
            ${payment.qr_code ? `<img src="${payment.qr_code}" alt="QR Code" class="payment-qr">` : ''}
        </div>
    `).join('');
    
    content.innerHTML = `
        <div class="payment-methods">
            <h3>Choose Gaming Payment Method:</h3>
            ${paymentsHTML}
        </div>
        <div class="payment-confirmation" id="paymentConfirmation" style="display: none;">
            <h3>Complete Your Gaming Purchase</h3>
            <div id="selectedPaymentInfo"></div>
            <div class="form-group">
                <label>Transaction Reference ID:</label>
                <input type="text" id="transactionId" placeholder="Enter transaction ID">
            </div>
            <button class="btn-primary" onclick="confirmPurchase()">
                ✅ Confirm Gaming Purchase
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

function selectPayment(paymentId) {
    const payment = window.appState.payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    window.appState.selectedPayment = payment;
    
    document.querySelector('.payment-methods').style.display = 'none';
    document.getElementById('paymentConfirmation').style.display = 'block';
    
    const infoHTML = `
        <div class="selected-payment-info">
            <h4>${payment.name}</h4>
            ${payment.account_number ? `<p><strong>Account:</strong> ${payment.account_number}</p>` : ''}
            ${payment.qr_code ? `<img src="${payment.qr_code}" alt="QR Code" class="payment-qr-large">` : ''}
            <p>Please complete the payment and enter the transaction ID below</p>
        </div>
    `;
    
    document.getElementById('selectedPaymentInfo').innerHTML = infoHTML;
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    window.appState.selectedPayment = null;
}

async function confirmPurchase() {
    const transactionId = document.getElementById('transactionId').value.trim();
    
    if (!transactionId) {
        showToast('Please enter transaction ID', 'error');
        return;
    }
    
    const item = window.appState.selectedMenuItem;
    const payment = window.appState.selectedPayment;
    const user = window.appState.currentUser;
    const details = document.getElementById('purchaseDetails')?.value || '';
    
    try {
        const orderData = {
            user_id: user.id,
            menu_id: item.id,
            payment_id: payment.id,
            total_amount: item.price,
            transaction_id: transactionId,
            status: 'pending',
            details: details,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('orders')
            .insert([orderData]);
        
        if (error) throw error;
        
        closePaymentModal();
        showToast('🎮 Gaming purchase confirmed! Thank you!', 'success');
        
        // Refresh order history if on history page
        if (document.getElementById('historyPage').classList.contains('active')) {
            loadOrderHistory();
        }
        
    } catch (error) {
        console.error('❌ Purchase confirmation error:', error);
        showToast('Failed to confirm purchase', 'error');
    }
}

// ========== LOADING MANAGEMENT ==========
function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1500);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 GG Gaming Store App initializing...');
    addAnimationStyles();
    await testDatabaseConnection();
    await loadWebsiteSettings();
    checkAuth();
    hideLoading();
});

// ========== GAMING ENHANCEMENTS ==========
// Add gaming sound effects (optional)
function playGamingSound(type) {
    // Implementation for gaming sound effects
    // This can be expanded based on requirements
}

// Add gaming animations
function addGamingAnimation(element) {
    element.classList.add('glow-effect');
    setTimeout(() => {
        element.classList.remove('glow-effect');
    }, 2000);
}

// Export for global access
window.GGGaming = {
    showToast,
    openCategory,
    switchPage,
    openPurchaseModal,
    handleLogin,
    handleSignup,
    handleLogout,
    updateProfile
};
