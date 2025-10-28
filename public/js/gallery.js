// js/gallery.js - Gallery and modal functionality

// Global variables for image carousel
let currentImageIndex = 0;
let currentImages = [];

// Open modal with pet details and image carousel
window.openModal = function(pet) {
    const modal = document.getElementById('imageModal');
    const modalImageContainer = document.getElementById('modalImageContainer');
    const modalPetName = document.getElementById('modalPetName');
    const modalPetDate = document.getElementById('modalPetDate');
    const modalPetStory = document.getElementById('modalPetStory');
    const modalBadge = document.getElementById('modalBadge');

    const images = pet.images || [];
    currentImages = images;
    currentImageIndex = 0;

    // Set modal content based on number of images
    if (images.length > 1) {
        modalImageContainer.innerHTML = createImageCarousel(images, pet.pet_name);
    } else if (images.length === 1) {
        modalImageContainer.innerHTML = createSingleImage(images[0], pet.pet_name);
    } else {
        modalImageContainer.innerHTML = createNoImagePlaceholder();
    }

    // Set pet details
    modalPetName.textContent = pet.pet_name;
    modalPetDate.textContent = pet.service_date || '';
    modalPetDate.style.display = pet.service_date ? 'block' : 'none';
    modalPetStory.textContent = pet.story_description || '';
    modalPetStory.style.display = pet.story_description ? 'block' : 'none';
    modalBadge.style.display = pet.is_dorothy_pet ? 'block' : 'none';

    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

// Create image carousel HTML
function createImageCarousel(images, petName) {
    return `
        <div class="image-carousel">
            <div class="carousel-container">
                ${images.map((img, index) => `
                    <img src="${img.image_url || img.url}" 
                         alt="${petName}" 
                         class="carousel-image ${index === 0 ? 'active' : ''}"
                         data-index="${index}">
                `).join('')}
            </div>
            <button class="carousel-prev" onclick="prevImage()">&lt;</button>
            <button class="carousel-next" onclick="nextImage()">&gt;</button>
            <div class="carousel-dots">
                ${images.map((_, index) => `
                    <span class="dot ${index === 0 ? 'active' : ''}" 
                          onclick="currentImage(${index})"></span>
                `).join('')}
            </div>
        </div>
    `;
}

// Create single image HTML
function createSingleImage(image, petName) {
    return `<img src="${image.image_url || image.url}" alt="${petName}" class="single-image">`;
}

// Create no image placeholder
function createNoImagePlaceholder() {
    return `
        <div style="display: flex; align-items: center; justify-content: center; font-size: 4rem; color: #667eea;">
            🐾
        </div>
    `;
}

// Carousel navigation functions
window.nextImage = function() {
    if (currentImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    updateCarousel();
};

window.prevImage = function() {
    if (currentImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
};

window.currentImage = function(index) {
    currentImageIndex = index;
    updateCarousel();
};

// Update carousel display
function updateCarousel() {
    const images = document.querySelectorAll('.carousel-image');
    const dots = document.querySelectorAll('.dot');
    
    images.forEach((img, index) => {
        img.classList.toggle('active', index === currentImageIndex);
    });
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentImageIndex);
    });
}

// Close modal function
window.closeModal = function() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

// Modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.close');

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Close modal when clicking close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Keyboard support for modal
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('imageModal');
        if (modal.style.display === 'block') {
            switch(e.key) {
                case 'Escape':
                    closeModal();
                    break;
                case 'ArrowLeft':
                    prevImage();
                    break;
                case 'ArrowRight':
                    nextImage();
                    break;
            }
        }
    });
});
