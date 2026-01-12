
// Supabase Configuration
const SUPABASE_URL = 'https://qcbzxalqpcppiorffpas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYnp4YWxxcGNwcGlvcmZmcGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwOTg0NTAsImV4cCI6MjA3NTY3NDQ1MH0.EQ-Wc_FJ65tuCBF3a_1_7IrKO6bJmZgN4-cJqapNoRg';

// RapidAPI Configuration for Game ID Checker
const RAPIDAPI_KEY = 'e2f6ae1ea0mshb1c6aaad419cea7p11237cjsn9c7a7458679a';
const RAPIDAPI_HOST = 'id-game-checker.p.rapidapi.com';

// Initialize Supabase Client
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized successfully');
} catch (error) {
    console.error('❌ Supabase initialization failed:', error);
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
    gameIdCheckerData: {} // Store checked game ID data
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
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '📢'}</span>
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

// ========== GAME ID CHECKER FUNCTIONS ==========

// Check PUBG Mobile ID
async function checkPUBGID(gameId) {
    try {
        console.log('🎮 Checking PUBG Mobile ID:', gameId);
        
        const response = await fetch(`https://${RAPIDAPI_HOST}/pubgm-global/${gameId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        });

        const data = await response.json();
        console.log('✅ PUBG API Response:', data);

        if (data.error === false && data.status === 200 && data.msg === 'id_found') {
            return {
                success: true,
                data: {
                    id: data.data.id,
                    username: data.data.username,
                    is_ban: data.data.is_ban
                }
            };
        } else {
            return {
                success: false,
                message: 'Player ID not found or invalid'
            };
        }
    } catch (error) {
        console.error('❌ PUBG ID Check Error:', error);
        return {
            success: false,
            message: 'Failed to check Player ID. Please try again.'
        };
    }
}

// Check Mobile Legends ID
async function checkMLBBID(gameId, serverId) {
    try {
        console.log('🎮 Checking Mobile Legends ID:', gameId, 'Server:', serverId);
        
        const response = await fetch(`https://${RAPIDAPI_HOST}/mobile-legends/${gameId}/${serverId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        });

        const data = await response.json();
        console.log('✅ MLBB API Response:', data);

        if (data.error === false && data.status === 200 && data.msg === 'id_found') {
            return {
                success: true,
                data: {
                    id: data.data.id,
                    server: data.data.server,
                    username: data.data.username,
                    region: data.data.region || 'Unknown',
                    shop_events: data.data.shop_events || []
                }
            };
        } else {
            return {
                success: false,
                message: 'Player ID or Server not found or invalid'
            };
        }
    } catch (error) {
        console.error('❌ MLBB ID Check Error:', error);
        return {
            success: false,
            message: 'Failed to check Player ID. Please try again.'
        };
    }
}

// Render ID Checker Result
function renderIDCheckerResult(result, containerEl, gameType) {
    if (!containerEl) return;

    if (result.success) {
        const username = result.data.username;
        const firstLetter = username.charAt(0).toUpperCase();
        
        let regionBadge = '';
        if (gameType === 'mlbb' && result.data.region) {
            regionBadge = `<span class="id-checker-region">${result.data.region}</span>`;
        }

        containerEl.innerHTML = `
            <div class="id-checker-result">
                <div class="id-checker-avatar">${firstLetter}</div>
                <div class="id-checker-info">
                    <div class="id-checker-username">${username}</div>
                    <div class="id-checker-id">ID: ${result.data.id}${result.data.server ? ' | Server: ' + result.data.server : ''}</div>
                    ${regionBadge}
                </div>
            </div>
        `;

        // Store in global state
        window.appState.gameIdCheckerData = {
            gameType: gameType,
            ...result.data
        };

        showToast('✅ Player ID verified successfully!', 'success');
    } else {
        containerEl.innerHTML = `
            <div class="id-checker-error">
                ❌ ${result.message || 'Player ID not found'}
            </div>
        `;
        window.appState.gameIdCheckerData = {};
        showToast(result.message || 'Player ID not found', 'error');
    }
}

// Handle PUBG ID Check Button Click
async function handlePUBGIDCheck(inputEl, containerEl) {
    const gameId = inputEl.value.trim();

    if (!gameId) {
        showToast('Please enter your PUBG Mobile ID', 'warning');
        return;
    }

    // Show loading
    containerEl.innerHTML = `
        <div class="id-checker-loading">
            <div class="id-checker-loading-spinner"></div>
            <span>Checking Player ID...</span>
        </div>
    `;

    const result = await checkPUBGID(gameId);
    renderIDCheckerResult(result, containerEl, 'pubg');
}

// Handle MLBB ID Check Button Click
async function handleMLBBIDCheck(idInputEl, serverInputEl, containerEl) {
    const gameId = idInputEl.value.trim();
    const serverId = serverInputEl.value.trim();

    if (!gameId || !serverId) {
        showToast('Please enter both Player ID and Server ID', 'warning');
        return;
    }

    // Show loading
    containerEl.innerHTML = `
        <div class="id-checker-loading">
            <div class="id-checker-loading-spinner"></div>
            <span>Checking Player ID...</span>
        </div>
    `;

    const result = await checkMLBBID(gameId, serverId);
    renderIDCheckerResult(result, containerEl, 'mlbb');
}

// Auto Topup Diamond for MLBB (when admin approves order)
async function autoTopupMLBBDiamond(orderId, gameId, serverId, diamondAmount) {
    try {
        console.log('💎 Auto Topup MLBB Diamond:', {
            orderId,
            gameId,
            serverId,
            diamondAmount
        });

        // Using LocalStorage to simulate diamond topup
        // In production, you would integrate with actual MLBB topup API
        
        const topupData = {
            orderId: orderId,
            gameId: gameId,
            serverId: serverId,
            diamondAmount: diamondAmount,
            status: 'processing',
            timestamp: new Date().toISOString()
        };

        // Store in localStorage
        const storageKey = `mlbb_topup_${orderId}`;
        localStorage.setItem(storageKey, JSON.stringify(topupData));

        // Simulate topup process (2 seconds delay)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update status to completed
        topupData.status = 'completed';
        localStorage.setItem(storageKey, JSON.stringify(topupData));

        console.log('✅ MLBB Diamond topup completed:', topupData);

        return {
            success: true,
            message: `Successfully topped up ${diamondAmount} diamonds to ID: ${gameId} (Server: ${serverId})`
        };

    } catch (error) {
        console.error('❌ MLBB Diamond topup failed:', error);
        return {
            success: false,
            message: 'Failed to topup diamonds. Please contact support.'
        };
    }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Gaming Store App initializing...');
    addAnimationStyles();
    await testDatabaseConnection();
    await loadWebsiteSettings();
    checkAuth();
    hideLoading();
});

// ========== DATABASE CONNECTION ==========
async function testDatabaseConnection() {
    const statusEl = document.getElementById('connectionStatus');
    const statusText = statusEl.querySelector('.status-text');
    const statusIcon = statusEl.querySelector('.status-icon');
    
    try {
        statusText.textContent = 'Testing database connection...';
        console.log('🔍 Testing database connection...');
        
        const { data, error } = await supabase
            .from('website_settings')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        
        statusEl.classList.add('connected');
        statusIcon.textContent = '✅';
        statusText.textContent = 'Database connected successfully!';
        console.log('✅ Database connection successful');
        
        setTimeout(() => {
            statusEl.classList.add('hide');
            setTimeout(() => statusEl.style.display = 'none', 500);
        }, 3000);
        
    } catch (error) {
        statusEl.classList.add('error');
        statusIcon.textContent = '❌';
        statusText.textContent = 'Database connection failed!';
        console.error('❌ Database connection failed:', error);
        setTimeout(() => statusEl.classList.add('hide'), 10000);
    }
}

// ========== LOADING & AUTH ==========
function showLoading() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoading() {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 1000);
}

function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        window.appState.currentUser = JSON.parse(user);
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    loadAppData();
}

function showLogin() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
}

function showSignup() {
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
}

// ========== SIGNUP & LOGIN ==========
async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const terms = document.getElementById('termsCheckbox').checked;

    if (!name || !username || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (!terms) {
        showToast('Please agree to the terms and conditions', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    showLoading();

    try {
        const { data: usernameCheck } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (usernameCheck) {
            hideLoading();
            showToast('Username already exists', 'error');
            return;
        }

        const { data: emailCheck } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (emailCheck) {
            hideLoading();
            showToast('Email already exists', 'error');
            return;
        }

        const { data, error } = await supabase
            .from('users')
            .insert([{
                name: name,
                username: username,
                email: email,
                password: password,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        hideLoading();
        window.appState.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        showToast(`Welcome ${name}! Account created successfully.`, 'success');
        showApp();

    } catch (error) {
        hideLoading();
        showToast('An error occurred during signup', 'error');
        console.error('❌ Signup error:', error);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    showLoading();

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            hideLoading();
            showToast('No account found with this email', 'error');
            return;
        }

        if (data.password !== password) {
            hideLoading();
            showToast('Incorrect password', 'error');
            return;
        }

        hideLoading();
        window.appState.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));
        showToast(`Welcome back, ${data.name}!`, 'success');
        showApp();

    } catch (error) {
        hideLoading();
        showToast('An error occurred during login', 'error');
        console.error('❌ Login error:', error);
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.appState.currentUser = null;
    showToast('Successfully logged out', 'success');
    setTimeout(() => {
        location.reload();
    }, 1500);
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ========== WEBSITE SETTINGS ==========
async function loadWebsiteSettings() {
    try {
        const { data, error } = await supabase
            .from('website_settings')
            .select('*')
            .single();

        if (data) {
            window.appState.websiteSettings = data;
            applyWebsiteSettings();
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
}

function applyWebsiteSettings() {
    const settings = window.appState.websiteSettings;
    if (!settings) return;

    const logos = document.querySelectorAll('#authLogo, #appLogo');
    logos.forEach(logo => {
        if (settings.logo_url) {
            logo.src = settings.logo_url;
            logo.style.display = 'block';
        }
    });

    const names = document.querySelectorAll('#authWebsiteName, #appWebsiteName');
    names.forEach(name => {
        if (settings.website_name) {
            name.textContent = settings.website_name;
        }
    });

    if (settings.background_url) {
        const bgElement = document.getElementById('dynamicBackground');
        if (bgElement) {
            bgElement.style.backgroundImage = `url(${settings.background_url})`;
        }
    }

    if (settings.loading_animation_url) {
        applyLoadingAnimation(settings.loading_animation_url);
    }
}

function applyLoadingAnimation(animationUrl) {
    const loadingContainer = document.getElementById('loadingAnimation');
    if (!loadingContainer) return;

    const fileExt = animationUrl.split('.').pop().toLowerCase();
    const spinner = loadingContainer.querySelector('.spinner');
    if (spinner) spinner.remove();

    if (['gif', 'png', 'jpg', 'jpeg', 'json'].includes(fileExt)) {
        loadingContainer.innerHTML = `
            <img src="${animationUrl}" alt="Loading" style="max-width: 200px; max-height: 200px; pointer-events: none;">
            <p style="margin-top: 15px; color: white;">Loading...</p>
        `;
    } else if (['webm', 'mp4'].includes(fileExt)) {
        loadingContainer.innerHTML = `
            <video autoplay loop muted style="max-width: 200px; max-height: 200px; pointer-events: none;">
                <source src="${animationUrl}" type="video/${fileExt}">
            </video>
            <p style="margin-top: 15px; color: white;">Loading...</p>
        `;
    }
}

// ========== LOAD APP DATA ==========
async function loadAppData() {
    await Promise.all([
        loadBanners(),
        loadCategories(),
        loadPayments(),
        loadContacts(),
        loadProfile(),
        loadOrderHistory()
    ]);
}

// ========== IMPROVED BANNERS WITH PAGINATION ==========
async function loadBanners() {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            displayBanners(data);
        } else {
            document.getElementById('bannerSection').style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error loading banners:', error);
        document.getElementById('bannerSection').style.display = 'none';
    }
}

function displayBanners(banners) {
    const container = document.getElementById('bannerContainer');
    const pagination = document.getElementById('bannerPagination');
    
    if (!container || !pagination) return;
    
    container.innerHTML = '';
    pagination.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'banner-wrapper';

    banners.forEach((banner, index) => {
        const item = document.createElement('div');
        item.className = 'banner-item';
        item.innerHTML = `<img src="${banner.image_url}" alt="Banner ${index + 1}">`;
        wrapper.appendChild(item);
    });

    container.appendChild(wrapper);

    // Create pagination dots
    if (banners.length > 1) {
        banners.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `banner-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => goToBanner(index, wrapper, banners.length));
            pagination.appendChild(dot);
        });

        // Auto-scroll every 5 seconds
        startBannerAutoScroll(wrapper, banners.length);
    }
}

function goToBanner(index, wrapper, totalBanners) {
    window.appState.currentBannerIndex = index;
    wrapper.style.transform = `translateX(-${index * 20}%)`;
    
    // Update pagination dots
    document.querySelectorAll('.banner-dot').forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === index);
    });
}

function startBannerAutoScroll(wrapper, totalBanners) {
    // Clear existing interval
    if (window.appState.bannerInterval) {
        clearInterval(window.appState.bannerInterval);
    }
    
    window.appState.bannerInterval = setInterval(() => {
        window.appState.currentBannerIndex = (window.appState.currentBannerIndex + 1) % totalBanners;
        goToBanner(window.appState.currentBannerIndex, wrapper, totalBanners);
    }, 5000);
}

// ========== IMPROVED CATEGORIES WITH HORIZONTAL SCROLL ==========
async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            for (const category of data) {
                const { data: buttons } = await supabase
                    .from('category_buttons')
                    .select('*')
                    .eq('category_id', category.id)
                    .order('created_at', { ascending: true });
                
                category.category_buttons = buttons || [];
            }
            
            window.appState.categories = data;
            displayCategories(data);
        }
    } catch (error) {
        console.error('❌ Error loading categories:', error);
    }
}

function displayCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';

    categories.forEach(category => {
        if (category.category_buttons && category.category_buttons.length > 0) {
            const section = document.createElement('div');
            section.className = 'category-section';

            const titleDiv = document.createElement('h3');
            titleDiv.className = 'category-title';
            applyAnimationRendering(titleDiv, category.title);
            section.appendChild(titleDiv);
            
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'category-buttons';
            
            const buttonsWrapper = document.createElement('div');
            buttonsWrapper.className = 'category-buttons-wrapper';
            buttonsWrapper.id = `category-${category.id}`;
            
            buttonsContainer.appendChild(buttonsWrapper);
            section.appendChild(buttonsContainer);
            container.appendChild(section);
            
            displayCategoryButtons(category.id, category.category_buttons);
        }
    });
}

function displayCategoryButtons(categoryId, buttons) {
    const container = document.getElementById(`category-${categoryId}`);
    if (!container) return;

    buttons.forEach(button => {
        const btnEl = document.createElement('div');
        btnEl.className = 'category-button';
        btnEl.innerHTML = `
            <img src="${button.icon_url}" alt="${button.name}">
            <span></span>
        `;
        
        const nameSpan = btnEl.querySelector('span');
        applyAnimationRendering(nameSpan, button.name);
        
        btnEl.addEventListener('click', () => openCategoryPage(categoryId, button.id));
        container.appendChild(btnEl);
    });
}

// ========== IMPROVED PURCHASE MODAL WITH GAME ID CHECKER ==========
async function openCategoryPage(categoryId, buttonId) {
    console.log('\n🎮 ========== OPENING CATEGORY PAGE ==========');
    console.log('Category ID:', categoryId);
    console.log('Button ID:', buttonId);
    
    showLoading();

    try {
        // Reset state
        window.appState.currentButtonId = buttonId;
        window.appState.selectedMenuItem = null;
        window.appState.currentMenu = null;
        window.appState.currentTableData = {};
        window.appState.allMenus = [];
        window.appState.currentTables = [];
        window.appState.gameIdCheckerData = {};
        
        // Load data
        const [tablesResult, menusResult, videosResult] = await Promise.all([
            supabase.from('input_tables').select('*').eq('button_id', buttonId).order('created_at', { ascending: true }),
            supabase.from('menus').select('*').eq('button_id', buttonId).order('created_at', { ascending: true }),
            supabase.from('youtube_videos').select('*').eq('button_id', buttonId).order('created_at', { ascending: true })
        ]);

        if (menusResult.error) throw menusResult.error;
        if (tablesResult.error) throw tablesResult.error;
        if (videosResult.error) throw videosResult.error;

        const tables = tablesResult.data || [];
        const menus = menusResult.data || [];
        const videos = videosResult.data || [];

        // Store in global state
        window.appState.allMenus = menus;
        window.appState.currentTables = tables;

        console.log('✅ Loaded data:');
        console.log('  - Tables:', tables.length);
        console.log('  - Menus:', menus.length);
        console.log('  - Videos:', videos.length);

        hideLoading();

        if (menus.length === 0) {
            showToast('No products available for this category', 'warning');
            return;
        }

        showPurchaseModal(tables, menus, videos);

    } catch (error) {
        hideLoading();
        console.error('❌ Error loading category data:', error);
        showToast('Error loading products. Please try again.', 'error');
    }
}

function showPurchaseModal(tables, menus, videos) {
    console.log('\n📦 ========== SHOWING PURCHASE MODAL ==========');
    console.log('Tables:', tables.length);
    console.log('Menus:', menus.length);
    console.log('Videos:', videos.length);
    
    const modal = document.getElementById('purchaseModal');
    const content = document.getElementById('purchaseContent');
    
    let html = '<div class="purchase-form">';

    // Detect Game ID Checker Type
    let hasIdPubg = false;
    let hasIdAndServer = false;
    let idTableId = null;
    let serverTableId = null;

    tables.forEach(table => {
        const tableName = table.name.toLowerCase().trim();
        if (tableName === 'id_pubg') {
            hasIdPubg = true;
        }
        if (tableName === 'id') {
            idTableId = table.id;
        }
        if (tableName === 'server') {
            serverTableId = table.id;
        }
    });

    if (idTableId && serverTableId) {
        hasIdAndServer = true;
    }

    console.log('🔍 Game ID Checker Detection:', {
        hasIdPubg,
        hasIdAndServer,
        idTableId,
        serverTableId
    });

    // Input Tables
    if (tables && tables.length > 0) {
        html += '<div class="input-tables" style="margin-bottom: 24px;">';
        
        tables.forEach(table => {
            html += `
                <div class="form-group">
                    <label data-table-label="${table.id}" style="font-weight: 600; color: var(--text-primary);"></label>
                    <input type="text" 
                           id="table-${table.id}" 
                           data-table-id="${table.id}"
                           data-table-name="${table.name}"
                           placeholder="${table.instruction || ''}"
                           required>
                </div>
            `;
        });

        // Add Game ID Checker Button
        if (hasIdPubg) {
            html += `
                <button type="button" class="check-id-button" id="checkPubgIdBtn">
                    🔍 Verify PUBG Mobile ID
                </button>
                <div id="idCheckerResult" class="id-checker-container" style="display: none;"></div>
            `;
        } else if (hasIdAndServer) {
            html += `
                <button type="button" class="check-id-button" id="checkMlbbIdBtn">
                    🔍 Verify Mobile Legends ID
                </button>
                <div id="idCheckerResult" class="id-checker-container" style="display: none;"></div>
            `;
        }

        html += '</div>';
    }

    // Menu Items - Grid Layout
    if (menus && menus.length > 0) {
        html += '<h3 style="margin: 20px 0 16px 0; font-size: 20px; font-weight: 700; color: var(--text-primary);">Select Product</h3>';
        html += '<div class="menu-items">';
        menus.forEach(menu => {
            html += `
                <div class="menu-item" data-menu-id="${menu.id}">
                    ${menu.icon_url ? `<img src="${menu.icon_url}" class="menu-item-icon" alt="Product">` : '<div class="menu-item-icon" style="background: var(--bg-glass);"></div>'}
                    <div class="menu-item-info">
                        <div class="menu-item-name" data-menu-name="${menu.id}"></div>
                        <div class="menu-item-amount" data-menu-amount="${menu.id}"></div>
                        <div class="menu-item-price">${menu.price} MMK</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p style="text-align:center;padding:40px;color:var(--text-muted);">No products available</p>';
    }

    // Video Tutorials
    if (videos && videos.length > 0) {
        html += '<div class="video-section"><h3>Tutorials & Guides</h3>';
        videos.forEach(video => {
            html += `
                <div class="video-item" style="cursor:pointer;">
                    <img src="${video.banner_url}" alt="Tutorial Video">
                    <p data-video-desc="${video.id}"></p>
                </div>
            `;
        });
        html += '</div>';
    }

    html += `<button class="btn-primary" id="buyNowBtn" style="margin-top: 24px; width: 100%;">Continue to Purchase</button>`;
    html += '</div>';

    content.innerHTML = html;
    modal.classList.add('active');

    // Apply animations and attach events
    setTimeout(() => {
        console.log('🎨 Applying animations and attaching events...');
        
        // Render table labels
        tables.forEach(table => {
            const labelEl = document.querySelector(`[data-table-label="${table.id}"]`);
            if (labelEl) applyAnimationRendering(labelEl, table.name);
        });

        // Render menu items
        menus.forEach(menu => {
            const nameEl = document.querySelector(`[data-menu-name="${menu.id}"]`);
            const amountEl = document.querySelector(`[data-menu-amount="${menu.id}"]`);
            if (nameEl) applyAnimationRendering(nameEl, menu.name);
            if (amountEl) applyAnimationRendering(amountEl, menu.amount);
        });

        // Render video descriptions
        videos.forEach(video => {
            const descEl = document.querySelector(`[data-video-desc="${video.id}"]`);
            if (descEl) applyAnimationRendering(descEl, video.description);
            
            // Add click event for video
            const videoItem = descEl.closest('.video-item');
            if (videoItem) {
                videoItem.addEventListener('click', () => {
                    window.open(video.video_url, '_blank');
                });
            }
        });

        // Attach Game ID Checker Events
        if (hasIdPubg) {
            const checkBtn = document.getElementById('checkPubgIdBtn');
            const resultContainer = document.getElementById('idCheckerResult');
            
            if (checkBtn) {
                checkBtn.addEventListener('click', async function() {
                    const idInput = document.querySelector('[data-table-name="id_pubg"]');
                    if (idInput && resultContainer) {
                        resultContainer.style.display = 'block';
                        await handlePUBGIDCheck(idInput, resultContainer);
                    }
                });
            }
        } else if (hasIdAndServer) {
            const checkBtn = document.getElementById('checkMlbbIdBtn');
            const resultContainer = document.getElementById('idCheckerResult');
            
            if (checkBtn) {
                checkBtn.addEventListener('click', async function() {
                    const idInput = document.querySelector('[data-table-name="id"]');
                    const serverInput = document.querySelector('[data-table-name="server"]');
                    
                    if (idInput && serverInput && resultContainer) {
                        resultContainer.style.display = 'block';
                        await handleMLBBIDCheck(idInput, serverInput, resultContainer);
                    }
                });
            }
        }

        // Attach menu item click events
        const menuItems = document.querySelectorAll('.menu-item');
        console.log('📌 Attaching click events to', menuItems.length, 'menu items');
        
        menuItems.forEach(item => {
            const menuId = parseInt(item.getAttribute('data-menu-id'));
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Menu item clicked:', menuId);
                selectMenuItem(menuId);
            });
        });

        // Attach buy button event
        const buyBtn = document.getElementById('buyNowBtn');
        if (buyBtn) {
            buyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🛒 Buy button clicked');
                proceedToPurchase();
            });
        }

        console.log('✅ Events attached successfully');
    }, 150);
}

function selectMenuItem(menuId) {
    console.log('\n🔍 ========== SELECTING MENU ITEM ==========');
    console.log('Menu ID:', menuId, '(type:', typeof menuId, ')');
    console.log('Available menus:', window.appState.allMenus.length);
    
    if (!menuId || isNaN(menuId)) {
        console.error('❌ Invalid menu ID');
        showToast('Invalid product selection', 'error');
        return;
    }

    const parsedMenuId = parseInt(menuId);
    window.appState.selectedMenuItem = parsedMenuId;
    
    // Find menu in stored data
    const menu = window.appState.allMenus.find(m => m.id === parsedMenuId);
    
    if (menu) {
        window.appState.currentMenu = menu;
        console.log('✅ Menu found and stored:');
        console.log('  - ID:', menu.id);
        console.log('  - Name:', menu.name);
        console.log('  - Price:', menu.price);
        console.log('  - Amount:', menu.amount);
    } else {
        console.error('❌ Menu not found in stored menus');
        console.log('Available menu IDs:', window.appState.allMenus.map(m => m.id));
        showToast('Product data not found. Please try again.', 'error');
        return;
    }

    // Update UI
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-menu-id="${parsedMenuId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        console.log('✅ UI updated - item marked as selected');
    } else {
        console.warn('⚠️ Could not find menu item element to mark as selected');
    }
}

function closePurchaseModal() {
    console.log('🚪 Closing purchase modal');
    document.getElementById('purchaseModal').classList.remove('active');
}

async function proceedToPurchase() {
    console.log('\n🛒 ========== PROCEEDING TO PURCHASE ==========');
    console.log('Selected menu ID:', window.appState.selectedMenuItem);
    console.log('Current menu:', window.appState.currentMenu);
    console.log('Button ID:', window.appState.currentButtonId);
    
    // Validation
    if (!window.appState.selectedMenuItem) {
        console.error('❌ No menu selected');
        showToast('Please select a product first', 'warning');
        return;
    }

    if (!window.appState.currentMenu) {
        console.error('❌ Menu data not found');
        console.log('Attempting to recover menu data...');
        
        // Try to recover
        const menu = window.appState.allMenus.find(m => m.id === window.appState.selectedMenuItem);
        if (menu) {
            window.appState.currentMenu = menu;
            console.log('✅ Menu data recovered:', menu);
        } else {
            console.error('❌ Could not recover menu data');
            showToast('Product data not found. Please select the product again.', 'error');
            return;
        }
    }

    // Collect table data
    const tableData = {};
    let allFilled = true;

    console.log('🔍 Collecting table data from', window.appState.currentTables.length, 'tables');
    
    window.appState.currentTables.forEach(table => {
        const inputEl = document.querySelector(`[data-table-id="${table.id}"]`);
        if (inputEl) {
            const value = inputEl.value.trim();
            console.log(`  - Table ${table.id} (${table.name}):`, value || '(empty)');
            if (!value) {
                allFilled = false;
            }
            tableData[table.name] = value;
        } else {
            console.warn(`⚠️ Input element not found for table ${table.id}`);
        }
    });

    if (window.appState.currentTables.length > 0 && !allFilled) {
        console.error('❌ Not all required fields filled');
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    window.appState.currentTableData = tableData;
    console.log('✅ Table data collected:', tableData);

    closePurchaseModal();
    
    console.log('➡️ Moving to payment modal...');
    await showPaymentModal();
}

// ========== IMPROVED PAYMENT MODAL ==========
async function loadPayments() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('created_at', { ascending: true});

        if (error) throw error;

        window.appState.payments = data || [];
        console.log(`✅ Loaded ${data?.length || 0} payment methods`);
        return data || [];
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        window.appState.payments = [];
        return [];
    }
}

async function showPaymentModal() {
    console.log('\n💳 ========== SHOWING PAYMENT MODAL ==========');
    
    const menu = window.appState.currentMenu;
    
    if (!menu) {
        console.error('❌ Menu data not found in payment modal');
        console.log('State:', {
            selectedMenuItem: window.appState.selectedMenuItem,
            currentMenu: window.appState.currentMenu,
            allMenus: window.appState.allMenus.length
        });
        showToast('Error: Product data not found. Please try again.', 'error');
        return;
    }

    console.log('✅ Menu data available:');
    console.log('  - Name:', menu.name);
    console.log('  - Price:', menu.price);
    console.log('  - Amount:', menu.amount);

    const modal = document.getElementById('paymentModal');
    const content = document.getElementById('paymentContent');

    showLoading();

    // Load payments if not loaded
    if (!window.appState.payments || window.appState.payments.length === 0) {
        console.log('📥 Loading payment methods...');
        await loadPayments();
    }

    hideLoading();

    const payments = window.appState.payments;
    console.log('💳 Available payment methods:', payments.length);

    let html = '<div class="payment-selection">';
    
    // Order Summary
    html += `<div class="order-summary">
        <h3 data-order-summary-name style="font-size: 18px; font-weight: 700; margin-bottom: 8px;"></h3>
        <p data-order-summary-amount style="font-size: 14px; color: var(--text-muted); margin-bottom: 12px;"></p>
        <p class="price">${menu.price} MMK</p>
    </div>`;

    html += '<h3 style="margin: 24px 0 16px 0; font-size: 20px; font-weight: 700; color: var(--text-primary);">Select Payment Method</h3>';
    
    // Payment Methods
    if (payments.length === 0) {
        html += '<div style="text-align: center; color: var(--warning-color); padding: 40px; background: rgba(245, 158, 11, 0.1); border-radius: var(--border-radius); margin: 20px 0;"><p>⚠️ No payment methods available</p><p style="font-size: 14px; margin-top: 8px; color: var(--text-muted);">Please contact admin to set up payment methods</p></div>';
    } else {
        html += '<div class="payment-methods">';
        payments.forEach(payment => {
            html += `
                <div class="payment-method" data-payment-id="${payment.id}">
                    <img src="${payment.icon_url}" alt="${payment.name}">
                    <span data-payment-name="${payment.id}"></span>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '<div id="paymentDetails" style="display:none;"></div>';
    html += `<button class="btn-primary" id="submitOrderBtn" style="margin-top: 24px; width: 100%;" ${payments.length === 0 ? 'disabled' : ''}>Submit Order</button>`;
    html += '</div>';

    content.innerHTML = html;
    modal.classList.add('active');

    // Apply animations and attach events
    setTimeout(() => {
        console.log('🎨 Rendering payment modal content...');
        
        // Render order summary
        const summaryNameEl = document.querySelector('[data-order-summary-name]');
        const summaryAmountEl = document.querySelector('[data-order-summary-amount]');
        if (summaryNameEl) applyAnimationRendering(summaryNameEl, menu.name);
        if (summaryAmountEl) applyAnimationRendering(summaryAmountEl, menu.amount);

        // Render payment names
        payments.forEach(payment => {
            const nameEl = document.querySelector(`[data-payment-name="${payment.id}"]`);
            if (nameEl) applyAnimationRendering(nameEl, payment.name);
        });

        // Attach payment method click events
        const paymentMethods = document.querySelectorAll('.payment-method');
        console.log('📌 Attaching click events to', paymentMethods.length, 'payment methods');
        
        paymentMethods.forEach(item => {
            const paymentId = parseInt(item.getAttribute('data-payment-id'));
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Payment method clicked:', paymentId);
                selectPayment(paymentId);
            });
        });

        // Attach submit button event
        const submitBtn = document.getElementById('submitOrderBtn');
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📤 Submit order button clicked');
                submitOrder();
            });
        }

        console.log('✅ Payment modal events attached');
    }, 150);
}

async function selectPayment(paymentId) {
    console.log('\n💳 ========== SELECTING PAYMENT ==========');
    console.log('Payment ID:', paymentId);
    
    window.appState.selectedPayment = parseInt(paymentId);

    // Update UI
    document.querySelectorAll('.payment-method').forEach(pm => {
        pm.classList.remove('selected');
    });

    const selectedEl = document.querySelector(`[data-payment-id="${paymentId}"]`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
        console.log('✅ Payment method marked as selected');
    }

    // Load payment details
    try {
        const { data: payment, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) throw error;

        console.log('✅ Payment details loaded:', payment.name);

        const detailsDiv = document.getElementById('paymentDetails');
        if (detailsDiv && payment) {
            detailsDiv.style.display = 'block';
            detailsDiv.innerHTML = `
                <div class="payment-info">
                    <h4 data-payment-detail-name style="font-size: 18px; font-weight: 600; margin-bottom: 12px;"></h4>
                    <p data-payment-detail-instruction style="margin-bottom: 12px; line-height: 1.5;"></p>
                    <p style="margin-bottom: 16px;"><strong>Payment Address:</strong> <span data-payment-detail-address style="color: var(--accent-color); font-weight: 600;"></span></p>
                    <div class="form-group" style="margin-top: 20px;">
                        <label style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px; display: block;">Transaction ID (Last 6 digits)</label>
                        <input type="text" id="transactionCode" maxlength="6" placeholder="Enter last 6 digits" required style="font-family: monospace; letter-spacing: 1px;">
                    </div>
                </div>
            `;

            // Render with animations
            setTimeout(() => {
                const nameEl = document.querySelector('[data-payment-detail-name]');
                const instructionEl = document.querySelector('[data-payment-detail-instruction]');
                const addressEl = document.querySelector('[data-payment-detail-address]');
                
                if (nameEl) applyAnimationRendering(nameEl, payment.name);
                if (instructionEl) applyAnimationRendering(instructionEl, payment.instructions || 'Please complete payment and enter transaction details below.');
                if (addressEl) applyAnimationRendering(addressEl, payment.address);
            }, 50);
        }
    } catch (error) {
        console.error('❌ Error loading payment details:', error);
        showToast('Error loading payment details', 'error');
    }
}

function closePaymentModal() {
    console.log('🚪 Closing payment modal');
    document.getElementById('paymentModal').classList.remove('active');
}

async function submitOrder() {
    console.log('\n📤 ========== SUBMITTING ORDER ==========');
    console.log('State check:');
    console.log('  - User ID:', window.appState.currentUser?.id);
    console.log('  - Menu ID:', window.appState.selectedMenuItem);
    console.log('  - Button ID:', window.appState.currentButtonId);
    console.log('  - Payment ID:', window.appState.selectedPayment);
    console.log('  - Table data:', window.appState.currentTableData);
    console.log('  - Game ID Checker data:', window.appState.gameIdCheckerData);

    // Validation
    if (!window.appState.selectedPayment) {
        console.error('❌ No payment method selected');
        showToast('Please select a payment method', 'warning');
        return;
    }

    const transactionCode = document.getElementById('transactionCode')?.value;
    if (!transactionCode || transactionCode.trim().length !== 6) {
        console.error('❌ Invalid transaction code');
        showToast('Please enter last 6 digits of transaction ID', 'warning');
        return;
    }

    if (!window.appState.selectedMenuItem || !window.appState.currentButtonId) {
        console.error('❌ Missing order information');
        showToast('Error: Missing order information. Please try again.', 'error');
        return;
    }

    showLoading();

    try {
        const orderData = {
            user_id: parseInt(window.appState.currentUser.id),
            menu_id: parseInt(window.appState.selectedMenuItem),
            button_id: parseInt(window.appState.currentButtonId),
            payment_method_id: parseInt(window.appState.selectedPayment),
            table_data: window.appState.currentTableData,
            transaction_code: transactionCode.trim(),
            status: 'pending',
            created_at: new Date().toISOString()
        };

        console.log('📦 Order data prepared:', orderData);

        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Order submitted successfully:', data);

        hideLoading();
        closePaymentModal();
        
        const menu = window.appState.currentMenu;
        showToast(`🎉 Order Placed Successfully! Order ID: #${data.id}`, 'success', 8000);

        // Reset state
        window.appState.selectedMenuItem = null;
        window.appState.selectedPayment = null;
        window.appState.currentTableData = {};
        window.appState.currentMenu = null;
        window.appState.currentButtonId = null;
        window.appState.currentTables = [];
        window.appState.gameIdCheckerData = {};
        
        // Reload history and switch to history page
        await loadOrderHistory();
        switchPage('history');

    } catch (error) {
        hideLoading();
        console.error('❌ Order submission failed:', error);
        showToast('Error submitting order: ' + error.message, 'error');
    }
}

// ========== ORDER HISTORY ==========
async function loadOrderHistory() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                menus (name, price, amount),
                payment_methods (name)
            `)
            .eq('user_id', window.appState.currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayOrderHistory(data || []);
    } catch (error) {
        console.error('❌ Error loading orders:', error);
    }
}

function displayOrderHistory(orders) {
    const container = document.getElementById('historyContainer');
    
    if (orders.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:60px 20px;"><h3 style="margin-bottom:12px;">No Orders Yet</h3><p>Your order history will appear here once you make your first purchase.</p></div>';
        return;
    }

    container.innerHTML = '';

    orders.forEach(order => {
        const item = document.createElement('div');
        item.className = 'history-item';

        let statusClass = 'pending';
        let statusIcon = '⏳';
        if (order.status === 'approved') {
            statusClass = 'approved';
            statusIcon = '✅';
        }
        if (order.status === 'rejected') {
            statusClass = 'rejected';
            statusIcon = '❌';
        }

        item.innerHTML = `
            <div class="history-status ${statusClass}">${statusIcon} ${order.status.toUpperCase()}</div>
            <h3 data-order-name="${order.id}" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;"></h3>
            <p data-order-amount="${order.id}" style="color: var(--text-secondary); margin-bottom: 12px;"></p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                <p><strong>Price:</strong> <span style="color: var(--success-color); font-weight: 600;">${order.menus?.price || 0} MMK</span></p>
                <p><strong>Order ID:</strong> #${order.id}</p>
            </div>
            <p style="margin-bottom: 8px;"><strong>Payment:</strong> <span data-order-payment="${order.id}"></span></p>
            <p style="margin-bottom: 12px; color: var(--text-muted); font-size: 14px;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            ${order.admin_message ? `<div style="margin-top:16px;padding:16px;background:rgba(245,158,11,0.1);border-radius:var(--border-radius);border:1px solid var(--warning-color);" data-order-message="${order.id}"></div>` : ''}
        `;

        container.appendChild(item);

        setTimeout(() => {
            const nameEl = document.querySelector(`[data-order-name="${order.id}"]`);
            const amountEl = document.querySelector(`[data-order-amount="${order.id}"]`);
            const paymentEl = document.querySelector(`[data-order-payment="${order.id}"]`);
            const messageEl = document.querySelector(`[data-order-message="${order.id}"]`);

            if (nameEl) applyAnimationRendering(nameEl, order.menus?.name || 'Unknown Product');
            if (amountEl) applyAnimationRendering(amountEl, order.menus?.amount || '');
            if (paymentEl) applyAnimationRendering(paymentEl, order.payment_methods?.name || 'Unknown');
            if (messageEl && order.admin_message) applyAnimationRendering(messageEl, `<strong>Admin Message:</strong><br>${order.admin_message}`);
        }, 100);
    });
}

// ========== CONTACTS ==========
// ========== CONTACTS ==========
async function loadContacts() {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        displayContacts(data || []);
    } catch (error) {
        console.error('❌ Error loading contacts:', error);
    }
}

function displayContacts(contacts) {
    const container = document.getElementById('contactsContainer');
    
    if (contacts.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:60px 20px;"><h3 style="margin-bottom:12px;">No Contacts Available</h3><p>Contact information will be displayed here.</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    contacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `
            <img src="${contact.icon_url}" alt="${contact.name}">
            <div class="contact-info">
                <h3 data-contact-name="${contact.id}"></h3>
                <p data-contact-link="${contact.id}"></p>
            </div>
        `;
        
        container.appendChild(item);
        
        // Add click to open link
        item.addEventListener('click', () => {
            window.open(contact.link, '_blank');
        });
        
        setTimeout(() => {
            const nameEl = document.querySelector(`[data-contact-name="${contact.id}"]`);
            const linkEl = document.querySelector(`[data-contact-link="${contact.id}"]`);
            if (nameEl) applyAnimationRendering(nameEl, contact.name);
            if (linkEl) applyAnimationRendering(linkEl, contact.link);
        }, 50);
    });
}

// ========== PROFILE ==========
async function loadProfile() {
    const user = window.appState.currentUser;
    if (!user) return;

    document.getElementById('profileName').value = user.name;
    document.getElementById('profileUsername').value = user.username;
    document.getElementById('profileEmail').value = user.email;

    // Set avatar
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        avatar.textContent = user.name.charAt(0).toUpperCase();
    }
}

async function updateProfile() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!currentPassword && !newPassword) {
        showToast('No changes to save', 'warning');
        return;
    }

    if (currentPassword && !newPassword) {
        showToast('Please enter new password', 'warning');
        return;
    }

    if (!currentPassword && newPassword) {
        showToast('Please enter current password', 'warning');
        return;
    }

    const user = window.appState.currentUser;

    if (currentPassword !== user.password) {
        showToast('Current password is incorrect', 'error');
        return;
    }

    showLoading();

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ password: newPassword })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        window.appState.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(data));

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';

        hideLoading();
        showToast('Password updated successfully!', 'success');

    } catch (error) {
        hideLoading();
        showToast('Failed to update password', 'error');
        console.error('❌ Profile update error:', error);
    }
}

// ========== PAGE NAVIGATION ==========
function switchPage(page) {
    console.log('🔄 Switching to page:', page);

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Reload data for specific pages
    if (page === 'history') {
        loadOrderHistory();
    } else if (page === 'contacts') {
        loadContacts();
    } else if (page === 'mi') {
        loadProfile();
    }
}

function showHomePage() {
    switchPage('home');
}
