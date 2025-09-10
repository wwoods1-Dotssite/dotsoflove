// js/admin.js - Admin panel functionality

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

    // File upload preview
    const petImages = document.getElementById('petImages');
    if (petImages) {
        petImages.addEventListener('change', handleFilePreview);
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

// Load admin gallery
window.loadAdminGallery = async function() {
    try {
        Utils.showLoading('adminGalleryLoading');
        const pets = await API.gallery.getAll();
        
        const adminGrid = document.getElementById('adminGalleryGrid');
        Utils.hideLoading('adminGalleryLoading');
        
        adminGrid.innerHTML = pets.map(pet => createAdminGalleryItem(pet)).join('');
        
    } catch (error) {
        console.error('Error loading admin gallery:', error);
        Utils.showError('adminGalleryLoading', 'Error loading gallery.');
    }
};

// Create admin gallery item HTML
function createAdminGalleryItem(pet) {
    const images = pet.images || [];
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    
    return `
        <div class="admin-gallery-item">
            <div class="admin-actions">
                <button class="edit-btn" onclick="editPet(${pet.id})" title="Edit Pet">✏️</button>
                <button class="delete-btn" onclick="deletePet(${pet.id})" title="Delete Pet">&times;</button>
            </div>
            ${primaryImage ? 
                `<img src="${API_BASE}${primaryImage.url}" alt="${pet.pet_name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` :
                `<div style="width: 100%; height: 150px; background: #f0f0f0; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🐾</div>`
            }
            <div style="font-weight: bold; color: #667eea;">${pet.pet_name}</div>
            ${pet.service_date ? `<div style="font-size: 0.9rem; color: #666;">${pet.service_date}</div>` : ''}
            ${pet.is_dorothy_pet ? '<div style="background: #ffd700; color: #333; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-top: 0.5rem; display: inline-block;">Dorothy\'s Pet</div>' : ''}
            ${images.length > 1 ? `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #667eea;">${images.length} photos</div>` : ''}
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
            if (window.loadGallery) loadGallery(); // Refresh public gallery
        } else {
            Utils.showError('addPetError', result.error || 'Failed to add pet');
        }
        
    } catch (error) {
        console.error('Error adding pet:', error);
        Utils.showError('addPetError', 'Failed to add pet. Please try again.');
        Utils.hideMessage('addPetSuccess');
    }
}

// Handle file preview
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

// Pet management functions
window.editPet = async function(petId) {
    const newStory = prompt('Edit pet story (leave empty to keep current):');
    if (newStory !== null) {
        try {
            const result = await API.gallery.update(petId, {
                petName: 'Current Name', // This should be enhanced to get actual current name
                storyDescription: newStory
            });
            
            if (result.success) {
                loadAdminGallery();
                if (window.loadGallery) loadGallery();
            }
        } catch (error) {
            console.error('Error editing pet:', error);
            alert('Failed to edit pet. Please try again.');
        }
    }
};

window.deletePet = async function(petId) {
    if (!confirm('Are you sure you want to delete this pet from the gallery? This will also delete all associated images.')) {
        return;
    }
    
    try {
        const result = await API.gallery.delete(petId);
        
        if (result.success) {
            loadAdminGallery();
            if (window.loadGallery) loadGallery(); // Refresh public gallery
        } else {
            alert('Failed to delete pet. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting pet:', error);
        alert('Failed to delete pet. Please try again.');
    }
};

// Load admin rates
window.loadAdminRates = async function() {
    try {
        Utils.showLoading('adminRatesLoading');
        const rates = await API.rates.getAllAdmin();
        
        const adminRatesGrid = document.getElementById('adminRatesGrid');
        Utils.hideLoading('adminRatesLoading');
        
        adminRatesGrid.innerHTML = createAdminRatesTable(rates);
        
    } catch (error) {
        console.error('Error loading admin rates:', error);
        Utils.showError('adminRatesLoading', 'Error loading rates.');
    }
};

// Update the createAdminRatesTable function
function createAdminRatesTable(rates) {
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
                    ${rates.map(rate => `
                        <tr style="border-bottom: 1px solid #eee; ${rate.is_featured ? 'background: rgba(255, 215, 0, 0.1);' : ''}">
                            <td style="padding: 1rem;">
                                ${rate.is_featured ? '⭐ ' : ''}${rate.service_type}
                            </td>
                            <td style="padding: 1rem; font-weight: bold;">$${parseFloat(rate.rate_per_unit).toFixed(2)}</td>
                            <td style="padding: 1rem;">${rate.unit_type.replace('_', ' ')}</td>
                            <td style="padding: 1rem;">
                                <span style="padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.8rem; background: ${rate.is_active ? '#d4edda' : '#f8d7da'}; color: ${rate.is_active ? '#155724' : '#721c24'};">
                                    ${rate.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td style="padding: 1rem; text-align: center;">
                                ${rate.is_featured ? 
                                    '<span style="color: #ffd700; font-size: 1.2rem;">⭐</span>' : 
                                    `<button onclick="setFeaturedService(${rate.id})" class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.7rem;">Set Featured</button>`
                                }
                            </td>
                            <td style="padding: 1rem; text-align: center;">
                                <button onclick="editRate(${rate.id})" class="btn btn-success" style="padding: 0.3rem 0.8rem; margin-right: 0.5rem; font-size: 0.8rem;">Edit</button>
                                <button onclick="deleteRate(${rate.id})" class="btn btn-danger" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Update the handleRateSubmission function
async function handleRateSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.isActive = document.getElementById('isActive').checked;
    data.isFeatured = document.getElementById('isFeatured').checked;
    
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

// Update the editRate function
window.editRate = async function(rateId) {
    try {
        const rates = await API.rates.getAllAdmin();
        const rate = rates.find(r => r.id === rateId);
        
        if (rate) {
            document.getElementById('rateId').value = rate.id;
            document.getElementById('serviceType').value = rate.service_type;
            document.getElementById('ratePerUnit').value = rate.rate_per_unit;
            document.getElementById('unitType').value = rate.unit_type;
            document.getElementById('description').value = rate.description || '';
            document.getElementById('isActive').checked = rate.is_active;
            document.getElementById('isFeatured').checked = rate.is_featured;
            document.getElementById('rateSubmitBtn').textContent = 'Update Rate';
        }
    } catch (error) {
        console.error('Error loading rate for edit:', error);
        alert('Failed to load rate data for editing.');
    }
};

// Add new function to set featured service
window.setFeaturedService = async function(rateId) {
    if (!confirm('Set this service as the featured service? This will remove the featured status from other services.')) {
        return;
    }
    
    try {
        const response = await API.authRequest(`/api/admin/rates/${rateId}/featured`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadAdminRates();
            if (window.loadRates) loadRates(); // Refresh public rates
            if (window.loadAboutServices) loadAboutServices(); // Refresh about page services
        } else {
            alert('Failed to set featured service. Please try again.');
        }
    } catch (error) {
        console.error('Error setting featured service:', error);
        alert('Failed to set featured service. Please try again.');
    }
};

// Update the resetRateForm function
window.resetRateForm = function() {
    document.getElementById('rateForm').reset();
    document.getElementById('rateId').value = '';
    document.getElementById('isFeatured').checked = false;
    document.getElementById('rateSubmitBtn').textContent = 'Add Rate';
    Utils.hideMessage('rateSuccess');
    Utils.hideMessage('rateError');
};

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
