// main.js — Unified, polished version for Rates and My Services
// Uses CSS-based formatting, fade-in animations, and unified /api/rates endpoint

document.addEventListener('DOMContentLoaded', () => {
  loadUnifiedRates();
  setupNavigation();
  handleHashChange();
});

// =====================================
// Unified Rates + My Services Fetcher
// =====================================
async function loadUnifiedRates() {
  const endpoints = {
    rates: document.getElementById('ratesGrid'),
    about: document.getElementById('aboutServices')
  };

  try {
    const response = await fetch('/api/rates');
    const data = await response.json();

    // Clear previous loading states
    Object.values(endpoints).forEach(el => {
      if (el) el.innerHTML = '';
    });

    if (!Array.isArray(data) || data.length === 0 || data[0].is_empty) {
      Object.values(endpoints).forEach(el => {
        if (el) el.innerHTML = '<p class="no-data">No current services available.</p>';
      });
      return;
    }

    // Separate featured and standard
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

    // Combine all cards: featured first
    const allCards = [...featured.map(r => createCardHTML(r, true)), ...regular.map(r => createCardHTML(r, false))].join('');

    // Render consistently for both sections
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
// Navigation Logic (unchanged)
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

  // Hide all sections
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

  // Show target section if it exists
  const activePage = document.getElementById(hash);
  if (activePage) activePage.classList.add('active');

  // Update active nav styling
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Lazy reload rates when viewing relevant tabs
  if (['rates', 'about'].includes(hash)) loadUnifiedRates();
}
