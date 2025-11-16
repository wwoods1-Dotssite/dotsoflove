// js/admin.js
(() => {
  "use strict";

  const ADMIN_TOKEN_KEY = "dotsAdminToken";

  // -----------------------------
  // State
  // -----------------------------
  let isLoggedIn = false;
  let currentTab = "adminPets";

  // cache for rates so Edit can pre-fill modal
  let adminRatesCache = [];

  // -----------------------------
  // Cached DOM refs
  // -----------------------------
  let adminNavLink;
  let adminPanel;
  let adminLogoutBtn;

  let adminTabs = [];
  let adminSections = [];

  let adminPetsSection;
  let adminRatesSection;
  let adminContactsSection;
  let adminReviewsSection;

  // Login modal
  let adminLoginModal;
  let adminLoginForm;
  let adminLoginClose;
  let adminLoginCancel;

  // Rate modal
  let adminRateModal;
  let rateModalTitle;
  let rateModalForm;
  let rateModalClose;
  let rateModalCancel;
  let rateServiceTypeInput;
  let rateAmountInput;
  let rateUnitSelect;
  let rateDescriptionInput;
  let rateFeaturedCheckbox;

  // Pet modal
  let petModal;
  let petModalTitle;
  let petForm;
  let petModalClose;
  let petModalCancel;
  let petNameInput;
  let petStoryInput;
  let petIsDorothyInput;
  let petImagesInput;

  // -----------------------------
  // Init
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    cacheDom();
    attachListeners();
    restoreAuth();
    console.log("[Admin] admin.js initialized");
  });

  function cacheDom() {
    adminNavLink = document.getElementById("adminNav");
    adminPanel   = document.getElementById("adminPanel");
    adminLogoutBtn = document.getElementById("adminLogoutBtn");

    adminTabs     = Array.from(document.querySelectorAll(".admin-tab"));
    adminSections = Array.from(document.querySelectorAll(".admin-section"));

    adminPetsSection     = document.getElementById("adminPets");
    adminRatesSection    = document.getElementById("adminRates");
    adminContactsSection = document.getElementById("adminContacts");
    adminReviewsSection  = document.getElementById("adminReviews");

    // Login modal
    adminLoginModal  = document.getElementById("adminLoginModal");
    adminLoginForm   = document.getElementById("adminLoginForm");
    adminLoginClose  = document.getElementById("adminLoginClose");
    adminLoginCancel = document.getElementById("adminLoginCancel");

    // Rate modal
    adminRateModal        = document.getElementById("adminRateModal");
    rateModalTitle        = document.getElementById("rateModalTitle");
    rateModalForm         = document.getElementById("rateModalForm");
    rateModalClose        = document.getElementById("rateModalClose");
    rateModalCancel       = document.getElementById("rateModalCancel");
    rateServiceTypeInput  = document.getElementById("rateServiceType");
    rateAmountInput       = document.getElementById("rateAmount");
    rateUnitSelect        = document.getElementById("rateUnit");
    rateDescriptionInput  = document.getElementById("rateDescription");
    rateFeaturedCheckbox  = document.getElementById("rateFeatured");

    // Pet modal
    petModal         = document.getElementById("petModal");
    petModalTitle    = document.getElementById("petModalTitle");
    petForm          = document.getElementById("petForm");
    petModalClose    = document.getElementById("petModalClose");
    petModalCancel   = document.getElementById("petModalCancel");
    petNameInput     = document.getElementById("petName");
    petStoryInput    = document.getElementById("petStory");
    petIsDorothyInput = document.getElementById("petIsDorothy");
    petImagesInput   = document.getElementById("petImages");

    console.log("[Admin] cacheDom()", {
      adminNavLink,
      adminPanel,
      tabs: adminTabs.length,
      sections: adminSections.length,
    });
  }

  function attachListeners() {
    // Nav: open admin / login
    if (adminNavLink) {
      adminNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[Admin] Admin nav clicked");

        if (isLoggedIn) {
          showAdminPanel();
        } else {
          showLoginModal();
        }
      });
    }

    // Login modal close/cancel
    if (adminLoginClose) {
      adminLoginClose.addEventListener("click", (e) => {
        e.preventDefault();
        hideLoginModal();
      });
    }
    if (adminLoginCancel) {
      adminLoginCancel.addEventListener("click", (e) => {
        e.preventDefault();
        hideLoginModal();
      });
    }

    // Login submit
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", handleLoginSubmit);
    }

    // Logout
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleLogout();
      });
    }

    // Tab buttons
    if (adminTabs.length) {
      adminTabs.forEach((btn) => {
        btn.addEventListener("click", () => {
          const sectionId = btn.dataset.section;
          setActiveTab(sectionId);
        });
      });
    }

    // Reviews (approve/delete)
    if (adminReviewsSection) {
      adminReviewsSection.addEventListener("click", handleReviewActions);
    }

    // Contacts (contacted/delete)
    if (adminContactsSection) {
      adminContactsSection.addEventListener("click", handleContactActions);
    }

    // Rates modal & table
    if (rateModalClose) {
      rateModalClose.addEventListener("click", (e) => {
        e.preventDefault();
        closeRateModal();
      });
    }
    if (rateModalCancel) {
      rateModalCancel.addEventListener("click", (e) => {
        e.preventDefault();
        closeRateModal();
      });
    }
    if (rateModalForm) {
      rateModalForm.addEventListener("submit", handleRateFormSubmit);
    }
    if (adminRatesSection) {
      adminRatesSection.addEventListener("click", handleRateTableClick);
    }

    // Pets modal & table
    if (petModalClose) {
      petModalClose.addEventListener("click", (e) => {
        e.preventDefault();
        closePetModal();
      });
    }
    if (petModalCancel) {
      petModalCancel.addEventListener("click", (e) => {
        e.preventDefault();
        closePetModal();
      });
    }
    if (petForm) {
      petForm.addEventListener("submit", handlePetFormSubmit);
    }
    if (adminPetsSection) {
      adminPetsSection.addEventListener("click", handlePetTableClick);
    }
  }
  /* 👇 Pet Modal Delete photos👇 */
if (petModal) {
  // Delegate clicks inside the pet modal for image delete buttons
  petModal.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-delete-img");
    if (!btn) return;

    e.preventDefault();

    const imgId = btn.dataset.imgId;
    const petId = btn.dataset.petId;

    if (!imgId || !petId) return;

    if (!confirm("Delete this photo? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/pets/${petId}/images/${imgId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Remove the thumbnail from the DOM
      const thumb = btn.closest(".pet-img-thumb");
      if (thumb) thumb.remove();
    } catch (err) {
      console.error("[Admin] Error deleting image:", err);
      alert("Couldn't delete image.");
    }
  });
}

  // -----------------------------
  // Login modal helpers
  // -----------------------------
  function showLoginModal() {
    if (!adminLoginModal) return;
    adminLoginModal.classList.remove("hidden");
    adminLoginModal.classList.add("show");
    adminLoginModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function hideLoginModal() {
    if (!adminLoginModal) return;
    adminLoginModal.classList.remove("show");
    adminLoginModal.classList.add("hidden");
    adminLoginModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // -----------------------------
  // Panel helpers
  // -----------------------------
  function showAdminPanel() {
    if (!adminPanel) return;
    adminPanel.style.display = "block";
    setActiveTab(currentTab);
    adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideAdminPanel() {
    if (!adminPanel) return;
    adminPanel.style.display = "none";
  }

  // -----------------------------
  // Auth
  // -----------------------------
  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (!adminLoginForm) return;

    const username = adminLoginForm.querySelector("#adminUsername")?.value.trim();
    const password = adminLoginForm.querySelector("#adminPassword")?.value ?? "";

    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }

    try {
      console.log("[Admin] Attempting admin login…");

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        console.error("[Admin] Login failed:", res.status);
        alert("Login failed. Please check your credentials.");
        return;
      }

      isLoggedIn = true;
      localStorage.setItem(ADMIN_TOKEN_KEY, "true");

      hideLoginModal();
      showAdminPanel();
      console.log("[Admin] Login successful");
    } catch (err) {
      console.error("[Admin] Login error", err);
      alert("Unable to login right now – please try again in a bit.");
    }
  }

  function handleLogout() {
    isLoggedIn = false;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    hideAdminPanel();
    hideLoginModal();
    console.log("[Admin] Logged out");
  }

  function restoreAuth() {
    isLoggedIn = localStorage.getItem(ADMIN_TOKEN_KEY) === "true";
    if (isLoggedIn) {
      console.log("[Admin] Restoring logged-in session");
      showAdminPanel();
    } else {
      console.log("[Admin] No admin token – public view.");
      hideAdminPanel();
    }
  }

  // -----------------------------
  // Tabs
  // -----------------------------
  function setActiveTab(sectionId) {
    if (!sectionId) return;
    currentTab = sectionId;

    // buttons
    adminTabs.forEach((btn) => {
      if (btn.dataset.section === sectionId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // sections
    adminSections.forEach((sec) => {
      if (sec.id === sectionId) {
        sec.style.display = "block";
      } else {
        sec.style.display = "none";
      }
    });

    // load data for this tab
    switch (sectionId) {
      case "adminPets":
        loadAdminPets();
        break;
      case "adminRates":
        loadAdminRates();
        break;
      case "adminContacts":
        loadAdminContacts();
        break;
      case "adminReviews":
        loadAdminReviews();
        break;
    }
  }

// -----------------------------
// PETS TAB (WITH IMAGE MANAGER)
// -----------------------------

async function loadAdminPets() {
  if (!adminPetsSection) return;
  adminPetsSection.innerHTML = "<p>Loading pets…</p>";

  try {
    const res = await fetch("/api/pets");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pets = await res.json();

    const header = `
      <div class="admin-header-row">
        <h3>Pets</h3>
        <button type="button" class="btn-primary" id="addPetBtn">
          + Add Pet
        </button>
      </div>
    `;

    if (!pets.length) {
      adminPetsSection.innerHTML = header + "<p>No pets found.</p>";
      adminPetsSection.querySelector("#addPetBtn")
        .addEventListener("click", openPetModalForNew);
      return;
    }

    const rows = pets.map(p => `
      <tr data-id="${p.id}">
        <td>${escapeHtml(p.pet_name || "")}</td>
        <td>${p.is_dorothy_pet ? "Dorothy" : "Client"}</td>
        <td>${escapeHtml(p.story_description || "")}</td>
        <td>${(p.images || []).length}</td>
        <td>
          <button class="btn-small js-edit-pet" data-id="${p.id}">Edit</button>
          <button class="btn-small btn-danger js-delete-pet" data-id="${p.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    adminPetsSection.innerHTML = `
      ${header}
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Owner</th>
            <th>Story</th>
            <th>Photos</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    document.querySelector("#addPetBtn")
      .addEventListener("click", openPetModalForNew);

  } catch (err) {
    console.error("[Admin] Error loading pets", err);
    adminPetsSection.innerHTML = "<p class='admin-error'>Unable to load pets.</p>";
  }
}

function handlePetTableClick(e) {
  const editBtn = e.target.closest(".js-edit-pet");
  const deleteBtn = e.target.closest(".js-delete-pet");
  const id = editBtn?.dataset.id || deleteBtn?.dataset.id;
  if (!id) return;

  if (editBtn) openPetModalForEdit(id);
  if (deleteBtn) deletePet(id);
}

// ---------------------------------
// MODAL — NEW PET
// ---------------------------------
function openPetModalForNew() {
  petForm.dataset.mode = "create";
  delete petForm.dataset.petId;

  petModalTitle.textContent = "Add Pet";
  petNameInput.value = "";
  petStoryInput.value = "";
  petIsDorothyInput.checked = false;
  petImagesInput.value = "";

  renderPetImageManager([]);  // empty

  showPetModal();
}

// ---------------------------------
// MODAL — EDIT PET
// ---------------------------------
async function openPetModalForEdit(id) {
  try {
    const res = await fetch(`/api/pets/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pet = await res.json();

    petForm.dataset.mode = "edit";
    petForm.dataset.petId = id;

    petModalTitle.textContent = "Edit Pet";
    petNameInput.value = pet.pet_name || "";
    petStoryInput.value = pet.story_description || "";
    petIsDorothyInput.checked = !!pet.is_dorothy_pet;

    renderPetImageManager(pet.images);

    showPetModal();
  } catch (err) {
    console.error("[Admin] Error loading pet:", err);
    alert("Error loading pet details.");
  }
}

existingImagesContainer.innerHTML = pet.images
  .map(
    (img) => `
      <div class="pet-img-thumb">
        <img src="${escapeHtml(img.image_url)}" alt="">
        <button
          type="button"
          class="btn-danger btn-xs js-delete-img"
          data-img-id="${img.id}"
          data-pet-id="${pet.id}"
        >
          Delete
        </button>
      </div>
    `
  )
  .join("");

// ---------------------------------
// IMAGE MANAGER RENDERING
// ---------------------------------
function renderPetImageManager(images) {
  const container = document.getElementById("petImageManager");
  if (!container) return;

  if (!images.length) {
    container.innerHTML = "<p>No images uploaded yet.</p>";
    return;
  }

  container.innerHTML = `
    <ul id="petImageList" class="image-list">
      ${images.map(img => `
        <li class="image-item" data-id="${img.id}">
          <img src="${img.image_url}" class="thumb">
          <div class="img-actions">
         <button type="button" class="btn-small btn-danger js-delete-img" data-id="${img.id}"> Delete </button>
            <span class="drag-handle">☰</span>
          </div>
        </li>
      `).join("")}
    </ul>
    <p class="modal-help-text">Drag images to reorder them. Delete will remove from S3 + database.</p>
  `;

  enableImageDragSorting();
}

// ---------------------------------
// DRAG & DROP SORTING FOR IMAGES
// ---------------------------------
function enableImageDragSorting() {
  const list = document.getElementById("petImageList");
  if (!list) return;

  let dragItem = null;

  list.querySelectorAll(".image-item").forEach(item => {
    item.draggable = true;

    item.addEventListener("dragstart", (e) => {
      dragItem = item;
      e.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      const after = (e.clientY - item.getBoundingClientRect().top) > item.offsetHeight / 2;
      list.insertBefore(dragItem, after ? item.nextSibling : item);
    });

    item.addEventListener("dragend", () => (dragItem = null));
  });
}


// ---------------------------------
// SAVE PET (includes reorder & new uploads)
// ---------------------------------
async function handlePetFormSubmit(e) {
  e.preventDefault();

  const mode = petForm.dataset.mode;
  const petId = petForm.dataset.petId;

  try {
    // STEP 1 — Gather text + checkbox fields
    const fd = new FormData();
    fd.append("pet_name", petNameInput.value.trim());
    fd.append("story_description", petStoryInput.value.trim());
    fd.append("is_dorothy_pet", petIsDorothyInput.checked ? "true" : "false");

    // STEP 2 — Add new images (if any)
    for (const file of petImagesInput.files) {
      fd.append("images", file);
    }

    // STEP 3 — Save/update pet
    const url = mode === "edit" ? `/api/pets/${petId}` : "/api/pets";
    const method = mode === "edit" ? "PUT" : "POST";

    const res = await fetch(url, { method, body: fd });
    if (!res.ok) throw new Error();

    // If editing → send reorder
    if (mode === "edit") {
      const orderedIds = [...document.querySelectorAll(".image-item")]
        .map(el => el.dataset.id);

      await fetch(`/api/pets/${petId}/images/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderedIds }),
      });
    }

    closePetModal();
    loadAdminPets();
  } catch (err) {
    console.error("[Admin] save pet failed", err);
    alert("Couldn't save pet.");
  }
}

// ---------------------------------
// DELETE PET
// ---------------------------------
async function deletePet(id) {
  if (!confirm("Delete pet and ALL images?")) return;

  try {
    const res = await fetch(`/api/pets/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error();

    loadAdminPets();
  } catch (err) {
    console.error("[Admin] delete pet failed", err);
    alert("Couldn't delete pet.");
  }
}

// ---------------------------------
// SHOW / HIDE PET MODAL
// ---------------------------------
function showPetModal() {
  petModal.classList.remove("hidden");
  petModal.classList.add("show");
  petModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closePetModal() {
  petModal.classList.remove("show");
  petModal.classList.add("hidden");
  petModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
  
  // -----------------------------
  // RATES TAB
  // -----------------------------
  async function loadAdminRates() {
    if (!adminRatesSection) return;
    adminRatesSection.innerHTML = "<p>Loading rates…</p>";

    try {
      const res = await fetch("/api/rates");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rates = await res.json();
      adminRatesCache = rates;

      if (!rates.length) {
        adminRatesSection.innerHTML = `
          <div class="admin-header-row">
            <h3>Service Rates</h3>
            <button type="button" class="btn-primary" id="addRateBtn">
              + Add New Rate
            </button>
          </div>
          <p>No rates found.</p>`;
        const addBtn = adminRatesSection.querySelector("#addRateBtn");
        if (addBtn) addBtn.addEventListener("click", () => openRateModalForNew());
        return;
      }

      const rows = rates
        .map((r) => {
          const price = Number(r.rate_per_unit ?? 0).toFixed(2);
          let unitLabel = r.unit_type || "";
          if (unitLabel === "per_visit") unitLabel = "Per Visit";
          if (unitLabel === "per_day") unitLabel = "Per Day";
          if (unitLabel === "per_night") unitLabel = "Per Night";

          return `
            <tr data-id="${r.id}">
              <td>${escapeHtml(r.service_type || "")}</td>
              <td>${escapeHtml(unitLabel)}</td>
              <td>$${price}</td>
              <td>${escapeHtml(r.description || "")}</td>
              <td>${r.is_featured ? "Yes" : "No"}</td>
              <td>
                <button type="button"
                        class="btn-small js-edit-rate"
                        data-id="${r.id}">
                  Edit
                </button>
                <button type="button"
                        class="btn-small btn-danger js-delete-rate"
                        data-id="${r.id}">
                  Delete
                </button>
              </td>
            </tr>`;
        })
        .join("");

      adminRatesSection.innerHTML = `
        <div class="admin-header-row">
          <h3>Service Rates</h3>
          <button type="button" class="btn-primary" id="addRateBtn">
            + Add New Rate
          </button>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Description</th>
              <th>Featured?</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;

      const addBtn = adminRatesSection.querySelector("#addRateBtn");
      if (addBtn) addBtn.addEventListener("click", () => openRateModalForNew());
    } catch (err) {
      console.error("[Admin] Error loading rates", err);
      adminRatesSection.innerHTML =
        "<p class='admin-error'>Unable to load rates.</p>";
    }
  }

  function handleRateTableClick(e) {
    const editBtn = e.target.closest(".js-edit-rate");
    const deleteBtn = e.target.closest(".js-delete-rate");

    const id = editBtn?.dataset.id || deleteBtn?.dataset.id;
    if (!id) return;

    if (editBtn) {
      e.preventDefault();
      openRateModalForEdit(id);
    } else if (deleteBtn) {
      e.preventDefault();
      deleteRate(id);
    }
  }

  function openRateModalForNew() {
    if (!adminRateModal) return;

    rateModalForm.dataset.mode = "create";
    delete rateModalForm.dataset.rateId;

    rateModalTitle.textContent = "New Rate";
    rateServiceTypeInput.value = "";
    rateAmountInput.value = "";
    rateUnitSelect.value = "per_visit";
    rateDescriptionInput.value = "";
    rateFeaturedCheckbox.checked = false;

    adminRateModal.classList.remove("hidden");
    adminRateModal.classList.add("show");
    adminRateModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function openRateModalForEdit(id) {
    if (!adminRateModal) return;

    const rate = adminRatesCache.find((r) => String(r.id) === String(id));
    if (!rate) {
      alert("Couldn't find that rate.");
      return;
    }

    rateModalForm.dataset.mode = "edit";
    rateModalForm.dataset.rateId = String(id);

    rateModalTitle.textContent = "Edit Rate";
    rateServiceTypeInput.value = rate.service_type || "";
    rateAmountInput.value = rate.rate_per_unit ?? "";
    rateUnitSelect.value = rate.unit_type || "per_visit";
    rateDescriptionInput.value = rate.description || "";
    rateFeaturedCheckbox.checked = !!rate.is_featured;

    adminRateModal.classList.remove("hidden");
    adminRateModal.classList.add("show");
    adminRateModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeRateModal() {
    if (!adminRateModal) return;
    adminRateModal.classList.remove("show");
    adminRateModal.classList.add("hidden");
    adminRateModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  async function handleRateFormSubmit(e) {
    e.preventDefault();
    if (!rateModalForm) return;

    const mode  = rateModalForm.dataset.mode || "create";
    const rateId = rateModalForm.dataset.rateId;

    const serviceType = rateServiceTypeInput.value.trim();
    const amountStr   = rateAmountInput.value.trim();
    const unit        = rateUnitSelect.value;
    const description = rateDescriptionInput.value.trim();
    const isFeatured  = rateFeaturedCheckbox.checked;

    if (!serviceType || !amountStr) {
      alert("Please enter a service name and rate.");
      return;
    }

    const amount = Number(amountStr);
    if (Number.isNaN(amount)) {
      alert("Please enter a valid number for rate.");
      return;
    }

    const payload = {
      service_type: serviceType,
      rate_per_unit: amount,
      unit_type: unit,
      description,
      is_featured: isFeatured ? "true" : "false",
    };

    try {
      let url = "/api/rates";
      let method = "POST";
      if (mode === "edit" && rateId) {
        url = `/api/rates/${rateId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      closeRateModal();
      await loadAdminRates();
    } catch (err) {
      console.error("[Admin] Error saving rate:", err);
      alert("Couldn't save rate.");
    }
  }

  async function deleteRate(id) {
    if (!confirm("Delete this rate? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/rates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await loadAdminRates();
    } catch (err) {
      console.error("[Admin] Error deleting rate:", err);
      alert("Couldn't delete rate.");
    }
  }

  // -----------------------------
  // CONTACTS TAB
  // -----------------------------
  async function loadAdminContacts() {
    if (!adminContactsSection) return;
    adminContactsSection.innerHTML = "<p>Loading contact requests…</p>";

    try {
      const res = await fetch("/api/admin/contacts");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contacts = await res.json();

      if (!contacts.length) {
        adminContactsSection.innerHTML = "<p>No contact requests yet.</p>";
        return;
      }

      const rows = contacts
        .map(
          (c) => `
            <tr data-id="${c.id}">
              <td>${escapeHtml(c.name || "")}</td>
              <td>${escapeHtml(c.email || "")}</td>
              <td>${escapeHtml(c.phone || "")}</td>
              <td>${escapeHtml(c.service || "")}</td>
              <td>${escapeHtml(c.start_date || "")}</td>
              <td>${escapeHtml(c.message || "")}</td>
              <td>
                <button type="button"
                        class="btn-small"
                        data-action="contacted"
                        data-id="${c.id}">
                  Contacted
                </button>
                <button type="button"
                        class="btn-small btn-danger"
                        data-action="delete"
                        data-id="${c.id}">
                  Delete
                </button>
              </td>
            </tr>`
        )
        .join("");

      adminContactsSection.innerHTML = `
        <h3>Contact Requests</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Start date</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    } catch (err) {
      console.error("[Admin] Error loading contacts", err);
      adminContactsSection.innerHTML =
        "<p class='admin-error'>Unable to load contact requests.</p>";
    }
  }

  function handleContactActions(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (!id || !action) return;

    if (action === "contacted") {
      markContacted(id);
    } else if (action === "delete") {
      deleteContact(id);
    }
  }

  async function markContacted(id) {
    try {
      const res = await fetch(`/api/admin/contacts/${id}/contacted`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await loadAdminContacts();
    } catch (err) {
      console.error("[Admin] Error marking contact as contacted:", err);
      alert("Couldn't mark as contacted.");
    }
  }

  async function deleteContact(id) {
    if (!confirm("Delete this contact request? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await loadAdminContacts();
    } catch (err) {
      console.error("[Admin] Error deleting contact:", err);
      alert("Couldn't delete contact.");
    }
  }

  // -----------------------------
  // REVIEWS TAB
  // -----------------------------
  async function loadAdminReviews() {
    if (!adminReviewsSection) return;
    adminReviewsSection.innerHTML = "<p>Loading reviews…</p>";

    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reviews = await res.json();

      if (!reviews.length) {
        adminReviewsSection.innerHTML = "<p>No reviews yet.</p>";
        return;
      }

      const pending = reviews.filter((r) => !r.approved);
      const approved = reviews.filter((r) => r.approved);

      const pendingRows = pending
        .map(
          (r) => `
            <tr data-id="${r.id}">
              <td>${escapeHtml(r.customer_name || "")}</td>
              <td>${"★".repeat(r.rating || 0)}</td>
              <td>${escapeHtml(r.review_text || "")}</td>
              <td>
                <button type="button"
                        class="btn-small js-approve-review"
                        data-id="${r.id}">
                  Approve
                </button>
                <button type="button"
                        class="btn-small btn-danger js-delete-review"
                        data-id="${r.id}">
                  Delete
                </button>
              </td>
            </tr>`
        )
        .join("");

      const approvedRows = approved
        .map(
          (r) => `
            <tr>
              <td>${escapeHtml(r.customer_name || "")}</td>
              <td>${"★".repeat(r.rating || 0)}</td>
              <td>${escapeHtml(r.review_text || "")}</td>
            </tr>`
        )
        .join("");

      adminReviewsSection.innerHTML = `
        <h3>Pending Reviews</h3>
        ${
          pending.length
            ? `<table class="admin-table">
                 <thead>
                   <tr>
                     <th>Name</th>
                     <th>Rating</th>
                     <th>Review</th>
                     <th>Actions</th>
                   </tr>
                 </thead>
                 <tbody>${pendingRows}</tbody>
               </table>`
            : "<p>No reviews awaiting approval.</p>"
        }

        <h3 style="margin-top:2rem;">Approved Reviews</h3>
        ${
          approved.length
            ? `<table class="admin-table">
                 <thead>
                   <tr>
                     <th>Name</th>
                     <th>Rating</th>
                     <th>Review</th>
                   </tr>
                 </thead>
                 <tbody>${approvedRows}</tbody>
               </table>`
            : "<p>No approved reviews yet.</p>"
        }`;
    } catch (err) {
      console.error("[Admin] Error loading reviews", err);
      adminReviewsSection.innerHTML =
        "<p class='admin-error'>Unable to load reviews.</p>";
    }
  }

  async function handleReviewActions(e) {
    const approveBtn = e.target.closest(".js-approve-review");
    const deleteBtn  = e.target.closest(".js-delete-review");

    const id = approveBtn?.dataset.id || deleteBtn?.dataset.id;
    if (!id) return;

    if (approveBtn) {
      e.preventDefault();
      await approveReview(id);
      await loadAdminReviews();
    } else if (deleteBtn) {
      e.preventDefault();
      if (!confirm("Delete this review?")) return;
      await deleteReview(id);
      await loadAdminReviews();
    }
  }

  async function approveReview(id) {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[Admin] Error approving review", err);
      alert("Couldn't approve review.");
    }
  }

  async function deleteReview(id) {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[Admin] Error deleting review", err);
      alert("Couldn't delete review.");
    }
  }

  // -----------------------------
  // Utility
  // -----------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
