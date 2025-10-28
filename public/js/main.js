// main.js - final version with null checks and improved error handling

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

function renderGallery(type, pets) {
  const containerId = type === 'dorothy' ? 'dorothyPetsGrid' : 'clientPetsGrid';
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Gallery container not found for type: ${type}`);
    return;
  }

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
    if (!aboutContainer) {
      console.warn('About services container not found.');
      return;
    }

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
    if (!ratesContainer) {
      console.warn('Rates container not found.');
      return;
    }

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
