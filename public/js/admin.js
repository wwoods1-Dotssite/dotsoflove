// admin.js
// Dot's of Love Pet Sitting - Admin Dashboard
// CommonJS-style browser script (no bundler needed)

// -----------------------------
// Small helpers
// -----------------------------
function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function toast(message, type = "info") {
  // Minimal console-based "toast"
  const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
  console.log(`${prefix} ${message}`);
}

// Add auth header if token exists
function authHeaders(extra = {}) {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// For multipart form uploads
function authHeadersFormData() {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// -----------------------------
// API helpers
// -----------------------------
async function apiGet(path) {
  const res = await fetch(path, {
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body, isFormData = false) {
  const opts = {
    method: "POST",
    credentials: "include",
  };

  if (isFormData) {
    opts.body = body;
    opts.headers = authHeadersFormData();
  } else {
    opts.body = JSON.stringify(body || {});
    opts.headers = authHeaders();
  }

  const res = await fetch(path, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
}

async function apiPut(path, body, isFormData = false) {
  const opts = {
    method: "PUT",
    credentials: "include",
  };

  if (isFormData) {
    opts.body = body;
    opts.headers = authHeadersFormData();
  } else {
    opts.body = JSON.stringify(body || {});
    opts.headers = authHeaders();
  }

  const res = await fetch(path, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${path} failed: ${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
}

async function apiDelete(path) {
  const res = await fetch(path, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DELETE ${path} failed: ${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
}

// -----------------------------
// Admin state
// -----------------------------
const AdminState = {
  currentTab: "pets",
  pets: [],
  rates: [],
  contacts: [],
  reviews: [],
  editingPetId: null,
  editingRateId: null,
  editingReviewId: null,
};

// -----------------------------
// DOM references (lazy)
// -----------------------------
const Dom = {
  get loginSection() {
    return $("#adminLoginSection");
  },
  get dashboard() {
    return $("#adminDashboard");
  },
  get loginForm() {
    return $("#adminLoginForm");
  },
  get logoutBtn() {
    return $("#adminLogoutBtn");
  },

  // Tabs
  get tabs() {
    return $all(".admin-tab");
  },
  get sections() {
    return $all(".admin-section-panel");
  },

  // Lists
  get petsList() {
    return $("#adminPetsList");
  },
  get ratesList() {
    return $("#adminRatesList");
  },
  get contactsList() {
    return $("#adminContactsList");
  },
  get reviewsList() {
    return $("#adminReviewsList");
  },

  // Action buttons
  get addPetBtn() {
    return $("#addPetBtn");
  },
  get addRateBtn() {
    return $("#addRateBtn");
  },

  // Pet modal
  get petModal() {
    return $("#petModal");
  },
  get petModalTitle() {
    return $("#petModalTitle");
  },
  get petForm() {
    return $("#petForm");
  },
  get petNameInput() {
    return $("#petName");
  },
  get petDescriptionInput() {
    return $("#petDescription");
  },
  get petDorothyCheckbox() {
    return $("#isDorothyPet");
  },
  get petImagesInput() {
    return $("#petImages");
  },
  get savePetBtn() {
    return $("#savePetBtn");
  },

  // Rate modal
  get rateModal() {
    return $("#rateModal");
  },
  get rateModalTitle() {
    return $("#rateModalTitle");
  },
  get rateForm() {
    return $("#rateForm");
  },
  get serviceTypeInput() {
    return $("#serviceType");
  },
  get ratePerUnitInput() {
    return $("#ratePerUnit");
  },
  get unitTypeSelect() {
    return $("#unitType");
  },
  get rateDescriptionInput() {
    return $("#rateDescription");
  },
  get isFeaturedCheckbox() {
    return $("#isFeatured");
  },
  get saveRateBtn() {
    return $("#saveRateBtn");
  },
};

// -----------------------------
// Modal helpers (vanilla CSS modals)
// -----------------------------
function openModal(id) {
  const el = typeof id === "string" ? $("#" + id) : id;
  if (!el) return;
  el.classList.add("is-open");
  document.body.classList.add("modal-open");
}

function closeModal(id) {
  const el = typeof id === "string" ? $("#" + id) : id;
  if (!el) return;
  el.classList.remove("is-open");
  document.body.classList.remove("modal-open");
}

// -----------------------------
// Rendering helpers
// -----------------------------

function renderPets() {
  if (!Dom.petsList) return;
  const pets = AdminState.pets || [];
  if (!pets.length) {
    Dom.petsList.innerHTML =
      '<p class="admin-empty">No pets yet. Click "Add New Pet" to get started.</p>';
    return;
  }

  Dom.petsList.innerHTML = pets
    .map((pet) => {
      const images = Array.isArray(pet.images) ? pet.images : [];
      const thumbs =
        images.length === 0
          ? '<div class="pet-thumb pet-thumb-empty">No images yet</div>'
          : images
              .map(
                (img) => `
        <div class="pet-thumb" data-image-id="${img.id}">
          <img src="${img.image_url}" alt="${pet.pet_name}" />
          <button class="thumb-delete-btn" data-image-id="${img.id}" title="Delete image">✕</button>
        </div>`
              )
              .join("");

      const dorothyBadge = pet.is_dorothy_pet
        ? '<span class="badge-dorothy">Dorothy\'s Pet</span>'
        : "";

      return `
      <article class="admin-card pet-card" data-pet-id="${pet.id}">
        <header class="admin-card-header">
          <div>
            <h3>${pet.pet_name || "Unnamed Pet"}</h3>
            ${dorothyBadge}
          </div>
          <div class="admin-card-actions">
            <button class="btn-secondary pet-edit-btn" data-pet-id="${pet.id}">Edit</button>
            <button class="btn-danger pet-delete-btn" data-pet-id="${pet.id}">Delete</button>
          </div>
        </header>
        <p class="admin-card-subtitle">${pet.story_description || ""}</p>
        <div class="pet-thumbs-row">
          ${thumbs}
        </div>
        <p class="pet-thumbs-hint">
          Drag to reorder photos • Click ✕ to remove photo
        </p>
      </article>
      `;
    })
    .join("");

  // Wire up edit/delete and image-delete and drag events
  wirePetCardEvents();
}

function renderRates() {
  if (!Dom.ratesList) return;
  const rates = AdminState.rates || [];
  if (!rates.length) {
    Dom.ratesList.innerHTML =
      '<p class="admin-empty">No rates yet. Click "Add New Rate" to add one.</p>';
    return;
  }

  Dom.ratesList.innerHTML = rates
    .map((rate) => {
      const featuredBadge = rate.is_featured
        ? '<span class="badge-featured">Featured</span>'
        : "";
      const unit =
        rate.unit_type === "per_day"
          ? "per day"
          : rate.unit_type === "per_night"
          ? "per night"
          : "per visit";

      return `
      <article class="admin-card rate-card" data-rate-id="${rate.id}">
        <header class="admin-card-header">
          <div>
            <h3>${rate.service_type}</h3>
            ${featuredBadge}
          </div>
          <div class="admin-card-actions">
            <button class="btn-secondary rate-edit-btn" data-rate-id="${rate.id}">Edit</button>
            <button class="btn-danger rate-delete-btn" data-rate-id="${rate.id}">Delete</button>
          </div>
        </header>
        <p class="admin-card-subtitle">$${Number(rate.rate_per_unit).toFixed(
          2
        )} <span class="rate-unit">${unit}</span></p>
        <p class="admin-card-description">${rate.description || ""}</p>
      </article>
      `;
    })
    .join("");

  wireRateCardEvents();
}

function renderContacts() {
  if (!Dom.contactsList) return;
  const contacts = AdminState.contacts || [];
  if (!contacts.length) {
    Dom.contactsList.innerHTML =
      '<p class="admin-empty">No pending contact requests 🎉</p>';
    return;
  }

  Dom.contactsList.innerHTML = contacts
    .map((c) => {
      const dates =
        c.start_date && c.end_date
          ? `${c.start_date} → ${c.end_date}`
          : c.start_date
          ? c.start_date
          : "Not specified";

      return `
      <article class="admin-card contact-card" data-contact-id="${c.id}">
        <header class="admin-card-header">
          <div>
            <h3>${c.name}</h3>
            <p class="admin-card-subtitle">${c.email} · ${
        c.phone || "No phone"
      }</p>
          </div>
          <div class="admin-card-actions">
            <button class="btn-primary contact-mark-btn" data-contact-id="${
              c.id
            }">
              Mark Contacted
            </button>
          </div>
        </header>
        <dl class="contact-meta">
          <div><dt>Best Time</dt><dd>${c.best_time || "N/A"}</dd></div>
          <div><dt>Service</dt><dd>${c.service || "N/A"}</dd></div>
          <div><dt>Dates</dt><dd>${dates}</dd></div>
        </dl>
        <p class="admin-card-description"><strong>Pet Info:</strong> ${
          c.pet_info || "N/A"
        }</p>
        <p class="admin-card-description"><strong>Message:</strong> ${
          c.message || "N/A"
        }</p>
      </article>
      `;
    })
    .join("");

  wireContactCardEvents();
}

function renderReviews() {
  if (!Dom.reviewsList) return;
  const reviews = AdminState.reviews || [];
  if (!reviews.length) {
    Dom.reviewsList.innerHTML =
      '<p class="admin-empty">No pending reviews at this time.</p>';
    return;
  }

  Dom.reviewsList.innerHTML = reviews
    .map((r) => {
      const stars = "⭐".repeat(Math.max(1, Math.min(5, r.rating || 5)));
      const dateStr = r.created_at
        ? new Date(r.created_at).toLocaleDateString()
        : "";
      return `
      <article class="admin-card review-card" data-review-id="${r.id}">
        <header class="admin-card-header">
          <div>
            <h3>${r.reviewer_name}</h3>
            <p class="admin-card-subtitle">${dateStr}</p>
          </div>
          <div class="admin-card-actions">
            <span class="review-stars">${stars}</span>
            <button class="btn-primary review-approve-btn" data-review-id="${
              r.id
            }">Approve</button>
            <button class="btn-danger review-delete-btn" data-review-id="${
              r.id
            }">Delete</button>
          </div>
        </header>
        <p class="admin-card-description">${r.review_text || ""}</p>
      </article>
      `;
    })
    .join("");

  wireReviewCardEvents();
}

// -----------------------------
// Wire per-card actions
// -----------------------------
function wirePetCardEvents() {
  // Edit pet
  $all(".pet-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.petId;
      openPetEditor(id);
    });
  });

  // Delete pet
  $all(".pet-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.petId;
      if (!confirm("Delete this pet and all images?")) return;
      try {
        await apiDelete(`/api/pets/${id}`);
        toast("Pet deleted", "success");
        await loadPets();
      } catch (err) {
        console.error(err);
        toast("Failed to delete pet", "error");
      }
    });
  });

  // Delete individual image
  $all(".thumb-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const imgId = btn.dataset.imageId;
      if (!confirm("Delete this photo?")) return;
      try {
        await apiDelete(`/api/pets/images/${imgId}`);
        toast("Image deleted", "success");
        await loadPets();
      } catch (err) {
        console.error(err);
        toast("Failed to delete image", "error");
      }
    });
  });

  // (Optional) drag-and-drop for reordering could be added here later
}

function wireRateCardEvents() {
  $all(".rate-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.rateId;
      openRateEditor(id);
    });
  });

  $all(".rate-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.rateId;
      if (!confirm("Delete this rate?")) return;
      try {
        await apiDelete(`/api/rates/${id}`);
        toast("Rate deleted", "success");
        await loadRates();
      } catch (err) {
        console.error(err);
        toast("Failed to delete rate", "error");
      }
    });
  });
}

function wireContactCardEvents() {
  $all(".contact-mark-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.contactId;
      if (!confirm("Mark this contact as handled?")) return;
      try {
        await apiPut(`/api/contacts/${id}/contacted`, {});
        toast("Contact marked as contacted", "success");
        await loadContacts();
      } catch (err) {
        console.error(err);
        toast("Failed to update contact", "error");
      }
    });
  });
}

function wireReviewCardEvents() {
  $all(".review-approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.reviewId;
      try {
        await apiPut(`/api/admin/reviews/${id}/approve`, {});
        toast("Review approved", "success");
        await loadReviews();
      } catch (err) {
        console.error(err);
        toast("Failed to approve review", "error");
      }
    });
  });

  $all(".review-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.reviewId;
      if (!confirm("Delete this review?")) return;
      try {
        await apiDelete(`/api/admin/reviews/${id}`);
        toast("Review deleted", "success");
        await loadReviews();
      } catch (err) {
        console.error(err);
        toast("Failed to delete review", "error");
      }
    });
  });
}

// -----------------------------
// Load data
// -----------------------------
async function loadPets() {
  try {
    const pets = await apiGet("/api/pets");
    AdminState.pets = Array.isArray(pets) ? pets : [];
    renderPets();
  } catch (err) {
    console.error(err);
    toast("Failed to load pets", "error");
  }
}

async function loadRates() {
  try {
    const rates = await apiGet("/api/rates");
    AdminState.rates = Array.isArray(rates) ? rates : [];
    renderRates();
  } catch (err) {
    console.error(err);
    toast("Failed to load rates", "error");
  }
}

async function loadContacts() {
  try {
    const contacts = await apiGet("/api/contacts");
    AdminState.contacts = Array.isArray(contacts) ? contacts : [];
    renderContacts();
  } catch (err) {
    console.error(err);
    toast("Failed to load contacts", "error");
  }
}

async function loadReviews() {
  try {
    const reviews = await apiGet("/api/admin/reviews");
    AdminState.reviews = Array.isArray(reviews) ? reviews : [];
    renderReviews();
  } catch (err) {
    console.error(err);
    toast("Failed to load reviews", "error");
  }
}

// -----------------------------
// Pet modal logic
// -----------------------------
function resetPetForm() {
  if (!Dom.petForm) return;
  Dom.petForm.reset();
  AdminState.editingPetId = null;
}

function openPetEditor(petId) {
  if (!Dom.petModal) return;
  if (!petId) {
    // New pet
    resetPetForm();
    Dom.petModalTitle.textContent = "Add New Pet";
    AdminState.editingPetId = null;
    openModal(Dom.petModal);
    return;
  }

  // Editing existing pet - populate from state
  const pet = AdminState.pets.find((p) => String(p.id) === String(petId));
  if (!pet) {
    toast("Pet not found in state", "error");
    return;
  }

  Dom.petModalTitle.textContent = `Edit Pet: ${pet.pet_name}`;
  Dom.petNameInput.value = pet.pet_name || "";
  Dom.petDescriptionInput.value = pet.story_description || "";
  Dom.petDorothyCheckbox.checked = !!pet.is_dorothy_pet;
  Dom.petImagesInput.value = ""; // clear file input
  AdminState.editingPetId = pet.id;

  openModal(Dom.petModal);
}

async function handleSavePet() {
  if (!Dom.petForm) return;
  const fd = new FormData();

  fd.append("pet_name", Dom.petNameInput.value.trim());
  fd.append("story_description", Dom.petDescriptionInput.value.trim());
  fd.append("is_dorothy_pet", Dom.petDorothyCheckbox.checked ? "true" : "false");

  const files = Dom.petImagesInput.files;
  if (files && files.length > 0) {
    for (const file of files) {
      fd.append("images", file);
    }
  }

  try {
    if (AdminState.editingPetId) {
      await apiPut(`/api/pets/${AdminState.editingPetId}`, fd, true);
      toast("Pet updated successfully", "success");
    } else {
      await apiPost("/api/pets", fd, true);
      toast("Pet created successfully", "success");
    }
    closeModal(Dom.petModal);
    resetPetForm();
    await loadPets();
  } catch (err) {
    console.error(err);
    alert("Could not save pet.");
  }
}

// -----------------------------
// Rate modal logic
// -----------------------------
function resetRateForm() {
  if (!Dom.rateForm) return;
  Dom.rateForm.reset();
  AdminState.editingRateId = null;
}

function openRateEditor(rateId) {
  if (!Dom.rateModal) return;
  if (!rateId) {
    resetRateForm();
    Dom.rateModalTitle.textContent = "Add New Rate";
    AdminState.editingRateId = null;
    openModal(Dom.rateModal);
    return;
  }

  const rate = AdminState.rates.find((r) => String(r.id) === String(rateId));
  if (!rate) {
    toast("Rate not found in state", "error");
    return;
  }

  Dom.rateModalTitle.textContent = `Edit Rate: ${rate.service_type}`;
  Dom.serviceTypeInput.value = rate.service_type || "";
  Dom.ratePerUnitInput.value = rate.rate_per_unit || "";
  Dom.unitTypeSelect.value = rate.unit_type || "per_visit";
  Dom.rateDescriptionInput.value = rate.description || "";
  Dom.isFeaturedCheckbox.checked = !!rate.is_featured;
  AdminState.editingRateId = rate.id;

  openModal(Dom.rateModal);
}

async function handleSaveRate() {
  const payload = {
    service_type: Dom.serviceTypeInput.value.trim(),
    rate_per_unit: Number(Dom.ratePerUnitInput.value || 0),
    unit_type: Dom.unitTypeSelect.value,
    description: Dom.rateDescriptionInput.value.trim(),
    is_featured: Dom.isFeaturedCheckbox.checked,
  };

  try {
    if (AdminState.editingRateId) {
      await apiPut(`/api/rates/${AdminState.editingRateId}`, payload);
      toast("Rate updated successfully", "success");
    } else {
      await apiPost("/api/rates", payload);
      toast("Rate created successfully", "success");
    }
    closeModal(Dom.rateModal);
    resetRateForm();
    await loadRates();
  } catch (err) {
    console.error(err);
    alert("Could not save rate.");
  }
}

// -----------------------------
// Tabs logic
// -----------------------------
function switchAdminTab(tabKey) {
  AdminState.currentTab = tabKey;

  // Tabs
  Dom.tabs.forEach((btn) => {
    const target = btn.dataset.target; // "pets" | "rates" | "contacts" | "reviews"
    if (target === tabKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Panels
  Dom.sections.forEach((panel) => {
    const section = panel.dataset.section;
    if (section === tabKey) {
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  });
}

// -----------------------------
// Login / logout
// -----------------------------
async function handleAdminLogin(ev) {
  ev.preventDefault();
  const form = Dom.loginForm;
  if (!form) return;

  const username = form.adminUsername.value.trim();
  const password = form.adminPassword.value;

  try {
    const res = await apiPost("/api/admin/auth", { username, password });
    if (!res || !res.success || !res.token) {
      alert("Invalid admin credentials.");
      return;
    }
    localStorage.setItem("adminToken", res.token);
    toast("Admin login successful", "success");
    enterAdminDashboard();
  } catch (err) {
    console.error(err);
    alert("Admin login failed.");
  }
}

function enterAdminDashboard() {
  if (Dom.loginSection) Dom.loginSection.classList.add("hidden");
  if (Dom.dashboard) Dom.dashboard.classList.remove("hidden");

  // Attach all listeners
  initAdminTabsAndButtons();

  // Load all datasets in background
  loadPets();
  loadRates();
  loadContacts();
  loadReviews();
}

function handleAdminLogout() {
  localStorage.removeItem("adminToken");
  if (Dom.dashboard) Dom.dashboard.classList.add("hidden");
  if (Dom.loginSection) Dom.loginSection.classList.remove("hidden");
}

// -----------------------------
// Init
// -----------------------------
function initAdminTabsAndButtons() {
  // Tabs
  Dom.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      switchAdminTab(target);
    });
  });

  // Default tab
  switchAdminTab(AdminState.currentTab || "pets");

  // Add buttons
  if (Dom.addPetBtn) {
    Dom.addPetBtn.addEventListener("click", () => openPetEditor(null));
  }
  if (Dom.addRateBtn) {
    Dom.addRateBtn.addEventListener("click", () => openRateEditor(null));
  }

  // Save buttons
  if (Dom.savePetBtn) {
    Dom.savePetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSavePet();
    });
  }
  if (Dom.saveRateBtn) {
    Dom.saveRateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSaveRate();
    });
  }

  // Close modals via [data-close-modal]
  $all("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.closeModal;
      closeModal(target);
    });
  });
}

// ==========================================
// Simple Admin Tab Controller (Pets / Rates / Contacts / Reviews)
// ==========================================
(function initAdminTabs() {
  // Run only on pages that actually have the admin dashboard
  const tabButtons = document.querySelectorAll("[data-admin-tab]");
  const sections = document.querySelectorAll("[data-admin-section]");
  if (!tabButtons.length || !sections.length) {
    return;
  }

  function activateTab(tabName) {
    sections.forEach((section) => {
      if (section.dataset.adminSection === tabName) {
        section.style.display = "";
      } else {
        section.style.display = "none";
      }
    });

    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.adminTab === tabName;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.adminTab;
      if (target) {
        activateTab(target);
      }
    });
  });

  // Default tab when admin dashboard loads
  activateTab("pets");
})();

// -----------------------------
// DOM Ready
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin JS loaded");

  if (Dom.loginForm) {
    Dom.loginForm.addEventListener("submit", handleAdminLogin);
  }
  if (Dom.logoutBtn) {
    Dom.logoutBtn.addEventListener("click", handleAdminLogout);
  }

  // Auto-enter if token present
  const token = localStorage.getItem("adminToken");
  if (token) {
    enterAdminDashboard();
  }
});
