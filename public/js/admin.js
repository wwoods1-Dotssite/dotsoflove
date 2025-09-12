// js/admin.js - Admin panel functionality with dual gallery, edit story support, and photo uploads

// Initialize admin functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

// Initialize admin panel event listeners
function initializeAdminPanel() {
    // Auth form
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAdminLogin);
    }

    // Pet form
    const addPetForm = document.getElementById('addPetForm');
    if (addPetForm) {
        addPetForm.addEventListener('submit', handleAddPet);
    }

    // Rate form
    const rateForm = document.getElementById('rateForm');
    if (rateForm) {
        rateForm.addEventListener('submit', handleRateSubmission);
    }

    // File upload preview for add pet form
    const petImages = document.getElementById('petImages');
    if (petImages) {
        petImages.addEventListener('change', handleFilePreview);
    }

    // NEW: File upload preview for edit pet form
    const editPetImages = document.getElementById('editPetImages');
    if (editPetImages) {
        editPetImages.addEventListener('change', handleEditFilePreview);
    }
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        await API.auth.login(username, password);
        Utils.hideMessage('authError');
        
        // Show admin panel
        document.getElementById('adminAuth').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        resetSessionTimeout();
        
        // Load admin content
        loadAdminGallery();
        loadAdminRates();
        loadAdminContacts();
        
    } catch (error) {
        Utils.showError('authError', error.message || 'Login failed. Please try again.');
    }
}

// Admin tab switching
window.switchAdminTab = function(tab) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[onclick="switchAdminTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    // Load tab content
    switch(tab) {
        case 'gallery':
            loadAdminGallery();
            break;
        case 'rates':
            loadAdminRates();
            break;
        case 'contacts':
            loadAdminContacts();
            break;
    }
};

// ========== DUAL GALLERY MANAGEMENT ==========

// Load admin gallery with dual sections
window.loadAdminGallery = async function() {
    try {
        console.log('🔄 Loading admin dual gallery...');
        
        // Show loading for both sections
        Utils.showLoading('adminDorothyPetsLoading');
        Utils.showLoading('adminClientPetsLoading');
        
        const pets = await API.gallery.getAll();
        
        // Separate pets into Dorothy's pets and client pets
        const dorothyPets = pets.filter(pet => pet.is_dorothy_pet === true);
        const clientPets = pets.filter(pet => pet.is_dorothy_pet !== true);
        
        console.log(`📊 Admin gallery loaded: ${dorothyPets.length} Dorothy's pets, ${clientPets.length} client pets`);
        
        // Load Dorothy's pets section
        loadAdminGallerySection('dorothy', dorothyPets);
        
        // Load client pets section
        loadAdminGallerySection('client', clientPets);
        
    } catch (error) {
        console.error('❌ Error loading admin gallery:', error);
        Utils.showError('adminDorothyPetsLoading', 'Error loading gallery.');
        Utils.showError('adminClientPetsLoading', 'Error loading gallery.');
    }
};

// Load a specific admin gallery section
function loadAdminGallerySection(sectionType, pets) {
    const gridId = sectionType === 'dorothy' ? 'adminDorothyPetsGrid' : 'adminClientPetsGrid';
    const loadingId = sectionType === 'dorothy' ? 'adminDorothyPetsLoading' : 'adminClientPetsLoading';
    const emptyId = sectionType === 'dorothy' ? 'adminDorothyPetsEmpty' : 'adminClientPetsEmpty';
    
    const adminGrid = document.getElementById(gridId);
    const emptyElement = document.getElementById(emptyId);
    
    Utils.hideLoading(loadingId);
    
    if (pets.length === 0) {
        if (emptyElement) emptyElement.style.display = 'block';
        if (adminGrid) adminGrid.innerHTML = '';
        return;
    }
    
    if (emptyElement) emptyElement.style.display = 'none';
    if (adminGrid) {
        adminGrid.innerHTML = pets.map(pet => createAdminGalleryItem(pet)).join('');
    }
}

// Create admin gallery item HTML with edit story button
function createAdminGalleryItem(pet) {
    const images = pet.images || [];
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    
    return `
        <div class="admin-gallery-item">
            <div class="admin-actions">
                <button class="edit-btn" onclick="openEditStoryModal(${JSON.stringify(pet).replace(/"/g, '&quot;')})" title="Edit Pet Story">✏️</button>
                <button class="delete-btn" onclick="deletePet(${pet.id})" title="Delete Pet">&times;</button>
            </div>
            ${primaryImage ? 
                `<img src="${primaryImage.url}" alt="${pet.pet_name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` :
                `<div style="width: 100%; height: 150px; background: #f0f0f0; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🐾</div>`
            }
            <div style="font-weight: bold; color: #667eea;">${pet.pet_name}</div>
            ${pet.service_date ? `<div style="font-size: 0.9rem; color: #666;">${pet.service_date}</div>` : ''}
            ${pet.is_dorothy_pet ? '<div style="background: #ffd700; color: #333; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-top: 0.5rem; display: inline-block;">Dorothy\'s Pet</div>' : ''}
            ${images.length > 1 ? `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #667eea;">${images.length} photos</div>` : ''}
            ${pet.story_description ? `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #666; max-height: 3em; overflow: hidden; text-overflow: ellipsis;" title="${pet.story_description}">${pet.story_description}</div>` : ''}
        </div>
    `;
}

// Handle add pet form submission
async function handleAddPet(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const result = await API.gallery.add(formData);
        
        if (result.success) {
            Utils.showSuccess('addPetSuccess', 'Pet added to gallery successfully!');
            Utils.hideMessage('addPetError');
            e.target.reset();
            document.getElementById('filePreview').innerHTML = '';
            loadAdminGallery();
            if (window.loadDualGallery) loadDualGallery(); // Refresh public gallery
        } else {
            Utils.showError('addPetError', result.error || 'Failed to add pet');
        }
        
    } catch (error) {
        console.error('Error adding pet:', error);
        Utils.showError('addPetError', 'Failed to add pet. Please try again.');
        Utils.hideMessage('addPetSuccess');
    }
}

// Handle file preview for add pet form
function handleFilePreview() {
    const preview = document.getElementById('filePreview');
    const files = this.files;
    
    preview.innerHTML = '';
    
    if (files.length > 0) {
        preview.innerHTML = `<p style="color: #667eea; font-weight: bold;">${files.length} file(s) selected:</p>`;
        Array.from(files).forEach(file => {
            preview.innerHTML += `<p style="font-size: 0.9rem; color: #666;">• ${file.name}</p>`;
        });
    }
}

// NEW: Handle file preview for edit pet form
function handleEditFilePreview() {
    const preview = document.getElementById('editFilePreview');
    const files = this.files;
    
    preview.innerHTML = '';
    
    if (files.length > 0) {
        preview.innerHTML = `<p style="color: #667eea; font-weight: bold;">${files.length} new file(s) selected:</p>`;
        Array.from(files).forEach(file => {
            preview.innerHTML += `<p style="font-size: 0.9rem; color: #666;">• ${file.name}</p>`;
        });
    }
}

// Pet management functions
window.deletePet = async function(petId) {
    if (!confirm('Are you sure you want to delete this pet from the gallery? This will also delete all associated images.')) {
        return;
    }
    
    try {
        const result = await API.gallery.delete(petId);
        
        if (result.success) {
            loadAdminGallery();
            if (window.loadDualGallery) loadDualGallery(); // Refresh public gallery
        } else {
            alert('Failed to delete pet. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting pet:', error);
        alert('Failed to delete pet. Please try again.');
    }
};

// ========== EDIT STORY AND PHOTOS FUNCTIONALITY ==========

// UPDATED: Open edit story modal with photo support
window.openEditStoryModal = function(pet) {
    console.log('📝 Opening edit modal for pet:', pet);
    
    // Populate form with current pet data
    document.getElementById('editPetId').value = pet.id;
    document.getElementById('editPetName').value = pet.pet_name || '';
    document.getElementById('editServiceDate').value = pet.service_date || '';
    document.getElementById('editStoryDescription').value = pet.story_description || '';
    document.getElementById('editIsDorothyPet').checked = Boolean(pet.is_dorothy_pet);
    
    // Clear file input and preview
    document.getElementById('editPetImages').value = '';
    document.getElementById('editFilePreview').innerHTML = '';
    
    // NEW: Display current photos
    displayCurrentPhotos(pet.images || []);
    
    // Clear any previous messages
    Utils.hideMessage('editStorySuccess');
    Utils.hideMessage('editStoryError');
    
    // Show modal
    const modal = document.getElementById('editStoryModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
};

// Display existing photos with "Remove" checkboxes in the edit modal
function displayCurrentPhotos(images) {
    const container = document.getElementById('editCurrentPhotos');
    if (!container) return;

    console.log('[Edit Modal] images received:', images);

    if (!Array.isArray(images) || images.length === 0) {
        container.innerHTML = '<div style="color:#666;">No current photos.</div>';
        return;
    }

    // Normalize each image to have a .url we can render
    const items = images.map((img, idx) => {
        const url = img.url || img.image_url || ''; // <- handle both shapes
        return `
        <label style="display:block;border:1px solid #eee;border-radius:8px;padding:.5rem;margin-bottom:.5rem;">
            <img src="${url}" alt="Current photo ${idx + 1}"
                 style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:.4rem;">
            <div style="display:flex;align-items:center;gap:.5rem;">
                <input type="checkbox" name="remove[]" value="${url}">
                <span style="font-size:.9rem;color:#333;">Remove this photo</span>
                ${(img.isPrimary || img.is_primary) ? '<span style="margin-left:auto;font-size:.8rem;background:#ffd700;color:#333;padding:0 .4rem;border-radius:10px;">Primary</span>' : ''}
            </div>
        </label>`;
    });

    container.innerHTML = items.join('');
    // Make sure it isn't collapsed by accidental styling
    container.style.display = 'block';
}


// Close edit story modal
window.closeEditStoryModal = function() {
    const modal = document.getElementById('editStoryModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Clear form
    document.getElementById('editStoryForm').reset();
    document.getElementById('editFilePreview').innerHTML = '';
    // OLD: document.getElementById('currentPhotosSection').style.display = 'none';
    // NEW:
    const container = document.getElementById('editCurrentPhotos');
    if (container) container.innerHTML = '<small>Check any photos you want to remove.</small>';

    Utils.hideMessage('editStorySuccess');
    Utils.hideMessage('editStoryError');
};


// UPDATED: Handle edit story form submission with photo uploads
async function handleEditStorySubmission(e) {
    e.preventDefault();
    
    const petId = document.getElementById('editPetId').value;
    const petName = document.getElementById('editPetName').value.trim();
    const serviceDate = document.getElementById('editServiceDate').value.trim();
    const storyDescription = document.getElementById('editStoryDescription').value.trim();
    const isDorothyPet = document.getElementById('editIsDorothyPet').checked;
    const newImages = document.getElementById('editPetImages').files;
    
    if (!petName) {
        Utils.showError('editStoryError', 'Pet name is required.');
        return;
    }
    
    try {
        console.log(`📝 Updating pet ${petId} with new data and ${newImages.length} new images...`);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('petName', petName);
        formData.append('serviceDate', serviceDate);
        formData.append('storyDescription', storyDescription);
        formData.append('isDorothyPet', isDorothyPet);
        
        // Removals (checkboxes)
        document.querySelectorAll('input[name="remove[]"]:checked').forEach(cb => formData.append('remove[]', cb.value));
        
        // Add new images if any
        for (let i = 0; i < newImages.length; i++) {
            formData.append('images', newImages[i]);
        }
        
        // Use the new API endpoint that handles both data and files
        const response = await API.authRequest(`/api/admin/gallery/${petId}/update-with-photos`, {
            method: 'PUT',
            body: formData
            // Don't set Content-Type header - let the browser set it for FormData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const message = newImages.length > 0 
                ? `Pet story and ${newImages.length} new photos updated successfully!`
                : 'Pet story updated successfully!';
            Utils.showSuccess('editStorySuccess', message);
            Utils.hideMessage('editStoryError');
            
            // Refresh the galleries
            setTimeout(() => {
                closeEditStoryModal();
                loadAdminGallery(); // Refresh admin gallery
                if (window.loadDualGallery) loadDualGallery(); // Refresh public gallery if open
            }, 1500);
            
        } else {
            Utils.showError('editStoryError', result.error || 'Failed to update pet story and photos');
        }
        
    } catch (error) {
        console.error('❌ Error updating pet story and photos:', error);
        Utils.showError('editStoryError', 'Failed to update pet story and photos. Please try again.');
    }
}

// Initialize edit story modal form handler
document.addEventListener('DOMContentLoaded', function() {
    const editStoryForm = document.getElementById('editStoryForm');
    if (editStoryForm) {
        editStoryForm.addEventListener('submit', handleEditStorySubmission);
    }
});

// ========== RATES MANAGEMENT WITH FEATURED SERVICES ==========

// Load admin rates
window.loadAdminRates = async function() {
    try {
        Utils.showLoading('adminRatesLoading');
        const rates = await API.rates.getAllAdmin();
        
        const adminRatesGrid = document.getElementById('adminRatesGrid');
        Utils.hideLoading('adminRatesLoading');
        
        console.log('Loading admin rates:', rates);
        adminRatesGrid.innerHTML = createAdminRatesTable(rates);
        
    } catch (error) {
        console.error('Error loading admin rates:', error);
        Utils.showError('adminRatesLoading', 'Error loading rates.');
    }
};

// Create admin rates table with Featured Services support
function createAdminRatesTable(rates) {
    if (!rates || rates.length === 0) {
        return '<p>No rates found.</p>';
    }
    
    return `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden;">
                <thead style="background: #667eea; color: white;">
                    <tr>
                        <th style="padding: 1rem; text-align: left;">Service</th>
                        <th style="padding: 1rem; text-align: left;">Rate</th>
                        <th style="padding: 1rem; text-align: left;">Unit</th>
                        <th style="padding: 1rem; text-align: left;">Status</th>
                        <th style="padding: 1rem; text-align: center;">Featured</th>
                        <th style="padding: 1rem; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rates.map(rate => {
                        const isFeatured = Boolean(rate.is_featured);
                        console.log(`Rate ${rate.service_type}: featured = ${isFeatured}`);
                        
                        return `
                            <tr style="border-bottom: 1px solid #eee; ${isFeatured ? 'background: rgba(255, 215, 0, 0.1); border-left: 4px solid #ffd700;' : ''}">
                                <td style="padding: 1rem;">
                                    ${isFeatured ? '⭐ ' : ''}${rate.service_type}
                                </td>
                                <td style="padding: 1rem; font-weight: bold;">$${parseFloat(rate.rate_per_unit).toFixed(2)}</td>
                                <td style="padding: 1rem;">${rate.unit_type.replace('_', ' ')}</td>
                                <td style="padding: 1rem;">
                                    <span style="padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.8rem; background: ${rate.is_active ? '#d4edda' : '#f8d7da'}; color: ${rate.is_active ? '#155724' : '#721c24'};">
                                        ${rate.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style="padding: 1rem; text-align: center;">
                                    ${isFeatured ? 
                                        '<span style="background: linear-gradient(45deg, #ffd700, #ffed4e); color: #333; padding: 0.2rem 0.6rem; border-radius: 15px; font-size: 0.7rem; font-weight: bold;">★ FEATURED</span>' : 
                                        `<button onclick="setFeaturedService(${rate.id})" style="background: #6c757d; color: white; border: none; padding: 0.2rem 0.6rem; border-radius: 15px; font-size: 0.7rem; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">Set Featured</button>`
                                    }
                                </td>
                                <td style="padding: 1rem; text-align: center;">
                                    <button onclick="editRate(${rate.id})" style="background: #28a745; color: white; border: none; padding: 0.3rem 0.8rem; margin-right: 0.5rem; font-size: 0.8rem; border-radius: 4px; cursor: pointer;">Edit</button>
                                    <button onclick="deleteRate(${rate.id})" style="background: #dc3545; color: white; border: none; padding: 0.3rem 0.8rem; font-size: 0.8rem; border-radius: 4px; cursor: pointer;">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Set Featured Service function
window.setFeaturedService = async function(rateId) {
    if (!confirm('Set this service as the featured service? This will remove the featured status from other services.')) {
        return;
    }
    
    try {
        console.log(`🎯 Setting rate ${rateId} as featured...`);
        
        const response = await API.authRequest(`/api/admin/rates/${rateId}/featured`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        console.log('Set featured result:', result);
        
        if (result.success) {
            console.log('✅ Featured service updated successfully');
            
            // CRITICAL: Refresh ALL the UI components
            console.log('🔄 Refreshing admin rates table...');
            await loadAdminRates();
            
            console.log('🔄 Refreshing public rates...');
            if (window.loadRates) await loadRates();
            
            console.log('🔄 Refreshing About page services...');
            if (window.loadAboutServices) await loadAboutServices();
            
            // Show success message
            console.log('🎉 All UI components refreshed!');
            
        } else {
            console.error('Failed to set featured service:', result);
            alert('Failed to set featured service: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error setting featured service:', error);
        alert('Failed to set featured service. Please try again.');
    }
};

// Handle rate form submission with Featured Services support
async function handleRateSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.isActive = document.getElementById('isActive').checked;
    
    // Handle featured checkbox
    const featuredCheckbox = document.getElementById('isFeatured');
    if (featuredCheckbox) {
        data.isFeatured = featuredCheckbox.checked;
        console.log('Featured checkbox value:', data.isFeatured);
    }
    
    const rateId = document.getElementById('rateId').value;
    const isEdit = !!rateId;
    
    try {
        let result;
        if (isEdit) {
            result = await API.rates.update(rateId, data);
        } else {
            result = await API.rates.add(data);
        }
        
        if (result.success) {
            Utils.showSuccess('rateSuccess', `Rate ${isEdit ? 'updated' : 'created'} successfully!`);
            Utils.hideMessage('rateError');
            resetRateForm();
            loadAdminRates();
            if (window.loadRates) loadRates(); // Refresh public rates
            if (window.loadAboutServices) loadAboutServices(); // Refresh about page services
        } else {
            Utils.showError('rateError', result.error || `Failed to ${isEdit ? 'update' : 'create'} rate`);
        }
        
    } catch (error) {
        console.error('Error with rate:', error);
        Utils.showError('rateError', `Failed to ${isEdit ? 'update' : 'create'} rate. Please try again.`);
        Utils.hideMessage('rateSuccess');
    }
}

// Edit rate with Featured Services support
window.editRate = async function(rateId) {
    try {
        console.log(`📝 Loading rate ${rateId} for editing...`);
        
        // Get fresh data from server
        const response = await API.authRequest(`/api/admin/rates`);
        const rates = await response.json();
        const rate = rates.find(r => r.id === rateId);
        
        if (rate) {
            console.log('Rate data for editing:', rate);
            
            document.getElementById('rateId').value = rate.id;
            document.getElementById('serviceType').value = rate.service_type;
            document.getElementById('ratePerUnit').value = rate.rate_per_unit;
            document.getElementById('unitType').value = rate.unit_type;
            document.getElementById('description').value = rate.description || '';
            document.getElementById('isActive').checked = Boolean(rate.is_active);
            
            // Handle featured checkbox
            const featuredCheckbox = document.getElementById('isFeatured');
            if (featuredCheckbox) {
                featuredCheckbox.checked = Boolean(rate.is_featured);
                console.log(`Set form - Featured checkbox: ${featuredCheckbox.checked}`);
            }
            
            document.getElementById('rateSubmitBtn').textContent = 'Update Rate';
            
            // Scroll to form
            document.getElementById('rateForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            console.error('Rate not found:', rateId);
            alert('Rate not found.');
        }
    } catch (error) {
        console.error('Error loading rate for edit:', error);
        alert('Failed to load rate data for editing.');
    }
};

// Delete rate function
window.deleteRate = async function(rateId) {
    if (!confirm('Are you sure you want to delete this rate? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await API.authRequest(`/api/admin/rates/${rateId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadAdminRates();
            if (window.loadRates) loadRates(); // Refresh public rates
            if (window.loadAboutServices) loadAboutServices(); // Refresh about page services
        } else {
            alert('Failed to delete rate. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting rate:', error);
        alert('Failed to delete rate. Please try again.');
    }
};

// Reset rate form with Featured Services support
window.resetRateForm = function() {
    document.getElementById('rateForm').reset();
    document.getElementById('rateId').value = '';
    
    // Reset featured checkbox
    const featuredCheckbox = document.getElementById('isFeatured');
    if (featuredCheckbox) {
        featuredCheckbox.checked = false;
    }
    
    document.getElementById('rateSubmitBtn').textContent = 'Add Rate';
    Utils.hideMessage('rateSuccess');
    Utils.hideMessage('rateError');
};

// ========== CONTACT MANAGEMENT ==========

// Load admin contacts
window.loadAdminContacts = async function() {
    try {
        Utils.showLoading('contactsLoading');
        const contacts = await API.contact.getAllAdmin();
        
        const contactsTable = document.getElementById('contactsTable');
        const contactsEmpty = document.getElementById('contactsEmpty');
        
        Utils.hideLoading('contactsLoading');
        
        if (contacts.length === 0) {
            contactsEmpty.style.display = 'block';
            contactsTable.innerHTML = '';
            return;
        }
        
        contactsEmpty.style.display = 'none';
        contactsTable.innerHTML = createContactsTable(contacts);
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        Utils.showError('contactsLoading', 'Error loading contact requests.');
    }
};

// Create contacts table
function createContactsTable(contacts) {
    return `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Contact Info</th>
                    <th>Service</th>
                    <th>Best Time</th>
                    <th>Pet Info</th>
                    <th>Message</th>
                </tr>
            </thead>
            <tbody>
                ${contacts.map(contact => `
                    <tr>
                        <td>
                            <div style="font-weight: bold;">${Utils.formatDate(contact.created_at)}</div>
                            <div style="font-size: 0.8rem; color: #666;">${Utils.formatTime(contact.created_at)}</div>
                        </td>
                        <td style="font-weight: bold;">${contact.name}</td>
                        <td>
                            ${contact.email ? `<div>📧 ${contact.email}</div>` : ''}
                            ${contact.phone ? `<div>📞 ${contact.phone}</div>` : ''}
                        </td>
                        <td>${contact.service || 'Not specified'}</td>
                        <td>${contact.best_time || 'Not specified'}</td>
                        <td>
                            <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${contact.pet_info || 'No pet info'}">
                                ${contact.pet_info || 'No pet info provided'}
                            </div>
                            ${contact.dates ? `<div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;"><strong>Dates:</strong> ${contact.dates}</div>` : ''}
                        </td>
                        <td>
                            <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${contact.message || 'No message'}">
                                ${contact.message || 'No additional message'}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ========== DEBUG AND UTILITY FUNCTIONS ==========

// Force refresh all rates (utility function)
window.forceRefreshRates = async function() {
    console.log('🔄 Force refreshing all rates...');
    try {
        await loadAdminRates();
        console.log('✅ Admin rates refreshed');
        
        if (window.loadRates) {
            await loadRates();
            console.log('✅ Public rates refreshed');
        }
        
        if (window.loadAboutServices) {
            await loadAboutServices();
            console.log('✅ About services refreshed');
        }
        
        console.log('🎉 All rates refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing rates:', error);
        alert('Error refreshing rates');
    }
};
