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

// REPLACE the loadAboutServices function in main.js with this fixed version:

async function loadAboutServices() {
    try {
        console.log('🔄 Loading about services...');
        Utils.showLoading('aboutServicesLoading');
        const rates = await API.rates.getAll();
        
        console.log('📊 Rates received:', rates);
        console.log('⭐ Featured rates:', rates.filter(r => r.is_featured));
        
        const servicesGrid = document.getElementById('aboutServicesGrid');
        Utils.hideLoading('aboutServicesLoading');
        
        if (rates.length === 0) {
            console.log('⚠️ No rates found, using defaults');
            servicesGrid.innerHTML = createDefaultServices();
            return;
        }

        // Sort rates to put featured service first
        const sortedRates = [...rates].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return 0;
        });

        console.log('📈 Sorted rates (featured first):', sortedRates.map(r => ({ 
            name: r.service_type, 
            featured: Boolean(r.is_featured)
        })));

        // Create service items from rates data
        const serviceItems = sortedRates.map((rate) => {
            const isFeatured = Boolean(rate.is_featured);
            const unitDisplay = rate.unit_type.replace('per_', '').replace('_', ' ');
            
            console.log(`🔧 Creating service item for "${rate.service_type}", featured: ${isFeatured}`);
            
            const serviceConfig = getServiceConfig(rate.service_type);
            return createServiceItem(rate, serviceConfig, isFeatured, unitDisplay);
        });

        servicesGrid.innerHTML = serviceItems.join('');
        console.log('✅ About services updated successfully');
        
        // Double-check the DOM was updated
        const featuredElements = servicesGrid.querySelectorAll('.featured-service');
        console.log(`🎯 Featured elements in DOM: ${featuredElements.length}`);
        
        if (featuredElements.length > 0) {
            console.log('🔍 Featured service content:', featuredElements[0].innerHTML.substring(0, 200));
        }
        
    } catch (error) {
        console.error('❌ Error loading services for about page:', error);
        Utils.showError('aboutServicesLoading', 'Error loading services.');
    }
}

// UPDATED: Fix the getServiceConfig function to handle more service types
function getServiceConfig(serviceType) {
    // Normalize the service type for comparison
    const normalizedType = serviceType.toLowerCase();
    
    const configs = {
        'pet sitting (overnight)': { emoji: '🏠', description: 'Overnight care in your home' },
        'dog walking': { emoji: '🐕', description: 'Regular walks for your dog' },
        'pet visits': { emoji: '🏃', description: 'Check-ins and care visits' },
        'holiday/weekend rate': { emoji: '🎉', description: 'Special holiday care' },
        'pet playtime': { emoji: '🎾', description: 'Interactive play sessions' }
    };
    
    // Try exact match first
    let config = configs[normalizedType];
    
    // If no exact match, try partial matches
    if (!config) {
        if (normalizedType.includes('sitting') || normalizedType.includes('overnight')) {
            config = { emoji: '🏠', description: 'Overnight care in your home' };
        } else if (normalizedType.includes('walking') || normalizedType.includes('walk')) {
            config = { emoji: '🐕', description: 'Regular walks for your dog' };
        } else if (normalizedType.includes('visit')) {
            config = { emoji: '🏃', description: 'Check-ins and care visits' };
        } else if (normalizedType.includes('holiday') || normalizedType.includes('weekend')) {
            config = { emoji: '🎉', description: 'Special holiday care' };
        } else if (normalizedType.includes('play')) {
            config = { emoji: '🎾', description: 'Interactive play sessions' };
        } else {
            config = { emoji: '🐾', description: 'Professional pet care' };
        }
    }
    
    console.log(`🏷️ Service "${serviceType}" mapped to:`, config);
    return config;
}

// UPDATED: Fix the createServiceItem function 
function createServiceItem(rate, serviceConfig, isFeatured, unitDisplay) {
    const serviceItem = `
        <div class="service-item ${isFeatured ? 'featured-service' : ''}">
            <h3>${serviceConfig.emoji} ${rate.service_type}</h3>
            <p><strong>$${parseFloat(rate.rate_per_unit).toFixed(2)}</strong> ${unitDisplay}</p>
            <p>${rate.description || serviceConfig.description}</p>
        </div>
    `;
    
    console.log(`📝 Created service item for "${rate.service_type}" (featured: ${isFeatured}):`, serviceItem.substring(0, 100));
    
    return serviceItem;
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
// Helper function to get service configuration (add to main.js)
function getServiceConfig(serviceType) {
    const configs = {
        'Pet Sitting (Overnight)': { emoji: '🏠', description: 'Overnight care in your home' },
        'Dog Walking': { emoji: '🐕', description: 'Regular walks for your dog' },
        'Pet Visits': { emoji: '🏃', description: 'Check-ins and care visits' },
        'Holiday/Weekend Rate': { emoji: '🎉', description: 'Special holiday care' },
        'Pet Playtime': { emoji: '🎾', description: 'Interactive play sessions' }
    };
    
    return configs[serviceType] || { emoji: '🐾', description: 'Professional pet care' };
}

// Helper function to create service item (add to main.js)
function createServiceItem(rate, serviceConfig, isFeatured, unitDisplay) {
    return `
        <div class="service-item ${isFeatured ? 'featured-service' : ''}">
            <h3>${serviceConfig.emoji} ${rate.service_type}</h3>
            <p><strong>$${parseFloat(rate.rate_per_unit).toFixed(2)}</strong> ${unitDisplay}</p>
            <p>${rate.description || serviceConfig.description}</p>
        </div>
    `;
}
// Add these functions to main.js:

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
    
    return `
        <div class="gallery-item" onclick="openModal(${JSON.stringify(pet).replace(/"/g, '&quot;')})">
            <div class="gallery-image">
                ${primaryImage ? 
                    `<img src="${API_BASE}${primaryImage.url}" alt="${pet.pet_name}">` :
                    `🐾`
                }
                ${images.length > 1 ? `<div class="image-count">${images.length} photos</div>` : ''}
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
// Helper function to create default services (add to main.js)
function createDefaultServices() {
    return `
        <div class="service-item featured-service">
            <h3>🏠 Pet Sitting (Overnight)</h3>
            <p><strong>$75.00</strong> per night</p>
            <p>Overnight care in your home with 24/7 attention</p>
        </div>
        <div class="service-item">
            <h3>🐕 Dog Walking</h3>
            <p><strong>$25.00</strong> per walk</p>
            <p>30-45 minute walks to keep your dog happy and healthy</p>
        </div>
        <div class="service-item">
            <h3>🏃 Pet Visits</h3>
            <p><strong>$30.00</strong> per visit</p>
            <p>Check-ins, feeding, and care visits throughout the day</p>
        </div>
        <div class="service-item">
            <h3>🎉 Holiday/Weekend Rate</h3>
            <p><strong>$85.00</strong> per night</p>
            <p>Special holiday and weekend care rates</p>
        </div>
    `;
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

/* Add this to main.css - Date Picker Styles */

.date-picker-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.5rem;
}

.date-input-group {
    display: flex;
    flex-direction: column;
}

.date-input-group label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #555;
    margin-bottom: 0.3rem;
}

.date-input-group input[type="date"] {
    padding: 0.8rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
    background: white;
}

.date-input-group input[type="date"]:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Style the calendar icon */
.date-input-group input[type="date"]::-webkit-calendar-picker-indicator {
    background: #667eea;
    border-radius: 3px;
    cursor: pointer;
    padding: 2px;
}

/* Mobile responsive for date pickers */
@media (max-width: 768px) {
    .date-picker-container {
        grid-template-columns: 1fr;
        gap: 0.8rem;
    }
}
