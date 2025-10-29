// ===============================
// main.js – Clean Unified SPA Logic
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();
  setupDateValidation();

  const hash = window.location.hash || "";
  const isAdmin = hash === "#admin" || window.location.pathname === "/admin";

  if (isAdmin) {
    console.log("🔐 Admin route detected");
    if (typeof checkAdminAuth === "function") {
      showOnlyPage("admin");
      checkAdminAuth();
    }
  } else {
    loadInitialContent(); // default: public pages
  }
});

// ---------- SPA NAVIGATION ----------
function initializeNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // highlight active nav
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const targetPage = link.getAttribute("href").substring(1);
      showOnlyPage(targetPage);
      loadPageContent(targetPage);

      // update hash
      window.location.hash = `#${targetPage}`;
    });
  });
}

function showOnlyPage(targetPage) {
  document.querySelectorAll(".page").forEach((p) => (p.style.display = "none"));
  const page = document.getElementById(targetPage);
  if (page) page.style.display = "block";
}

// ---------- INITIAL LOAD ----------
function loadInitialContent() {
  showOnlyPage("about");
  loadDualGallery();
  loadRates();
  loadAboutServices();
}

// ---------- PAGE CONTENT LOADER ----------
function loadPageContent(page) {
  switch (page) {
    case "about":
      loadAboutServices();
      break;
    case "gallery":
      loadDualGallery();
      break;
    case "rates":
      loadRates();
      break;
    case "admin":
      if (typeof checkAdminAuth === "function") checkAdminAuth();
      break;
    default:
      break;
  }
}

// ---------- ABOUT ----------
async function loadAboutServices() {
  try {
    Utils.showLoading("aboutServicesLoading");
    const rates = await API.rates.getAll();
    const grid = document.getElementById("aboutServices");
    if (!Array.isArray(rates) || rates.length === 0) {
      grid.innerHTML = createDefaultServices();
      return;
    }
    const sorted = [...rates].sort((a, b) => (a.is_featured ? -1 : 1));
    grid.innerHTML = sorted.map((r) => createServiceItem(r)).join("");
  } catch (err) {
    Utils.showError("aboutServicesLoading", "Error loading services");
  } finally {
    Utils.hideLoading("aboutServicesLoading");
  }
}

function createServiceItem(rate) {
  return `
    <div class="service-item ${rate.is_featured ? "featured-service" : ""}">
      <h3>${rate.service_type}</h3>
      <p><strong>$${parseFloat(rate.rate_per_unit).toFixed(
        2
      )}</strong> ${rate.unit_type.replace("_", " ")}</p>
      <p>${rate.description || ""}</p>
    </div>
  `;
}

function createDefaultServices() {
  return `
    <div class="service-item featured-service">
      <h3>🏠 Pet Sitting (Overnight)</h3>
      <p><strong>$75.00</strong> per night</p>
      <p>Overnight care in your home with 24/7 attention</p>
    </div>
    <div class="service-item">
      <h3>🐕 Dog Walking</h3>
      <p><strong>$25.00</strong> per walk</p>
      <p>30-45 minute walks to keep your dog happy and healthy</p>
    </div>`;
}

// ---------- GALLERY ----------
async function loadDualGallery() {
  try {
    Utils.showLoading("dorothyPetsLoading");
    Utils.showLoading("clientPetsLoading");
    let pets = await API.gallery.getAll();
    if (!Array.isArray(pets)) pets = pets.data || [];
    const dorothy = pets.filter((p) => p.is_dorothy_pet);
    const clients = pets.filter((p) => !p.is_dorothy_pet);
    renderGallery("dorothy", dorothy);
    renderGallery("client", clients);
  } catch (err) {
    Utils.showError("dorothyPetsLoading", "Error loading gallery");
    Utils.showError("clientPetsLoading", "Error loading gallery");
  } finally {
    Utils.hideLoading("dorothyPetsLoading");
    Utils.hideLoading("clientPetsLoading");
  }
}

function renderGallery(type, pets) {
  const grid = document.getElementById(
    type === "dorothy" ? "dorothyPetsGrid" : "clientPetsGrid"
  );
  if (!grid) return;
  if (pets.length === 0) {
    grid.innerHTML = "<p>No pets found.</p>";
    return;
  }
  grid.innerHTML = pets.map((p) => createGalleryItem(p)).join("");
}

function createGalleryItem(pet) {
  const images = pet.images || [];
  const img = images[0]?.image_url || "";
  return `
    <div class="gallery-item" onclick="openModal(${JSON.stringify(pet).replace(
      /"/g,
      "&quot;"
    )})">
      <div class="gallery-image">
        ${img ? `<img src="${img}" alt="${pet.pet_name}">` : "🐾"}
      </div>
      <div class="gallery-content">
        <div class="pet-name">${pet.pet_name}</div>
      </div>
    </div>`;
}

// ---------- RATES ----------
async function loadRates() {
  try {
    Utils.showLoading("ratesLoading");
    const rates = await API.rates.getAll();
    const grid = document.getElementById("ratesGrid");
    grid.innerHTML = rates.map((r) => createRateCard(r)).join("");
  } catch (err) {
    Utils.showError("ratesLoading", "Error loading rates");
  } finally {
    Utils.hideLoading("ratesLoading");
  }
}

function createRateCard(rate) {
  return `
    <div class="rate-card ${rate.is_featured ? "featured-rate" : ""}">
      <div class="rate-title">${rate.service_type}</div>
      <div class="rate-price">$${parseFloat(rate.rate_per_unit).toFixed(2)}</div>
      <div class="rate-unit">${rate.unit_type.replace("_", " ")}</div>
      ${rate.description ? `<div>${rate.description}</div>` : ""}
    </div>`;
}
