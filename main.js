// js/main.js - Core navigation and application logic with dual gallery support

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadInitialContent();
    setupDateValidation(); // Add date validation support
    initializeEditStoryModal(); // Initialize the edit story modal
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
            loadDualGallery();
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
    loadDualGallery();
    loadRates();
    loadAboutServices();
}

// Load About Services with Featured Service Support
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
        
    } catch (error) {
        console.error('❌ Error loading services for about page:', error);
        Utils.showError('aboutServicesLoading', 'Error loading services.');
    }
}

// Get service configuration with emoji and description
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

// Create service item HTML
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

// Create default services fallback
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

// Load Dual Gallery (both Dorothy's pets and client pets)
async function loadDualGallery() {
    try {
        console.log('🔄 Loading dual gallery...');
        
        // Show loading for both sections
        Utils.showLoading('dorothyPetsLoading');
        Utils.showLoading('clientPetsLoading');
        
        const pets = await API.gallery.getAll();
        
        // Separate pets into Dorothy's pets and client pets
        const dorothyPets = pets.filter(pet => pet.is_dorothy_pet === true);
        const clientPets = pets.filter(pet => pet.is_dorothy_pet !== true);
        
        console.log(`📊 Gallery loaded: ${dorothyPets.length} Dorothy's pets, ${clientPets.length} client pets`);
        
        // Load Dorothy's pets section
        loadGallerySection('dorothy', dorothyPets);
        
        // Load client pets section
        loadGallerySection('client', clientPets);
        
    } catch (error) {
        console.error('❌ Error loading dual gallery:', error);
        Utils.showError('dorothyPetsLoading', 'Error loading gallery.');
        Utils.showError('clientPetsLoading', 'Error loading gallery.');
    }
}

// Load a specific gallery section
function loadGallerySection(sectionType, pets) {
    const gridId = sectionType === 'dorothy' ? 'dorothyPetsGrid' : 'clientPetsGrid';
    const loadingId = sectionType === 'dorothy' ? 'dorothyPetsLoading' : 'clientPetsLoading';
    const emptyId = sectionType === 'dorothy' ? 'dorothyPetsEmpty' : 'clientPetsEmpty';
    
    const galleryGrid = document.getElementById(gridId);
    const galleryEmpty = document.getElementById(emptyId);
    
    Utils.hideLoading(loadingId);
    
    if (pets.length === 0) {
        if (galleryEmpty) galleryEmpty.style.display = 'block';
        if (galleryGrid) galleryGrid.innerHTML = '';
        return;
    }
    
    if (galleryEmpty) galleryEmpty.style.display = 'none';
    if (galleryGrid) {
        galleryGrid.innerHTML = pets.map(pet => createGalleryItem(pet)).join('');
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

// Load Rates with Featured Support
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

// Create rate card HTML
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

// ========== EDIT STORY MODAL FUNCTIONALITY ==========

// Initialize edit story modal
function initializeEditStoryModal() {
    const editStoryForm = document.getElementById('editStoryForm');
    if (editStoryForm) {
        editStoryForm.addEventListener('submit', handleEditStorySubmission);
    }
}

// Open edit story modal
window.openEditStoryModal = function(pet) {
    console.log('📝 Opening edit modal for pet:', pet);
    
    // Populate form with current pet data
    document.getElementById('editPetId').value = pet.id;
    document.getElementById('editPetName').value = pet.pet_name || '';
    document.getElementById('editServiceDate').value = pet.service_date || '';
    document.getElementById('editStoryDescription').value = pet.story_description || '';
    document.getElementById('editIsDorothyPet').checked = Boolean(pet.is_dorothy_pet);
    
    // Clear any previous messages
    Utils.hideMessage('editStorySuccess');
    Utils.hideMessage('editStoryError');
    
    // Show modal
    const modal = document.getElementById('editStoryModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

// Close edit story modal
window.closeEditStoryModal = function() {
    const modal = document.getElementById('editStoryModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear form
    document.getElementById('editStoryForm').reset();
    Utils.hideMessage('editStorySuccess');
    Utils.hideMessage('editStoryError');
};

// Handle edit story form submission
async function handleEditStorySubmission(e) {
    e.preventDefault();
    
    const petId = document.getElementById('editPetId').value;
    const petName = document.getElementById('editPetName').value.trim();
    const serviceDate = document.getElementById('editServiceDate').value.trim();
    const storyDescription = document.getElementById('editStoryDescription').value.trim();
    const isDorothyPet = document.getElementById('editIsDorothyPet').checked;
    
    if (!petName) {
        Utils.showError('editStoryError', 'Pet name is required.');
        return;
    }
    
    try {
        console.log(`📝 Updating pet ${petId} with new data...`);
        
        const result = await API.gallery.update(petId, {
            petName: petName,
            serviceDate: serviceDate,
            storyDescription: storyDescription,
            isDorothyPet: isDorothyPet
        });
        
        if (result.success) {
            Utils.showSuccess('editStorySuccess', 'Pet story updated successfully!');
            Utils.hideMessage('editStoryError');
            
            // Refresh the galleries
            setTimeout(() => {
                closeEditStoryModal();
                loadDualGallery(); // Refresh public gallery
                if (window.loadAdminGallery) loadAdminGallery(); // Refresh admin gallery if open
            }, 1500);
            
        } else {
            Utils.showError('editStoryError', result.error || 'Failed to update pet story');
        }
        
    } catch (error) {
        console.error('❌ Error updating pet story:', error);
        Utils.showError('editStoryError', 'Failed to update pet story. Please try again.');
    }
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
    const adminElements = ['adminDorothyPetsGrid', 'adminClientPetsGrid', 'adminRatesGrid', 'contactsTable'];
    adminElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    showAdminAuth();
    alert('Logged out successfully');
};

// Setup date validation and constraints (moved from contact.js for main.js access)
function setupDateValidation() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        startDateInput.min = today;
        endDateInput.min = today;
        
        // When start date changes, update end date minimum
        startDateInput.addEventListener('change', function() {
            const startDate = this.value;
            if (startDate) {
                endDateInput.min = startDate;
                
                // If end date is before start date, clear it
                if (endDateInput.value && endDateInput.value < startDate) {
                    endDateInput.value = '';
                }
            }
        });
        
        // Validate end date is not before start date
        endDateInput.addEventListener('change', function() {
            const startDate = startDateInput.value;
            const endDate = this.value;
            
            if (startDate && endDate && endDate < startDate) {
                alert('End date cannot be before start date.');
                this.value = '';
            }
        });
    }
}

// Format dates for submission
function formatDatesForSubmission(startDate, endDate) {
    if (!startDate) return '';
    
    const startFormatted = formatDateForDisplay(startDate);
    
    if (endDate && endDate !== startDate) {
        const endFormatted = formatDateForDisplay(endDate);
        return `${startFormatted} to ${endFormatted}`;
    }
    
    return startFormatted;
}

// Format date for display
function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Modal event listeners for edit story modal
document.addEventListener('DOMContentLoaded', function() {
    const editModal = document.getElementById('editStoryModal');
    
    // Close modal when clicking outside
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditStoryModal();
            }
        });
    }
    
    // Keyboard support for modal
    document.addEventListener('keydown', function(e) {
        const editModal = document.getElementById('editStoryModal');
        if (editModal && editModal.style.display === 'block') {
            if (e.key === 'Escape') {
                closeEditStoryModal();
            }
        }
    });
});

// Global functions for accessing from HTML
window.loadAboutServices = loadAboutServices;
window.loadDualGallery = loadDualGallery;
window.loadRates = loadRates;
window.checkAdminAuth = checkAdminAuth;
window.formatDatesForSubmission = formatDatesForSubmission;
window.formatDateForDisplay = formatDateForDisplay;

// Legacy function for backward compatibility
window.loadGallery = loadDualGallery;
