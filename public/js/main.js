// main.js — Safe, encapsulated version to prevent duplicate loads
(() => {
  // Prevent redeclaration if this script runs twice
  if (window.__mainLoaded) return;
  window.__mainLoaded = true;

  document.addEventListener('DOMContentLoaded', () => {
    loadUnifiedRates();
    setupNavigation();
    handleHashChange();
  });

  // =====================================
  // Environment Config
  // =====================================
  const API_BASE = (window?.env?.VITE_API_BASE || '').replace(/\/$/, '');
  console.log('[API_BASE]', API_BASE || '(using relative /api path)');

  function apiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  // =====================================
  // Unified Rates + My Services Fetcher
  // =====================================
  async function loadUnifiedRates() {
    const endpoints = {
      rates: document.getElementById('ratesGrid'),
      about: document.getElementById('aboutServices')
    };

    Object.values(endpoints).forEach(el => {
      if (el) el.innerHTML = '<p class="loading">Loading current services...</p>';
    });

    try {
      const response = await fetch(apiUrl('/api/rates'), {
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Invalid JSON (got HTML): ${text.slice(0, 200)}`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0 || data[0].is_empty) {
        Object.values(endpoints).forEach(el => {
          if (el) el.innerHTML = '<p class="no-data">No current services available.</p>';
        });
        return;
      }

      const featured = data.filter(r => r.is_featured);
      const regular = data.filter(r => !r.is_featured);

      const createCardHTML = (rate, isFeatured = false) => `
        <div class="rate-card ${isFeatured ? 'featured-rate' : ''} fade-in">
          <div class="rate-header">${rate.service_type || ''}</div>
          <div class="rate-body">
            <div class="rate-description">${rate.description || ''}</div>
            <div class="rate-value">$${rate.rate_per_unit || '0'} <span class="unit">${rate.unit_type || ''}</span></div>
          </div>
        </div>
      `;

      const allCards = [
        ...featured.map(r => createCardHTML(r, true)),
        ...regular.map(r => createCardHTML(r, false))
      ].join('');

      Object.entries(endpoints).forEach(([key, container]) => {
        if (container) {
          container.classList.add('rates-grid');
          container.innerHTML = allCards;
        }
      });

    } catch (err) {
      console.error('Error loading rates:', err);
      Object.values(endpoints).forEach(el => {
        if (el) el.innerHTML = '<p class="error-msg">Error loading services. Please try again later.</p>';
      });
    }
  }

  // =====================================
  // Navigation Logic
  // =====================================
  function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.getAttribute('href').replace('#', '');
        window.location.hash = target;
        handleHashChange();
      });
    });

    window.addEventListener('hashchange', handleHashChange);
  }

  function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'about';

    document.querySelectorAll('.page').forEach(page =>
      page.classList.remove('active')
    );

    const activePage = document.getElementById(hash);
    if (activePage) activePage.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link =>
      link.classList.remove('active')
    );
    const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (['rates', 'about'].includes(hash)) loadUnifiedRates();
  }
})();
