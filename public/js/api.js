// js/api.js - Updated with FormData fix, no-cache fetches, and improved auth handling

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

            return await response.json();
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

        // ✅ Fix: Allow FormData uploads
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        return fetch(`${API_BASE}${url}`, {
            ...options,
            headers,
            cache: 'no-store'
        });
    },

    gallery: {
        async getAll() {
            return API.request(`/api/gallery?nocache=${Date.now()}`, { cache: 'no-store' });
        },

        async getById(id) {
            return API.request(`/api/gallery/${id}?nocache=${Date.now()}`, { cache: 'no-store' });
        },

        async add(formData) {
            const response = await API.authRequest('/api/admin/gallery', {
                method: 'POST',
                body: formData,
                headers: {}
            });
            return response.json();
        },

        async update(id, data) {
            console.log(`📡 API: Updating pet ${id} with data:`, data);
            const response = await API.authRequest(`/api/admin/gallery/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            console.log('📡 API: Update response:', result);
            return result;
        },

        async delete(id) {
            const response = await API.authRequest(`/api/admin/gallery/${id}`, { method: 'DELETE' });
            return response.json();
        }
    },

    rates: {
        async getAll() { return API.request('/api/rates'); },
        async getAllAdmin() {
            const response = await API.authRequest('/api/admin/rates');
            return response.json();
        },
        async getById(id) {
            const response = await API.authRequest(`/api/admin/rates/${id}`);
            return response.json();
        },
        async add(data) {
            const response = await API.authRequest('/api/admin/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        async update(id, data) {
            const response = await API.authRequest(`/api/admin/rates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        async delete(id) {
            const response = await API.authRequest(`/api/admin/rates/${id}`, { method: 'DELETE' });
            return response.json();
        },
        async setFeatured(id) {
            const response = await API.authRequest(`/api/admin/rates/${id}/featured`, { method: 'PUT' });
            return response.json();
        }
    },

    contact: {
        async submit(data) {
            return API.request('/api/contact', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        async getAllAdmin() {
            const response = await API.authRequest('/api/admin/contacts');
            return response.json();
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
                return response.ok;
            } catch { return false; }
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
