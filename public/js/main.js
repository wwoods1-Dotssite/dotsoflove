// main.js - corrected version with response normalization for gallery and rates

document.addEventListener('DOMContentLoaded', () => {
  loadDualGallery();
  loadAboutServices();
  loadRates();
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

// ============ RATES ============
async function loadAboutServices() {
  try {
    const ratesResponse = await API.rates.getAll();
    const rates = Array.isArray(ratesResponse) ? ratesResponse : ratesResponse?.rates || [];
    const aboutContainer = document.getElementById('aboutServices');
    aboutContainer.innerHTML = rates.map(r => `<div>${r.service_type}: $${r.rate_per_unit}</div>`).join('');
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

async function loadRates() {
  try {
    const ratesResponse = await API.rates.getAll();
    const rates = Array.isArray(ratesResponse) ? ratesResponse : ratesResponse?.rates || [];
    const ratesContainer = document.getElementById('ratesGrid');
    ratesContainer.innerHTML = rates.map(r => `<div>${r.service_type}: $${r.rate_per_unit}</div>`).join('');
  } catch (err) {
    console.error('Error loading rates:', err);
  }
}

function renderGallery(type, pets) {
  const containerId = type === 'dorothy' ? 'dorothyPetsGrid' : 'clientPetsGrid';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = pets.map(pet => `
    <div class="gallery-item">
      ${pet.images?.[0]?.url ? `<img src="${pet.images[0].url}" alt="${pet.pet_name}" />` : ''}
      <div>${pet.pet_name}</div>
    </div>
  `).join('');
}
