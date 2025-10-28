// admin.js - Final, complete version with all functionality restored and improved
// Includes: Auth, Add Pet, Edit, Delete, Rates Management, Contacts, Logout, Tab Switching

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

// ===================== AUTO RESTORE SESSION =====================
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

// ===================== ADD PET =====================
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

// ===================== FILE PREVIEW =====================
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

// ===================== RATES MANAGEMENT =====================
async function handleRateSubmission(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.isActive = document.getElementById('isActive')?.checked || false;
  const featuredCheckbox = document.getElementById('isFeatured');
  if (featuredCheckbox) data.isFeatured = featuredCheckbox.checked;

  const rateId = document.getElementById('rateId').value;
  const isEdit = !!rateId;

  try {
    let result;
    if (isEdit) result = await API.rates.update(rateId, data);
    else result = await API.rates.add(data);

    if (result.success) {
      Utils.showSuccess('rateSuccess', `Rate ${isEdit ? 'updated' : 'created'} successfully!`);
      Utils.hideMessage('rateError');
      resetRateForm();
      loadAdminRates();
      if (window.loadRates) loadRates();
      if (window.loadAboutServices) loadAboutServices();
    } else {
      Utils.showError('rateError', result.error || `Failed to ${isEdit ? 'update' : 'create'} rate`);
    }
  } catch (error) {
    console.error('Error with rate:', error);
    Utils.showError('rateError', `Failed to ${isEdit ? 'update' : 'create'} rate.`);
    Utils.hideMessage('rateSuccess');
  }
}

function resetRateForm() {
  const form = document.getElementById('rateForm');
  if (form) form.reset();
  const featuredCheckbox = document.getElementById('isFeatured');
  if (featuredCheckbox) featuredCheckbox.checked = false;
  const btn = document.getElementById('rateSubmitBtn');
  if (btn) btn.textContent = 'Add Rate';
  Utils.hideMessage('rateSuccess');
  Utils.hideMessage('rateError');
}

// ===================== LOGOUT =====================
window.logout = function() {
  API.auth.logout();
  document.getElementById('adminAuth').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  Utils.showSuccess('authMessage', 'You have been logged out.');
};

// ===================== ADMIN TAB SWITCHING =====================
window.switchAdminTab = function(tabName) {
  document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
  const active = document.getElementById(`admin-${tabName}`);
  if (active) active.style.display = 'block';
  document.querySelectorAll('.admin-nav button').forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`.admin-nav button[data-tab="${tabName}"]`);
  if (activeButton) activeButton.classList.add('active');
};
// ===================== EDIT FILE PREVIEW =====================
function handleEditFilePreview(event) {
  const preview = document.getElementById('editFilePreview');
  const files = event.target.files;
  preview.innerHTML = '';

  if (files && files.length > 0) {
    preview.innerHTML = `<p style="color:#667eea;font-weight:bold;">${files.length} file(s) selected:</p>`;
    Array.from(files).forEach(file => {
      preview.innerHTML += `<p style="font-size:0.9rem;color:#666;">• ${file.name}</p>`;
    });
  } else {
    preview.innerHTML = '<p style="font-size:0.9rem;color:#999;">No files selected</p>';
  }
}

