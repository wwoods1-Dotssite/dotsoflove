// js/admin.js - Final readable version with full admin functionality
// - Auth & session restore
// - Gallery (add/edit/delete, show current photos with remove, upload new photos)
// - Rates management
// - Contacts list
// - Admin tab switching
// Notes: relies on API object from api.js

document.addEventListener('DOMContentLoaded', () => {
  initializeAdminPanel();
});

// ===================== INITIALIZATION =====================
function initializeAdminPanel() {
  const authForm = document.getElementById('authForm');
  if (authForm) authForm.addEventListener('submit', handleAdminLogin);

  const addPetForm = document.getElementById('addPetForm');
  if (addPetForm) addPetForm.addEventListener('submit', handleAddPet);

  const rateForm = document.getElementById('rateForm');
  if (rateForm) rateForm.addEventListener('submit', handleRateSubmission);

  const petImages = document.getElementById('petImages');
  if (petImages) petImages.addEventListener('change', handleFilePreview);

  const editPetImages = document.getElementById('editPetImages');
  if (editPetImages) editPetImages.addEventListener('change', handleEditFilePreview);

  autoRestoreAdminSession();
}

// ===================== AUTH =====================
function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;

  fetch(`${API_BASE}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json().then(data => ({ ok: res.ok, data })))
  .then(({ ok, data }) => {
    if (!ok || !data.success) {
      Utils.showError('authError', data.error || 'Login failed');
      return;
    }
    adminToken = data.token;
    localStorage.setItem('adminToken', adminToken);
    Utils.hideMessage('authError');

    document.getElementById('adminAuth').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    resetSessionTimeout();

    loadAdminGallery();
    loadAdminRates();
    loadAdminContacts();
  })
  .catch(() => Utils.showError('authError', 'Network or server error'));
}

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
  } catch {
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

    renderAdminGallerySection('dorothy', dorothyPets);
    renderAdminGallerySection('client', clientPets);
  } catch (error) {
    console.error('Error loading gallery:', error);
    Utils.showError('adminDorothyPetsLoading', 'Error loading gallery');
    Utils.showError('adminClientPetsLoading', 'Error loading gallery');
  }
};

function renderAdminGallerySection(sectionType, pets) {
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
  adminGrid.innerHTML = pets.map(pet => createAdminCardHTML(pet)).join('');
}

function createAdminCardHTML(pet) {
  const images = pet.images || [];
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  const imgHTML = primaryImage ? 
    `<img src="${primaryImage.url}" alt="${pet.pet_name}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;margin-bottom:1rem;">`
    : '';
  return `
    <div class="admin-gallery-item">
      <div class="admin-actions">
        <button class="edit-btn" onclick='openEditStoryModal(${JSON.stringify(pet).replace(/"/g, "&quot;")})'>✏️</button>
        <button class="delete-btn" onclick="deletePet(${pet.id})">&times;</button>
      </div>
      ${imgHTML}
      <div style="font-weight:bold;color:#667eea;">${pet.pet_name}</div>
    </div>`;
}

// ---- Add Pet ----
async function handleAddPet(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  try {
    const result = await API.gallery.add(formData);
    if (result.success) {
      Utils.showSuccess('addPetSuccess', 'Pet added successfully!');
      Utils.hideMessage('addPetError');
      e.target.reset();
      document.getElementById('filePreview').innerHTML = '';
      loadAdminGallery();
    } else {
      Utils.showError('addPetError', result.error || 'Failed to add pet');
    }
  } catch (err) {
    console.error('Error adding pet:', err);
    Utils.showError('addPetError', 'Error adding pet.');
  }
}

// ---- File Choose preview (Add) ----
function handleFilePreview(event) {
  const preview = document.getElementById('filePreview');
  const files = event.target.files;
  preview.innerHTML = '';
  if (files && files.length > 0) {
    preview.innerHTML = `<p style="color:#667eea;font-weight:bold;">${files.length} file(s) selected:</p>`;
    Array.from(files).forEach(file => {
      preview.innerHTML += `<p style="font-size:0.9rem;color:#666;">• ${file.name}</p>`;
    });
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
    displayCurrentPhotos(Array.isArray(freshPet?.images) ? freshPet.images : []);
  } catch {
    displayCurrentPhotos(pet.images || []);
  }
};

function displayCurrentPhotos(images) {
  const container = document.getElementById('editCurrentPhotos');
  const section = document.getElementById('currentPhotosSection');

  if (!Array.isArray(images) || images.length === 0) {
    container.innerHTML = '<div style="color:#666;text-align:center;">No current photos.</div>';
    section.style.display = 'block';
    return;
  }

  container.innerHTML = images.map((img, i) => {
    const url = img.url || img.image_url || img.s3_url || '';
    return `
      <div style="border:1px solid #ddd;border-radius:8px;padding:0.5rem;">
        <img src="${url}" alt="Photo ${i+1}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;">
        <label style="display:flex;align-items:center;font-size:0.8rem;">
          <input type="checkbox" name="remove[]" value="${url}" style="margin-right:0.3rem;"> Remove
        </label>
      </div>`;
  }).join('');

  section.style.display = 'block';
}

window.closeEditStoryModal = function() {
  const modal = document.getElementById('editStoryModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('editStoryForm').reset();
  document.getElementById('editCurrentPhotos').innerHTML = '';
};

document.addEventListener('DOMContentLoaded', () => {
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
    const result = await API.authRequest(`/api/admin/gallery/${petId}/update-with-photos`, {
      method: 'PUT',
      body: formData
    });

    if (result.success) {
      Utils.showSuccess('editStorySuccess', 'Pet updated successfully!');
      document.getElementById('editPetImages').value = '';
      // reload latest single pet images then the gallery
      try {
        const fresh = await API.gallery.getById(petId);
        displayCurrentPhotos(Array.isArray(fresh?.images) ? fresh.images : []);
      } catch {}
      setTimeout(() => {
        closeEditStoryModal();
        loadAdminGallery();
      }, 1200);
    } else {
      Utils.showError('editStoryError', result.error || 'Failed to update pet');
    }
  } catch (err) {
    console.error('Update failed:', err);
    Utils.showError('editStoryError', 'Error updating pet');
  }
}

// ---- Delete Pet ----
window.deletePet = async function(petId) {
  if (!confirm('Delete this pet and all photos?')) return;
  try {
    const result = await API.gallery.delete(petId);
    if (result.success) loadAdminGallery();
    else alert('Failed to delete pet');
  } catch {
    alert('Error deleting pet');
  }
};

// ===================== RATES =====================
async function handleRateSubmission(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.isActive = document.getElementById('isActive').checked;
  const featuredCheckbox = document.getElementById('isFeatured');
  if (featuredCheckbox) data.isFeatured = featuredCheckbox.checked;
  const rateId = document.getElementById('rateId').value;
  const isEdit = !!rateId;
  try {
    const result = isEdit 
      ? await API.rates.update(rateId, data)
      : await API.rates.add(data);
    if (result.success) {
      Utils.showSuccess('rateSuccess', `Rate ${isEdit ? 'updated' : 'created'} successfully!`);
      Utils.hideMessage('rateError');
      resetRateForm();
      loadAdminRates();
      if (window.loadRates) loadRates();
      if (window.loadAboutServices) loadAboutServices();
    } else {
      Utils.showError('rateError', result.error || 'Failed to save rate');
    }
  } catch (error) {
    console.error('Error saving rate:', error);
    Utils.showError('rateError', 'Failed to save rate.');
  }
}

window.resetRateForm = function() {
  document.getElementById('rateForm').reset();
  document.getElementById('rateId').value = '';
  const featuredCheckbox = document.getElementById('isFeatured');
  if (featuredCheckbox) featuredCheckbox.checked = false;
  document.getElementById('rateSubmitBtn').textContent = 'Add Rate';
  Utils.hideMessage('rateSuccess');
  Utils.hideMessage('rateError');
};

window.loadAdminRates = async function() {
  try {
    Utils.showLoading('adminRatesLoading');
    const rates = await API.rates.getAllAdmin();
    const grid = document.getElementById('adminRatesGrid');
    Utils.hideLoading('adminRatesLoading');
    grid.innerHTML = createAdminRatesTable(rates);
  } catch (err) {
    console.error('Error loading rates:', err);
    Utils.showError('adminRatesLoading', 'Error loading rates.');
  }
};

function createAdminRatesTable(rates) {
  if (!rates?.length) return '<p>No rates found.</p>';
  return rates.map(r => `<div>${r.service_type} - $${r.rate_per_unit}</div>`).join('');
}

// ===================== CONTACTS =====================
window.loadAdminContacts = async function() {
  try {
    Utils.showLoading('contactsLoading');
    const contacts = await API.contact.getAllAdmin();
    const table = document.getElementById('contactsTable');
    Utils.hideLoading('contactsLoading');
    table.innerHTML = contacts.map(c => `<p>${c.name}: ${c.service}</p>`).join('');
  } catch (err) {
    console.error('Error loading contacts:', err);
    Utils.showError('contactsLoading', 'Error loading contact requests.');
  }
};

// ===================== ADMIN NAV =====================
window.switchAdminTab = function(tabName) {
  document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
  const active = document.getElementById(`admin-${tabName}`);
  if (active) active.style.display = 'block';
  document.querySelectorAll('.admin-nav button').forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`.admin-nav button[data-tab="${tabName}"]`);
  if (activeButton) activeButton.classList.add('active');
};
