// js/api.js - API helper functions and configuration

// API Configuration
const API_BASE = 'https://dotsoflove-production.up.railway.app';

// Global variables
let adminToken = localStorage.getItem('adminToken');

// Session timeout management
let sessionTimeout;

function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    // Auto logout after 30 minutes of inactivity
    sessionTimeout = setTimeout(() => {
        alert('Session expired for security. Please log in again.');
        logout();
    }, 30 * 60 * 1000); // 30 minutes
}

// Reset timeout on any user activity
document.addEventListener('click', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);

// API Helper Functions
const API = {
    // Generic fetch with error handling
    async request(url, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${url}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },

    // Authenticated request helper
    async authRequest(url, options = {}) {
        if (!adminToken) {
            throw new Error('No admin token available');
        }

        return fetch(`${API_BASE}${url}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${adminToken}`
            }
        });
    },

    // Gallery endpoints
    gallery: {
        async getAll() {
            return API.request('/api/gallery');
        },

        async getById(id) {
            return API.request(`/api/gallery/${id}`);
        },

        async add(formData) {
            const response = await API.authRequest('/api/admin/gallery', {
                method: 'POST',
                body: formData,
                headers: {} // Don't set Content-Type for FormData
            });
            return response.json();
        },

        async update(id, data) {
            const response = await API.authRequest(`/api/admin/gallery/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async delete(id) {
            const response = await API.authRequest(`/api/admin/gallery/${id}`, {
                method: 'DELETE'
            });
            return response.json();
        }
    },

    // Rates endpoints
    rates: {
        async getAll() {
            return API.request('/api/rates');
        },

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
            const response = await API.authRequest(`/api/admin/rates/${id}`, {
                method: 'DELETE'
            });
            return response.json();
        }
    },

    // Contact endpoints
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

    // Admin authentication
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
            } else {
                throw new Error(data.error || 'Authentication failed');
            }
        },

        async validate() {
            if (!adminToken) {
                return false;
            }

            try {
                const response = await API.authRequest('/api/admin/validate');
                return response.ok;
            } catch (error) {
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

// Utility functions
const Utils = {
    // Show loading state
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    },

    // Hide loading state
    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    // Show success message
    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    },

    // Show error message
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    },

    // Hide message
    hideMessage(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    // Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    },

    // Format time
    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString();
    },

    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate phone
    isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        return phoneRegex.test(phone);
    }
};

// Export for use in other files
window.API = API;
window.Utils = Utils;