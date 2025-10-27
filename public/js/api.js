// js/api.js - Corrected version ensuring JSON is returned from all requests

const API_BASE = 'https://dotsoflove-production.up.railway.app';

let adminToken = localStorage.getItem('adminToken');
let sessionTimeout;

function resetSessionTimeout() {
  clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    alert('Session expired for security. Please log in again.');
    logout();
  }, 30 * 60 * 1000);
}

document.addEventListener('click', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);

const API = {
  async request(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json(); // ✅ Always return JSON
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  },

  async authRequest(url, options = {}) {
    if (!adminToken) throw new Error('No admin token available');

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${adminToken}`
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type']; // Browser sets this automatically
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json(); // ✅ Always return JSON
  },

  gallery: {
    async getAll() {
      return await API.request(`/api/gallery?nocache=${Date.now()}`, { cache: 'no-store' });
    },
    async getById(id) {
      return await API.request(`/api/gallery/${id}?nocache=${Date.now()}`, { cache: 'no-store' });
    },
    async add(formData) {
      return await API.authRequest('/api/admin/gallery', {
        method: 'POST',
        body: formData
      });
    },
    async update(id, data) {
      return await API.authRequest(`/api/admin/gallery/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    async delete(id) {
      return await API.authRequest(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    }
  },

  rates: {
    async getAll() { return await API.request('/api/rates'); },
    async getAllAdmin() { return await API.authRequest('/api/admin/rates'); },
    async getById(id) { return await API.authRequest(`/api/admin/rates/${id}`); },
    async add(data) {
      return await API.authRequest('/api/admin/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    async update(id, data) {
      return await API.authRequest(`/api/admin/rates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    async delete(id) { return await API.authRequest(`/api/admin/rates/${id}`, { method: 'DELETE' }); },
    async setFeatured(id) { return await API.authRequest(`/api/admin/rates/${id}/featured`, { method: 'PUT' }); }
  },

  contact: {
    async submit(data) {
      return await API.request('/api/contact', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async getAllAdmin() {
      return await API.authRequest('/api/admin/contacts');
    }
  },

  auth: {
    async login(username, password) {
      const response = await fetch(`${API_BASE}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        adminToken = data.token;
        localStorage.setItem('adminToken', adminToken);
        return data;
      } else throw new Error(data.error || 'Authentication failed');
    },
    async validate() {
      if (!adminToken) return false;
      try {
        const response = await API.authRequest('/api/admin/validate');
        return response && response.success;
      } catch {
        return false;
      }
    },
    logout() {
      localStorage.removeItem('adminToken');
      adminToken = null;
      clearTimeout(sessionTimeout);
    }
  }
};

const Utils = {
  showLoading(id) { const e = document.getElementById(id); if (e) e.style.display = 'block'; },
  hideLoading(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; },
  showSuccess(id, msg) { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 5000); } },
  showError(id, msg) { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block'; } },
  hideMessage(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; },
  formatDate(d) { return new Date(d).toLocaleDateString(); },
  formatTime(d) { return new Date(d).toLocaleTimeString(); },
  isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); },
  isValidPhone(p) { return /^[\d\s\-\(\)\+]+$/.test(p); }
};

window.API = API;
window.Utils = Utils;
