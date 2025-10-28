// admin.js - Updated version with DB integration, image upload/delete, and gallery management

document.addEventListener('DOMContentLoaded', () => {
  initializeAdminPanel();
});

function initializeAdminPanel() {
  const authForm = document.getElementById('authForm');
  if (authForm) authForm.addEventListener('submit', handleAdminLogin);

  const addPetForm = document.getElementById('addPetForm');
  if (addPetForm) addPetForm.addEventListener('submit', handleAddPet);

  const petImageUpload = document.getElementById('petImageUpload');
  if (petImageUpload) petImageUpload.addEventListener('change', handleFilePreview);

  autoRestoreAdminSession();
}

// ===================== AUTH =====================
async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;

  try {
    const res = await fetch(`/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      Utils.showError('authError', data.message || 'Login failed');
      return;
    }

    localStorage.setItem('adminToken', data.token);
    Utils.hideMessage('authError');
    document.getElementById('adminAuth').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadAdminGallery();
    loadAdminRates();
  } catch (err) {
    console.error('❌ Login failed:', err);
    Utils.showError('authError', 'Network error.');
  }
}

async function autoRestoreAdminSession() {
  const token = localStorage.getItem('adminToken');
  if (!token) return;
  document.getElementById('adminAuth').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  loadAdminGallery();
  loadAdminRates();
}

// ===================== PET MANAGEMENT =====================
async function handleAddPet(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to add pet');

    const pet = await res.json();
    Utils.showSuccess('addPetSuccess', 'Pet added successfully!');

    // Upload selected images (if any)
    const files = document.getElementById('petImageUpload').files;
    if (files.length > 0) await uploadPetImages(pet.id, files);

    form.reset();
    loadAdminGallery();
  } catch (err) {
    console.error('❌ Error adding pet:', err);
    Utils.showError('addPetError', 'Error adding pet');
  }
}

async function uploadPetImages(petId, files) {
  for (const file of files) {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`/api/pets/${petId}/images`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      console.error(`❌ Failed to upload image for pet ${petId}`);
    }
  }
}

async function loadAdminGallery() {
  try {
    const res = await fetch('/api/gallery');
    const pets = await res.json();
    const container = document.getElementById('adminGallery');

    if (!Array.isArray(pets) || pets.length === 0) {
      container.innerHTML = '<p>No pets found in the gallery.</p>';
      return;
    }

    container.innerHTML = pets.map(pet => `
      <div class="admin-pet-card">
        <h4>${pet.pet_name}</h4>
        <p>${pet.story_description || ''}</p>
        <div class="admin-pet-images">
          ${pet.images && pet.images.length > 0
            ? pet.images.map(img => `
              <div class="admin-image-item">
                <img src="${img.image_url}" alt="${pet.pet_name}" />
                <button class="delete-img-btn" onclick="deletePetImage(${pet.id}, ${img.id})">🗑️</button>
              </div>`).join('')
            : '<p>No images</p>'}
        </div>
        <button class="delete-pet-btn" onclick="deletePet(${pet.id})">Remove Pet</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('❌ Failed to load gallery:', err);
  }
}

async function deletePetImage(petId, imageId) {
  if (!confirm('Are you sure you want to delete this image?')) return;
  try {
    const res = await fetch(`/api/pets/${petId}/images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    Utils.showSuccess('adminMessage', 'Image deleted');
    loadAdminGallery();
  } catch (err) {
    console.error('❌ Error deleting image:', err);
    Utils.showError('adminMessage', 'Failed to delete image');
  }
}

async function deletePet(petId) {
  if (!confirm('Delete this pet and all related images?')) return;
  try {
    const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    Utils.showSuccess('adminMessage', 'Pet deleted');
    loadAdminGallery();
  } catch (err) {
    console.error('❌ Error deleting pet:', err);
    Utils.showError('adminMessage', 'Failed to delete pet');
  }
}

function handleFilePreview(e) {
  const preview = document.getElementById('filePreview');
  const files = e.target.files;
  preview.innerHTML = '';
  if (files && files.length > 0) {
    preview.innerHTML = `<p><strong>${files.length}</strong> file(s) selected:</p>`;
    Array.from(files).forEach(f => {
      preview.innerHTML += `<p>${f.name}</p>`;
    });
  }
}

// ===================== RATES =====================
async function loadAdminRates() {
  try {
    const res = await fetch('/api/rates');
    const rates = await res.json();
    const container = document.getElementById('adminRates');

    if (!Array.isArray(rates) || rates.length === 0) {
      container.innerHTML = '<p>No rates found.</p>';
      return;
    }

    container.innerHTML = rates.map(r => `
      <div class="rate-card ${r.is_featured ? 'featured' : ''}">
        <h4>${r.service_type}</h4>
        <p>$${parseFloat(r.rate_per_unit).toFixed(2)} ${r.unit_type.replace('_', ' ')}</p>
        <p>${r.description}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error('❌ Error loading rates:', err);
  }
}

// ===================== LOGOUT =====================
window.logout = function() {
  localStorage.removeItem('adminToken');
  document.getElementById('adminAuth').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  Utils.showSuccess('authMessage', 'You have been logged out.');
};