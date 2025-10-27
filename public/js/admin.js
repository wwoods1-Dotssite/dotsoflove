// js/admin.js - Clean corrected version with proper switchAdminTab placement

document.addEventListener('DOMContentLoaded', function() {
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
        } else Utils.showError('authError', data.error || 'Login failed');
    })
    .catch(err => Utils.showError('authError', 'Network or server error'));
}

// ============ AUTO RESTORE ============
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

// ============ LOAD CONTACTS ============
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

// ============ ADMIN TAB SWITCHING ============
window.switchAdminTab = function(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
    const active = document.getElementById(`admin-${tabName}`);
    if (active) active.style.display = 'block';
    document.querySelectorAll('.admin-nav button').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.admin-nav button[data-tab="${tabName}"]`);
    if (activeButton) activeButton.classList.add('active');
};
