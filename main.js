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

// Load services for About page from rates API
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

        // Create service items from rates data
        const serviceItems = rates.map((rate, index) => {
            const isFeatured = index === 0; // First service is featured
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

// Get service configuration (emoji and description)
function getServiceConfig(serviceType) {
    const configs = {
        'Pet Sitting (Overnight)': { 
            emoji: '🏠', 
            desc: 'I\'ll stay at your home to provide 24/7 care for your pets in their familiar environment.' 
        },
        'Dog Walking': { 
            emoji: '🚶', 
            desc: 'Regular walks to keep your dog happy, healthy, and exercised while you\'re at work.' 
        },
        'Pet Visits': { 
            emoji: '🏡', 
            desc: 'Daily check-ins to feed, play with, and care for your pets in your home.' 
        },
        'Holiday/Weekend Rate': { 
            emoji: '🎉', 
            desc: 'Special care for your pets during holidays and weekends.' 
        }
    };
    
    return configs[serviceType] || { 
        emoji: '🐾', 
        desc: 'Professional pet care services tailored to your needs.' 
    };
}

// Create service item HTML
function createServiceItem(rate, config, isFeatured, unitDisplay) {
    return `
        <div class="service-item ${isFeatured ? 'featured-service' : ''}">
            <h3>${config.emoji} ${rate.service_type}</h3>
            <p>${rate.description || config.desc}</p>
            <strong>Starting at $${parseFloat(rate.rate_per_unit).toFixed(2)}/${unitDisplay}</strong>
        </div>
    `;
}

// Create default services when no rates are available
function createDefaultServices() {
    return `
        <div class="service-item featured-service">
            <h3>🏠 In-Home Pet Sitting</h3>
            <p>I'll stay at your home to provide 24/7 care for your pets in their familiar environment.</p>
            <strong>Contact for pricing</strong>
        </div>
        <div class="service-item">
            <h3>🚶 Daily Dog Walks</h3>
            <p>Regular walks to keep your dog happy, healthy, and exercised while you're at work.</p>
            <strong>Contact for pricing</strong>
        </div>
        <div class="service-item">
            <h3>🏡 Pet Visits & Care</h3>
            <p>Daily check-ins to feed, play with, and care for your pets in your home.</p>
            <strong>Contact for pricing</strong>
        </div>
    `;
}

// Load Gallery
async function loadGallery() {
    try {
        Utils.showLoading('galleryLoading');
        const pets = await API.gallery.getAll();
        
        const galleryGrid = document.getElementById('galleryGrid');
        const galleryEmpty = document.getElementById('galleryEmpty');
        
        Utils.hideLoading('galleryLoading');
        
        if (pets.length === 0) {
            galleryEmpty.style.display = 'block';
            galleryGrid.innerHTML = '';
            return;
        }
        
        galleryEmpty.style.display = 'none';
        galleryGrid.innerHTML = pets.map(pet => createGalleryItem(pet)).join('');
        
    } catch (error) {
        console.error('Error loading gallery:', error);
        Utils.showError('galleryLoading', 'Error loading gallery. Please try again later.');
    }
}

// Create gallery item HTML
function createGalleryItem(pet) {
    const images = pet.images || [];
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    const hasMultipleImages = images.length > 1;
    
    return `
        <div class="gallery-item" onclick="openModal(${JSON.stringify(pet).replace(/"/g, '&quot;')})">
            <div class="gallery-image">
                ${primaryImage ? 
                    `<img src="${API_BASE}${primaryImage.url}" alt="${pet.pet_name}">
                     ${hasMultipleImages ? `<div class="image-count">${images.length} photos</div>` : ''}` :
                    `🐾`
                }
            </div>
            <div class="gallery-content">
                ${pet.is_dorothy_pet ? '<div class="dorothy-pet-badge">Dorothy\'s Pet</div>' : ''}
                <div class="pet-name">${pet.pet_name}</div>
                ${pet.service_date ? `<div class="pet-date">${pet.service_date}</div>` : ''}
                ${pet.story_description ? `<div class="pet-story">${pet.story_description}</div>` : ''}
            </div>
        </div>
    `;
}

// Load Rates
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
        
        ratesEmpty.style.display = 'none';
        ratesGrid.innerHTML = rates.map((rate, index) => createRateCard(rate, index)).join('');
        
    } catch (error) {
        console.error('Error loading rates:', error);
        Utils.showError('ratesLoading', 'Error loading rates. Please try again later.');
    }
}

// Create rate card HTML
function createRateCard(rate, index) {
    const isFeatured = index === 0; // Make first rate featured
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
