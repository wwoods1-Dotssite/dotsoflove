// main.js - Updated with SPA-style navigation and hash routing

document.addEventListener('DOMContentLoaded', () => {
  loadDualGallery();
  loadAboutServices();
  loadRates();
  setupNavigation();
  handleHashChange();
});

// ============ GALLERY ============
async function loadDualGallery() {
  try {
    const petsResponse = await API.gallery.getAll();
    const pets = Array.isArray(petsResponse) ? petsResponse : petsResponse?.pets || [];

    const dorothyPets = pets.filter(p => p.is_dorothy_pet);
    const clientPets = pets.filter(p => !p.is_dorothy_pet);

    renderGallery('dorothy', dorothyPets);
    renderGallery('client', clientPets);
  } catch (error) {
    console.error('Error loading gallery:', error);
  }
}

function renderGallery(type, pets) {
  const containerId = type === 'dorothy' ? 'dorothyPetsGrid' : 'clientPetsGrid';
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(pets) || pets.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No pets to display.</p>';
    return;
  }

  container.innerHTML = pets.map(pet => `
    <div class="gallery-item">
      ${pet.images?.[0]?.url ? `<img src="${pet.images[0].url}" alt="${pet.pet_name}" />` : ''}
      <div>${pet.pet_name}</div>
    </div>
  `).join('');
}

// ============ RATES ============
async function loadAboutServices() {
  try {
    const ratesResponse = await API.rates.getAll();
    const rates = Array.isArray(ratesResponse) ? ratesResponse : ratesResponse?.rates || [];
    const aboutContainer = document.getElementById('aboutServices');
    if (!aboutContainer) return;

    if (!rates.length) {
      aboutContainer.innerHTML = '<p style="text-align:center;color:#666;">No service rates available.</p>';
      return;
    }

    aboutContainer.innerHTML = rates.map(r => 
      `<div>${r.service_type}: $${r.rate_per_unit}</div>`
    ).join('');
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

async function loadRates() {
  try {
    const ratesResponse = await API.rates.getAll();
    const rates = Array.isArray(ratesResponse) ? ratesResponse : ratesResponse?.rates || [];
    const ratesContainer = document.getElementById('ratesGrid');
    if (!ratesContainer) return;

    if (!rates.length) {
      ratesContainer.innerHTML = '<p style="text-align:center;color:#666;">No rates available.</p>';
      return;
    }

    ratesContainer.innerHTML = rates.map(r => 
      `<div>${r.service_type}: $${r.rate_per_unit}</div>`
    ).join('');
  } catch (err) {
    console.error('Error loading rates:', err);
  }
}

// ============ SIMPLE PAGE ROUTING ============
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

  // Update active link styling
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
  if (activeLink) activeLink.classList.add('active');
}
