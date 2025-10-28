// admin.js - corrected version with response normalization for pets, rates, contacts

document.addEventListener('DOMContentLoaded', () => {
  initializeAdminPanel();
});

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

// ============ ADMIN LOGIN ============
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
  .catch(() => Utils.showError('authError', 'Network or server error'));
}

// ============ AUTO RESTORE SESSION ============
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
    } else localStorage.removeItem('adminToken');
  } catch {
    localStorage.removeItem('adminToken');
  }
}

// ============ LOAD GALLERY ============
window.loadAdminGallery = async function() {
  try {
    Utils.showLoading('adminDorothyPetsLoading');
    Utils.showLoading('adminClientPetsLoading');

    const petsResponse = await API.gallery.getAll();
    const pets = Array.isArray(petsResponse) ? petsResponse : petsResponse?.pets || [];

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
  adminGrid.innerHTML = pets.map(pet => `
    <div class="admin-gallery-item">
      <div class="admin-actions">
        <button class="edit-btn" onclick='openEditStoryModal(${JSON.stringify(pet).replace(/"/g, "&quot;")})'>✏️</button>
        <button class="delete-btn" onclick="deletePet(${pet.id})">&times;</button>
      </div>
      ${pet.images?.[0]?.url ? `<img src="${pet.images[0].url}" style="width:100%;height:150px;object-fit:cover;">` : ''}
      <div>${pet.pet_name}</div>
    </div>`).join('');
}

// ============ CONTACTS ============
window.loadAdminContacts = async function() {
  try {
    Utils.showLoading('contactsLoading');
    const contactsResponse = await API.contact.getAllAdmin();
    const contacts = Array.isArray(contactsResponse) ? contactsResponse : contactsResponse?.contacts || [];
    const table = document.getElementById('contactsTable');
    Utils.hideLoading('contactsLoading');
    table.innerHTML = contacts.map(c => `<p>${c.name}: ${c.service}</p>`).join('');
  } catch (err) {
    console.error('Error loading contacts:', err);
    Utils.showError('contactsLoading', 'Error loading contact requests.');
  }
};
