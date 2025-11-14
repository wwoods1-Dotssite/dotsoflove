// public/js/admin.js
// Admin dashboard logic for Dot's of Love Pet Sitting

// ------------------------------
// Small helpers
// ------------------------------
function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function show(el) {
  if (el) el.classList.remove("hidden");
}

function hide(el) {
  if (el) el.classList.add("hidden");
}

// Expose modal helpers globally (for existing onclick="closeModal('...')" etc.)
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("modal-open");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("modal-open");
}
window.openModal = openModal;
window.closeModal = closeModal;

// ------------------------------
// State
// ------------------------------
let adminToken = null;
let currentPetId = null;
let currentRateId = null;

// ------------------------------
// DOM refs
// ------------------------------
const adminLoginSection = $("#adminLogin");
const adminLoginForm = $("#adminLoginForm");
const adminUsernameInput = $("#adminUsername");
const adminPasswordInput = $("#adminPassword");
const adminLoginStatus = $("#adminLoginStatus");

const adminSection = $("#admin");
const adminLogoutBtn = $("#adminLogoutBtn");

const adminTabButtons = $all(".admin-tab-btn");
const petsPanel = $("#adminPetsSection");
const ratesPanel = $("#adminRatesSection");
const contactsPanel = $("#adminContactsSection");
const reviewsPanel = $("#adminReviewsSection");

// Pets
const petsList = $("#adminPetsList");
const addPetBtn = $("#addPetBtn");
const petModal = $("#petModal");
const petForm = $("#addPetForm");
const savePetBtn = $("#savePetBtn");

// Rates
const ratesList = $("#adminRatesList");
const addRateBtn = $("#addRateBtn");
const rateModal = $("#rateModal");
const rateForm = $("#addRateForm");
const saveRateBtn = $("#saveRateBtn");

// Contacts
const contactsList = $("#adminContactsList");

// Reviews
const reviewsList = $("#adminReviewsList");

// ------------------------------
// API helper
// ------------------------------
async function apiRequest(url, options = {}) {
  const opts = {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body || null
  };

  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }

  if (adminToken) {
    opts.headers["Authorization"] = `Bearer ${adminToken}`;
  }

  const res = await fetch(url, opts);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// ------------------------------
// Auth
// ------------------------------
async function handleAdminLogin(event) {
  event.preventDefault();
  if (!adminUsernameInput || !adminPasswordInput) return;

  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value.trim();

  if (!username || !password) {
    if (adminLoginStatus) {
      adminLoginStatus.textContent = "Please enter username and password.";
      adminLoginStatus.classList.add("error");
    }
    return;
  }

  try {
    if (adminLoginStatus) {
      adminLoginStatus.textContent = "Signing in…";
      adminLoginStatus.classList.remove("error", "success");
    }

    const data = await apiRequest("/api/admin/auth", {
      method: "POST",
      body: { username, password }
    });

    if (!data.success) {
      if (adminLoginStatus) {
        adminLoginStatus.textContent = data.message || "Invalid credentials.";
        adminLoginStatus.classList.add("error");
      }
      return;
    }

    adminToken = data.token || "admin-token";
    if (adminLoginStatus) {
      adminLoginStatus.textContent = "Logged in successfully.";
      adminLoginStatus.classList.remove("error");
      adminLoginStatus.classList.add("success");
    }

    show(adminSection);
    hide(adminLoginSection);

    switchAdminTab("pets");
    // Load everything once on login
    loadPets();
    loadRates();
    loadContacts();
    loadAdminReviews();
  } catch (err) {
    console.error("Admin login failed:", err);
    if (adminLoginStatus) {
      adminLoginStatus.textContent =
        "Login failed. Please verify credentials and try again.";
      adminLoginStatus.classList.add("error");
    }
  }
}

function handleAdminLogout() {
  adminToken = null;
  show(adminLoginSection);
  hide(adminSection);
}

// ------------------------------
// Tab switching
// ------------------------------
function switchAdminTab(tabName) {
  const map = {
    pets: petsPanel,
    rates: ratesPanel,
    contacts: contactsPanel,
    reviews: reviewsPanel
  };

  adminTabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
  });

  Object.entries(map).forEach(([key, panel]) => {
    if (!panel) return;
    if (key === tabName) show(panel);
    else hide(panel);
  });

  if (tabName === "pets") loadPets();
  if (tabName === "rates") loadRates();
  if (tabName === "contacts") loadContacts();
  if (tabName === "reviews") loadAdminReviews();
}

// ------------------------------
// Pets
// ------------------------------
async function loadPets() {
  if (!petsList) return;
  try {
    const pets = await apiRequest("/api/pets");
    renderPets(pets);
  } catch (err) {
    console.error("Error loading pets:", err);
    petsList.innerHTML =
      '<p class="admin-empty">Error loading pets. Please try again.</p>';
  }
}

function renderPets(pets) {
  if (!petsList) return;

  if (!Array.isArray(pets) || pets.length === 0) {
    petsList.innerHTML =
      '<p class="admin-empty">No pets yet. Use "Add Pet" to create one.</p>';
    return;
  }

  const html = pets
    .map((pet) => {
      const images = Array.isArray(pet.images) ? pet.images : [];
      const badge = pet.is_dorothy_pet
        ? '<span class="badge badge-dorothy">Dorothy\'s Pet</span>'
        : "";
      const thumbs =
        images.length > 0
          ? images
              .map(
                (img) => `
          <div class="admin-thumb" draggable="true" data-image-id="${img.id}" data-pet-id="${pet.id}">
            <img src="${img.image_url}" alt="${pet.pet_name}" />
            <button class="thumb-delete-btn" data-image-id="${img.id}" title="Remove image">🗑</button>
          </div>`
              )
              .join("")
          : '<div class="admin-thumb admin-thumb-empty">No images yet</div>';

      return `
      <article class="admin-card admin-pet-card" data-pet-id="${pet.id}">
        <header class="admin-card-header">
          <div>
            <h3>${pet.pet_name || "Untitled Pet"}</h3>
            ${badge}
          </div>
          <div class="admin-card-actions">
            <button class="btn-secondary btn-xs pet-edit-btn" data-id="${pet.id}">Edit</button>
            <button class="btn-danger btn-xs pet-delete-btn" data-id="${pet.id}">Delete</button>
          </div>
        </header>
        <p>${pet.story_description || ""}</p>
        <div class="admin-pet-thumbs" data-pet-id="${pet.id}">
          ${thumbs}
        </div>
        <p class="admin-card-meta">Drag to reorder images</p>
      </article>
    `;
    })
    .join("");

  petsList.innerHTML = html;

  wirePetEvents();
}

function wirePetEvents() {
  // Edit
  $all(".pet-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => openPetEditor(btn.dataset.id));
  });

  // Delete pet
  $all(".pet-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Delete this pet and all its images?")) return;
      try {
        await apiRequest(`/api/pets/${id}`, { method: "DELETE" });
        loadPets();
      } catch (err) {
        console.error("Error deleting pet:", err);
        alert("Could not delete pet.");
      }
    });
  });

  // Delete single image
  $all(".thumb-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const imgId = btn.dataset.imageId;
      if (!confirm("Remove this photo?")) return;
      try {
        await apiRequest(`/api/pets/images/${imgId}`, { method: "DELETE" });
        loadPets();
      } catch (err) {
        console.error("Error deleting image:", err);
        alert("Could not delete image.");
      }
    });
  });

  // Drag & drop reorder
  setupImageReorder();
}

function setupImageReorder() {
  const containers = $all(".admin-pet-thumbs[data-pet-id]");
  containers.forEach((container) => {
    const petId = container.dataset.petId;

    container.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".admin-thumb");
      if (!item || !item.dataset.imageId) return;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.dataset.imageId);
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = container.querySelector(".dragging");
      if (!dragging) return;
      const after = getThumbAfter(container, e.clientX);
      if (!after) container.appendChild(dragging);
      else container.insertBefore(dragging, after);
    });

    container.addEventListener("drop", async (e) => {
      e.preventDefault();
      const dragging = container.querySelector(".dragging");
      if (dragging) dragging.classList.remove("dragging");

      const order = Array.from(
        container.querySelectorAll(".admin-thumb[data-image-id]")
      ).map((el) => el.dataset.imageId);

      try {
        await apiRequest(`/api/pets/${petId}/images/reorder`, {
          method: "PUT",
          body: { order }
        });
        loadPets();
      } catch (err) {
        console.error("Error saving image order:", err);
      }
    });

    container.addEventListener("dragend", () => {
      const dragging = container.querySelector(".dragging");
      if (dragging) dragging.classList.remove("dragging");
    });
  });
}

function getThumbAfter(container, x) {
  const items = [
    ...container.querySelectorAll(".admin-thumb[data-image-id]:not(.dragging)")
  ];
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

// Open modal for new pet
function openNewPetModal() {
  currentPetId = null;
  if (petForm) petForm.reset();
  const chk = $("#isDorothyPet");
  if (chk) chk.checked = false;
  openModal("petModal");
}

// Open modal for existing pet
async function openPetEditor(id) {
  try {
    const pet = await apiRequest(`/api/pets/${id}`);
    currentPetId = pet.id;

    if (petForm) {
      petForm.reset();
      $("#petName").value = pet.pet_name || "";
      $("#petDescription").value = pet.story_description || "";
      const chk = $("#isDorothyPet");
      if (chk) chk.checked = !!pet.is_dorothy_pet;
    }

    openModal("petModal");
  } catch (err) {
    console.error("Error loading pet:", err);
    alert("Unable to load pet details.");
  }
}

// Save pet (new or existing)
async function handleSavePet(e) {
  if (e) e.preventDefault();
  if (!petForm) return;

  const nameInput = $("#petName");
  if (!nameInput || !nameInput.value.trim()) {
    alert("Pet name is required.");
    return;
  }

  const formData = new FormData(petForm);
  const chk = $("#isDorothyPet");
  formData.set("is_dorothy_pet", chk && chk.checked ? "true" : "false");
  formData.set("pet_name", nameInput.value.trim());
  formData.set(
    "story_description",
    ($("#petDescription").value || "").trim()
  );

  try {
    if (currentPetId) {
      await apiRequest(`/api/pets/${currentPetId}`, {
        method: "PUT",
        body: formData
      });
    } else {
      await apiRequest("/api/pets", {
        method: "POST",
        body: formData
      });
    }
    closeModal("petModal");
    loadPets();
  } catch (err) {
    console.error("Error saving pet:", err);
    alert("Could not save pet.");
  }
}

// ------------------------------
// Rates
// ------------------------------
async function loadRates() {
  if (!ratesList) return;
  try {
    const rates = await apiRequest("/api/rates");
    renderRates(rates);
  } catch (err) {
    console.error("Error loading rates:", err);
    ratesList.innerHTML =
      '<p class="admin-empty">Error loading rates. Please try again.</p>';
  }
}

function renderRates(rates) {
  if (!ratesList) return;

  if (!Array.isArray(rates) || rates.length === 0) {
    ratesList.innerHTML =
      '<p class="admin-empty">No rates yet. Use "Add Rate" to create one.</p>';
    return;
  }

  const html = rates
    .map((r) => {
      const featured = r.is_featured
        ? '<span class="badge badge-featured">Featured</span>'
        : "";
      return `
      <article class="admin-card" data-rate-id="${r.id}">
        <header class="admin-card-header">
          <div>
            <h3>${r.service_type}</h3>
            ${featured}
          </div>
          <div class="admin-card-actions">
            <button class="btn-secondary btn-xs rate-edit-btn" data-id="${
              r.id
            }">Edit</button>
            <button class="btn-danger btn-xs rate-delete-btn" data-id="${
              r.id
            }">Delete</button>
          </div>
        </header>
        <p class="admin-rate-amount">$${Number(r.rate_per_unit).toFixed(
          2
        )} <span class="admin-rate-unit">${r.unit_type}</span></p>
        <p>${r.description || ""}</p>
      </article>
    `;
    })
    .join("");

  ratesList.innerHTML = html;

  $all(".rate-edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => openRateEditor(btn.dataset.id))
  );
  $all(".rate-delete-btn").forEach((btn) =>
    btn.addEventListener("click", () => deleteRate(btn.dataset.id))
  );
}

async function openRateEditor(id) {
  try {
    const rate = await apiRequest(`/api/rates/${id}`);
    currentRateId = rate.id;

    if (rateForm) {
      rateForm.reset();
      $("#serviceType").value = rate.service_type || "";
      $("#ratePerUnit").value = rate.rate_per_unit || "";
      $("#unitType").value = rate.unit_type || "per_visit";
      $("#rateDescription").value = rate.description || "";
      const chk = $("#isFeatured");
      if (chk) chk.checked = !!rate.is_featured;
    }

    openModal("rateModal");
  } catch (err) {
    console.error("Error loading rate:", err);
    alert("Unable to load rate.");
  }
}

function openNewRateModal() {
  currentRateId = null;
  if (rateForm) {
    rateForm.reset();
    $("#unitType").value = "per_visit";
    const chk = $("#isFeatured");
    if (chk) chk.checked = false;
  }
  openModal("rateModal");
}

async function handleSaveRate(e) {
  if (e) e.preventDefault();
  if (!rateForm) return;

  const serviceType = $("#serviceType").value.trim();
  const rateVal = $("#ratePerUnit").value;
  const unitType = $("#unitType").value;
  const description = ($("#rateDescription").value || "").trim();
  const isFeatured = $("#isFeatured").checked;

  if (!serviceType || !rateVal) {
    alert("Service type and rate are required.");
    return;
  }

  const payload = {
    service_type: serviceType,
    rate_per_unit: rateVal,
    unit_type: unitType,
    description,
    is_featured: isFeatured
  };

  try {
    if (currentRateId) {
      await apiRequest(`/api/rates/${currentRateId}`, {
        method: "PUT",
        body: payload
      });
    } else {
      await apiRequest("/api/rates", {
        method: "POST",
        body: payload
      });
    }
    closeModal("rateModal");
    loadRates();
  } catch (err) {
    console.error("Error saving rate:", err);
    alert("Could not save rate.");
  }
}

async function deleteRate(id) {
  if (!confirm("Delete this rate?")) return;
  try {
    await apiRequest(`/api/rates/${id}`, { method: "DELETE" });
    loadRates();
  } catch (err) {
    console.error("Error deleting rate:", err);
    alert("Could not delete rate.");
  }
}

// ------------------------------
// Contacts
// ------------------------------
async function loadContacts() {
  if (!contactsList) return;
  try {
    const contacts = await apiRequest("/api/contacts");
    renderContacts(contacts);
  } catch (err) {
    console.error("Error loading contacts:", err);
    contactsList.innerHTML =
      '<p class="admin-empty">Error loading contacts. Please try again.</p>';
  }
}

function renderContacts(contacts) {
  if (!contactsList) return;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    contactsList.innerHTML =
      '<p class="admin-empty">No pending contact requests.</p>';
    return;
  }

  const html = contacts
    .map((c) => {
      const date =
        c.created_at &&
        new Date(c.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      return `
      <article class="admin-card" data-contact-id="${c.id}">
        <header class="admin-card-header">
          <div>
            <h3>${c.name}</h3>
            <p class="admin-card-sub">${c.email}</p>
          </div>
          <div class="admin-card-actions">
            <button class="btn-primary btn-xs contact-mark-btn" data-id="${
              c.id
            }">Mark Contacted</button>
          </div>
        </header>
        <p><strong>Phone:</strong> ${c.phone || "N/A"}</p>
        <p><strong>Best Time:</strong> ${c.best_time || "N/A"}</p>
        <p><strong>Service:</strong> ${c.service || "N/A"}</p>
        <p><strong>Dates:</strong> ${c.dates || ""}</p>
        <p><strong>Pet Info:</strong> ${c.pet_info || ""}</p>
        <p><strong>Message:</strong> ${c.message || ""}</p>
        <p class="admin-card-meta">Submitted on ${date || "Unknown date"}</p>
      </article>
    `;
    })
    .join("");

  contactsList.innerHTML = html;

  $all(".contact-mark-btn").forEach((btn) =>
    btn.addEventListener("click", () => markContacted(btn.dataset.id))
  );
}

async function markContacted(id) {
  if (!confirm("Mark this request as contacted?")) return;
  try {
    await apiRequest(`/api/contacts/${id}/contacted`, { method: "PUT" });
    loadContacts();
  } catch (err) {
    console.error("Error marking contacted:", err);
    alert("Could not update contact.");
  }
}

// ------------------------------
// Reviews (Admin)
// ------------------------------
async function loadAdminReviews() {
  if (!reviewsList) return;
  try {
    const reviews = await apiRequest("/api/admin/reviews");
    renderAdminReviews(reviews);
  } catch (err) {
    console.error("Error loading admin reviews:", err);
    reviewsList.innerHTML =
      '<p class="admin-empty">Error loading reviews. Please try again.</p>';
  }
}

function renderAdminReviews(reviews) {
  if (!reviewsList) return;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviewsList.innerHTML =
      '<p class="admin-empty">No pending reviews right now.</p>';
    return;
  }

  const html = reviews
    .map((r) => {
      const date =
        r.created_at &&
        new Date(r.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      const stars = "⭐".repeat(Number(r.rating || 5));
      return `
      <article class="admin-card admin-review-card" data-review-id="${r.id}">
        <header class="admin-card-header">
          <div>
            <h3>${r.customer_name || r.reviewer_name || "Anonymous"}</h3>
            <p class="admin-card-sub">${stars}</p>
          </div>
        </header>
        <p>${r.review_text || ""}</p>
        <p class="admin-card-meta">Submitted on ${date || "Unknown date"}</p>
        <div class="admin-card-actions">
          <button class="btn-primary btn-xs review-approve-btn" data-id="${
            r.id
          }">Approve</button>
          <button class="btn-danger btn-xs review-delete-btn" data-id="${
            r.id
          }">Delete</button>
        </div>
      </article>
    `;
    })
    .join("");

  reviewsList.innerHTML = html;

  $all(".review-approve-btn").forEach((btn) =>
    btn.addEventListener("click", () => approveReview(btn.dataset.id))
  );
  $all(".review-delete-btn").forEach((btn) =>
    btn.addEventListener("click", () => deleteReview(btn.dataset.id))
  );
}

async function approveReview(id) {
  if (!confirm("Approve this review so it shows on the public site?")) return;
  try {
    await apiRequest(`/api/admin/reviews/${id}/approve`, { method: "PUT" });
    loadAdminReviews();
  } catch (err) {
    console.error("Error approving review:", err);
    alert("Could not approve review.");
  }
}

async function deleteReview(id) {
  if (!confirm("Delete this review?")) return;
  try {
    await apiRequest(`/api/admin/reviews/${id}`, { method: "DELETE" });
    loadAdminReviews();
  } catch (err) {
    console.error("Error deleting review:", err);
    alert("Could not delete review.");
  }
}

// ------------------------------
// Init
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛠 Admin JS loaded");

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", handleAdminLogin);
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", handleAdminLogout);
  }

  adminTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      switchAdminTab(tab);
    });
  });

  if (addPetBtn) addPetBtn.addEventListener("click", openNewPetModal);
  if (savePetBtn)
    savePetBtn.addEventListener("click", (e) => handleSavePet(e));

  if (addRateBtn) addRateBtn.addEventListener("click", openNewRateModal);
  if (saveRateBtn)
    saveRateBtn.addEventListener("click", (e) => handleSaveRate(e));
});
