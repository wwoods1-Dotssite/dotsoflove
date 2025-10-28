// js/main.js - Full navigation and app logic with gallery + services fixes (production ready)

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadInitialContent();
    setupDateValidation();
    // initializeEditStoryModal();
});

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            const targetPage = this.getAttribute('href').substring(1);
            const pageElement = document.getElementById(targetPage);
            if (pageElement) {
                pageElement.classList.add('active');
                loadPageContent(targetPage);
            }
        });
    });
}

function loadPageContent(pageName) {
    switch(pageName) {
        case 'about': loadAboutServices(); break;
        case 'gallery': loadDualGallery(); break;
        case 'rates': loadRates(); break;
        case 'admin': checkAdminAuth(); break;
        default: break;
    }
}

function loadInitialContent() {
    loadDualGallery();
    loadRates();
    loadAboutServices();
}

// ✅ About Services Fix
async function loadAboutServices() {
    try {
        console.log('🔄 Loading about services...');
        Utils.showLoading('aboutServicesLoading');
        const rates = await API.rates.getAll();

        console.log('📊 Rates received:', rates);
        const servicesGrid = document.getElementById('aboutServices'); // fixed ID
        if (!servicesGrid) {
            console.error('❌ aboutServices element not found');
            return;
        }
        Utils.hideLoading('aboutServicesLoading');

        if (!Array.isArray(rates) || rates.length === 0) {
            servicesGrid.innerHTML = createDefaultServices();
            return;
        }

        const sortedRates = [...rates].sort((a, b) => (a.is_featured ? -1 : 1));
        const serviceItems = sortedRates.map(rate => {
            const unitDisplay = rate.unit_type.replace('per_', '').replace('_', ' ');
            const config = getServiceConfig(rate.service_type);
            return createServiceItem(rate, config, rate.is_featured, unitDisplay);
        });
        servicesGrid.innerHTML = serviceItems.join('');
        console.log('✅ About services updated successfully');
    } catch (error) {
        console.error('❌ Error loading services for about page:', error);
        Utils.showError('aboutServicesLoading', 'Error loading services.');
    }
}

function getServiceConfig(serviceType) {
    const normalized = serviceType.toLowerCase();
    const configs = {
        'pet sitting (overnight)': { emoji: '🏠', description: 'Overnight care in your home' },
        'dog walking': { emoji: '🐕', description: 'Regular walks for your dog' },
        'pet visits': { emoji: '🏃', description: 'Check-ins and care visits' },
        'holiday/weekend rate': { emoji: '🎉', description: 'Special holiday care' },
        'pet playtime': { emoji: '🎾', description: 'Interactive play sessions' }
    };
    return configs[normalized] || { emoji: '🐾', description: 'Professional pet care' };
}

function createServiceItem(rate, config, isFeatured, unitDisplay) {
    return `
        <div class="service-item ${isFeatured ? 'featured-service' : ''}">
            <h3>${config.emoji} ${rate.service_type}</h3>
            <p><strong>$${parseFloat(rate.rate_per_unit).toFixed(2)}</strong> ${unitDisplay}</p>
            <p>${rate.description || config.description}</p>
        </div>
    `;
}

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
    `;
}

// ✅ Gallery Fix
async function loadDualGallery() {
    try {
        console.log('🔄 Loading dual gallery...');
        Utils.showLoading('dorothyPetsLoading');
        Utils.showLoading('clientPetsLoading');

        let pets = await API.gallery.getAll();
        if (pets && typeof pets === 'object' && !Array.isArray(pets)) {
            pets = pets.data || pets.results || [];
        }
        if (!Array.isArray(pets)) {
            throw new Error('Invalid gallery data format');
        }

        const dorothyPets = pets.filter(p => p.is_dorothy_pet);
        const clientPets = pets.filter(p => !p.is_dorothy_pet);
        console.log(`📊 Gallery loaded: ${dorothyPets.length} Dorothy's pets, ${clientPets.length} client pets`);

        loadGallerySection('dorothy', dorothyPets);
        loadGallerySection('client', clientPets);
    } catch (error) {
        console.error('❌ Error loading dual gallery:', error);
        Utils.showError('dorothyPetsLoading', 'Error loading gallery.');
        Utils.showError('clientPetsLoading', 'Error loading gallery.');
    }
}

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

function createGalleryItem(pet) {
    const images = pet.images || [];
    const primaryImage = images.find(img => img.isPrimary || img.is_primary) || images[0];

    return `
        <div class="gallery-item" onclick="openModal(${JSON.stringify(pet).replace(/"/g, '&quot;')})">
            <div class="gallery-image">
                ${primaryImage ? `<img src="${primaryImage.image_url}" alt="${pet.pet_name}">` : '🐾'}
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

// === Rates Section ===
async function loadRates() {
    try {
        Utils.showLoading('ratesLoading');
        const rates = await API.rates.getAll();
        const grid = document.getElementById('ratesGrid');
        const empty = document.getElementById('ratesEmpty');
        Utils.hideLoading('ratesLoading');

        if (!Array.isArray(rates) || rates.length === 0) {
            empty.style.display = 'block';
            grid.innerHTML = '';
            return;
        }

        const sorted = [...rates].sort((a, b) => (a.is_featured ? -1 : 1));
        grid.innerHTML = sorted.map(r => createRateCard(r, r.is_featured)).join('');
        empty.style.display = 'none';
    } catch (err) {
        console.error('Error loading rates:', err);
        Utils.showError('ratesLoading', 'Error loading rates.');
    }
}

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

// Export global references
window.loadAboutServices = loadAboutServices;
window.loadDualGallery = loadDualGallery;
window.loadRates = loadRates;
