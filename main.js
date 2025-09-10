// js/main.js - Core navigation and application logic

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadInitialContent();
});

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and pages
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding page
            const targetPage = this.getAttribute('href').substring(1);
            const pageElement = document.getElementById(targetPage);
            
            if (pageElement) {
                pageElement.classList.add('active');
                
                // Load page-specific content
                loadPageContent(targetPage);
            }
        });
    });
}

// Load content based on the active page
function loadPageContent(pageName) {
    switch(pageName) {
        case 'about':
            loadAboutServices();
            break;
        case 'gallery':
            loadGallery();
            break;
        case 'rates':
            loadRates();
            break;
        case 'admin':
            checkAdminAuth();
            break;
        case 'testimonials':
        case 'contact':
            // These pages are static, no loading needed
            break;
        default:
            console.warn(`Unknown page: ${pageName}`);
    }
}

// Load initial content when app starts
function loadInitialContent() {
    // Load gallery and rates on startup for caching
    loadGallery();
    loadRates();
    loadAboutServices();
}

// Load services for About page from rates API (updated)
async function loadAboutServices() {
    try {
        Utils.showLoading('aboutServicesLoading');
        const rates = await API.rates.getAll();
        
        const servicesGrid = document.getElementById('aboutServicesGrid');
        Utils.hideLoading('aboutServicesLoading');
        
        if (rates.length === 0) {
            servicesGrid.innerHTML = createDefaultServices();
            return;
        }

        // Sort rates to put featured service first
        const sortedRates = [...rates].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return 0;
        });

        // Create service items from rates data
        const serviceItems = sortedRates.map((rate, index) => {
            const isFeatured = rate.is_featured; // Use database flag instead of index
            const unitDisplay = rate.unit_type.replace('per_', '').replace('_', ' ');
            
            // Map service types to emojis and descriptions
            const serviceConfig = getServiceConfig(rate.service_type);
            
            return createServiceItem(rate, serviceConfig, isFeatured, unitDisplay);
        });

        servicesGrid.innerHTML = serviceItems.join('');
        
    } catch (error) {
        console.error('Error loading services for about page:', error);
        Utils.showError('aboutServicesLoading', 'Error loading services.');
    }
}

// Load Rates (updated)
async function loadRates() {
    try {
        Utils.showLoading('ratesLoading');
        const rates = await API.rates.getAll();
        
        const ratesGrid = document.getElementById('ratesGrid');
        const ratesEmpty = document.getElementById('ratesEmpty');
        
        Utils.hideLoading('ratesLoading');
        
        if (rates.length === 0) {
            ratesEmpty.style.display = 'block';
            ratesGrid.innerHTML = '';
            return;
        }
        
        // Sort rates to put featured service first
        const sortedRates = [...rates].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return 0;
        });
        
        ratesEmpty.style.display = 'none';
        ratesGrid.innerHTML = sortedRates.map((rate) => createRateCard(rate, rate.is_featured)).join('');
        
    } catch (error) {
        console.error('Error loading rates:', error);
        Utils.showError('ratesLoading', 'Error loading rates. Please try again later.');
    }
}

// Create rate card HTML (updated)
function createRateCard(rate, isFeatured) {
    return `
        <div class="rate-card ${isFeatured ? 'featured-rate' : ''}">
            <div class="rate-title">${rate.service_type}</div>
            <div class="rate-price">$${parseFloat(rate.rate_per_unit).toFixed(2)}</div>
            <div class="rate-unit">${rate.unit_type.replace('_', ' ')}</div>
            ${rate.description ? `<div class="rate-description">${rate.description}</div>` : ''}
        </div>
    `;
}


// Check admin authentication
function checkAdminAuth() {
    if (adminToken) {
        validateAdminToken();
    } else {
        showAdminAuth();
    }
}

// Validate admin token
async function validateAdminToken() {
    try {
        const isValid = await API.auth.validate();
        if (isValid) {
            showAdminPanel();
        } else {
            API.auth.logout();
            showAdminAuth();
        }
    } catch (error) {
        API.auth.logout();
        showAdminAuth();
    }
}

// Show admin authentication form
function showAdminAuth() {
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('adminAuth').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    resetSessionTimeout();
    
    // Load admin content
    if (window.loadAdminGallery) loadAdminGallery();
    if (window.loadAdminRates) loadAdminRates();
    if (window.loadAdminContacts) loadAdminContacts();
}

// Global logout function
window.logout = function() {
    API.auth.logout();
    
    // Clear any cached admin data
    const adminElements = ['adminGalleryGrid', 'adminRatesGrid', 'contactsTable'];
    adminElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    showAdminAuth();
    alert('Logged out successfully');
};

// Global functions for accessing from HTML
window.loadAboutServices = loadAboutServices;
window.loadGallery = loadGallery;
window.loadRates = loadRates;
window.checkAdminAuth = checkAdminAuth;
