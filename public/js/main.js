// js/main.js - Core navigation and application logic with dual gallery support (fixed)

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadInitialContent();
    setupDateValidation();
    initializeEditStoryModal();
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

// ✅ Fixed About Services
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
            console.log('⚠️ No rates found, using defaults');
            servicesGrid.innerHTML = createDefaultServices();
            return;
        }

        const sortedRates = [...rates].sort((a, b) => (a.is_featured ? -1 : 1));
        const serviceItems = sortedRates.map(rate => {
            const unitDisplay = rate.unit_type.replace('per_', '');
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

// ✅ Fixed Gallery
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
            console.error('❌ Invalid gallery data format:', pets);
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

// Other helper functions from original file remain unchanged
