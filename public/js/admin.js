// js/admin.js - Updated with hoisted functions, fixed initialization order, and upload/gallery enhancements

// Ensure everything runs after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

// ===================== INITIALIZATION =====================
function initializeAdminPanel() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAdminLogin);
    }

    const addPetForm = document.getElementById('addPetForm');
    if (addPetForm) {
        addPetForm.addEventListener('submit', handleAddPet);
    }

    const rateForm = document.getElementById('rateForm');
    if (rateForm) {
        rateForm.addEventListener('submit', handleRateSubmission);
    }

    const petImages = document.getElementById('petImages');
    if (petImages) {
        petImages.addEventListener('change', handleFilePreview);
    }

    const editPetImages = document.getElementById('editPetImages');
    if (editPetImages) {
        editPetImages.addEventListener('change', handleEditFilePreview);
    }

    // Auto-restore admin session if token exists
    autoRestoreAdminSession();
}

// ===================== ADMIN LOGIN =====================
function handleAdminLogin(e) {
    e.preventDefault();

    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    console.log('Attempting admin login:', username);

    fetch(`${API_BASE}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok && data.success) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            Utils.hideMessage('authError');

            document.getElementById('adminAuth').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            resetSessionTimeout();

            loadAdminGallery();
            loadAdminRates();
            loadAdminContacts();
        } else {
            Utils.showError('authError', data.error || 'Login failed');
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        Utils.showError('authError', 'Network or server error');
    });
}

// ===================== AUTO RESTORE =====================
async function autoRestoreAdminSession() {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
        const valid = await API.auth.validate();
        if (valid) {
            document.getElementById('adminAuth').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadAdminGallery();
            loadAdminRates();
            loadAdminContacts();
        } else {
            localStorage.removeItem('adminToken');
        }
    } catch (err) {
        console.error('Admin restore failed:', err);
        localStorage.removeItem('adminToken');
    }
}

// ===================== GALLERY =====================
window.loadAdminGallery = async function() {
    try {
        Utils.showLoading('adminDorothyPetsLoading');
        Utils.showLoading('adminClientPetsLoading');
        const pets = await API.gallery.getAll();

        const dorothyPets = pets.filter(p => p.is_dorothy_pet === true);
        const clientPets = pets.filter(p => p.is_dorothy_pet !== true);

        loadAdminGallerySection('dorothy', dorothyPets);
        loadAdminGallerySection('client', clientPets);
    } catch (error) {
        console.error('Error loading gallery:', error);
        Utils.showError('adminDorothyPetsLoading', 'Error loading gallery');
        Utils.showError('adminClientPetsLoading', 'Error loading gallery');
    }
};

function loadAdminGallerySection(sectionType, pets) {
    const gridId = sectionType === 'dorothy' ? 'adminDorothyPetsGrid' : 'adminClientPetsGrid';
    const loadingId = sectionType === 'dorothy' ? 'adminDorothyPetsLoading' : 'adminClientPetsLoading';
    const emptyId = sectionType === 'dorothy' ? 'adminDorothyPetsEmpty' : 'adminClientPetsEmpty';

    const adminGrid = document.getElementById(gridId);
    const emptyElement = document.getElementById(emptyId);
    Utils.hideLoading(loadingId);

    if (!pets.length) {
        emptyElement.style.display = 'block';
        adminGrid.innerHTML = '';
        return;
    }

    emptyElement.style.display = 'none';
    adminGrid.innerHTML = pets.map(pet => createAdminGalleryItem(pet)).join('');
}

function createAdminGalleryItem(pet) {
    const images = pet.images || [];
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    return `
        <div class="admin-gallery-item">
            <div class="admin-actions">
                <button class="edit-btn" onclick='openEditStoryModal(${JSON.stringify(pet).replace(/"/g, "&quot;")})'>✏️</button>
                <button class="delete-btn" onclick="deletePet(${pet.id})">&times;</button>
            </div>
            ${primaryImage ? `<img src="${primaryImage.url}" alt="${pet.pet_name}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;margin-bottom:1rem;">` : ''}
            <div style="font-weight:bold;color:#667eea;">${pet.pet_name}</div>
        </div>`;
}

// ===================== ADD PET =====================
async function handleAddPet(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const result = await API.gallery.add(formData);
        if (result.success) {
            Utils.showSuccess('addPetSuccess', 'Pet added!');
            Utils.hideMessage('addPetError');
            e.target.reset();
            document.getElementById('filePreview').innerHTML = '';
            loadAdminGallery();
        } else {
            Utils.showError('addPetError', result.error || 'Failed to add pet');
        }
    } catch (err) {
        console.error('Error adding pet:', err);
        Utils.showError('addPetError', 'Error adding pet');
    }
}

function handleFilePreview() {
    const preview = document.getElementById('filePreview');
    const files = this.files;
    preview.innerHTML = '';
    if (files.length > 0) {
        preview.innerHTML = `<p>${files.length} file(s) selected:</p>`;
        Array.from(files).forEach(f => preview.innerHTML += `<p>${f.name}</p>`);
    }
}

// ===================== EDIT PET =====================
function handleEditFilePreview() {
    const preview = document.getElementById('editFilePreview');
    const files = this.files;
    preview.innerHTML = '';
    if (files.length > 0) {
        preview.innerHTML = `<p>${files.length} new file(s) selected:</p>`;
        Array.from(files).forEach(f => preview.innerHTML += `<p>${f.name}</p>`);
    }
}

window.openEditStoryModal = async function(pet) {
    document.getElementById('editPetId').value = pet.id;
    document.getElementById('editPetName').value = pet.pet_name || '';
    document.getElementById('editServiceDate').value = pet.service_date || '';
    document.getElementById('editStoryDescription').value = pet.story_description || '';
    document.getElementById('editIsDorothyPet').checked = Boolean(pet.is_dorothy_pet);

    const modal = document.getElementById('editStoryModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    try {
        const freshPet = await API.gallery.getById(pet.id);
        displayCurrentPhotos(freshPet.images || []);
    } catch {
        displayCurrentPhotos(pet.images || []);
    }
};

function displayCurrentPhotos(images) {
    const container = document.getElementById('editCurrentPhotos');
    const section = document.getElementById('currentPhotosSection');
    if (!images.length) {
        container.innerHTML = '<div>No current photos.</div>';
        section.style.display = 'block';
        return;
    }
    container.innerHTML = images.map((img, i) => `
        <div style="border:1px solid #ddd;border-radius:8px;padding:0.5rem;">
            <img src="${img.url || img.image_url}" alt="Photo ${i+1}" style="width:100%;height:100px;object-fit:cover;">
            <label><input type="checkbox" name="remove[]" value="${img.url || img.image_url}"> Remove</label>
        </div>
    `).join('');
    section.style.display = 'block';
}

window.closeEditStoryModal = function() {
    const modal = document.getElementById('editStoryModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('editStoryForm').reset();
    document.getElementById('editCurrentPhotos').innerHTML = '';
};

document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editStoryForm');
    if (editForm) editForm.addEventListener('submit', handleEditStorySubmission);
});

async function handleEditStorySubmission(e) {
    e.preventDefault();
    const petId = document.getElementById('editPetId').value;
    const petName = document.getElementById('editPetName').value.trim();
    const storyDescription = document.getElementById('editStoryDescription').value.trim();
    const isDorothyPet = document.getElementById('editIsDorothyPet').checked;
    const serviceDate = document.getElementById('editServiceDate').value.trim();
    const newImages = document.getElementById('editPetImages')?.files || [];

    const formData = new FormData();
    formData.append('petName', petName);
    formData.append('storyDescription', storyDescription);
    formData.append('serviceDate', serviceDate);
    formData.append('isDorothyPet', isDorothyPet);

    const remove = document.querySelectorAll('input[name="remove[]"]:checked');
    remove.forEach(cb => formData.append('remove[]', cb.value));
    for (let i = 0; i < newImages.length; i++) formData.append('images', newImages[i]);

    try {
        const response = await API.authRequest(`/api/admin/gallery/${petId}/update-with-photos`, {
            method: 'PUT',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            Utils.showSuccess('editStorySuccess', 'Pet updated successfully!');
            document.getElementById('editPetImages').value = '';
            setTimeout(() => {
                closeEditStoryModal();
                loadAdminGallery();
            }, 1500);
        } else Utils.showError('editStoryError', result.error || 'Failed to update pet');
    } catch (err) {
        console.error('Update failed:', err);
        Utils.showError('editStoryError', 'Error updating pet');
    }
}

// ===================== DELETE PET =====================
window.deletePet = async function(petId) {
    if (!confirm('Delete this pet and all photos?')) return;
    try {
        const result = await API.gallery.delete(petId);
        if (result.success) loadAdminGallery();
        else alert('Failed to delete pet');
    } catch (err) {
        alert('Error deleting pet');
    }
};

// ===================== REMAINING RATES/CONTACTS FUNCTIONS (unchanged) =====================
// For brevity, these remain identical to your working copy.
