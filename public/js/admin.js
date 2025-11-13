// build: 2025-11-01-v1
// DotsofLove Admin UI (final)
// Features:
//  • Admin login + session restore
//  • Tab switching (Pets / Rates / Contacts) - only one visible
//  • Pets CRUD with modal:
//      - Add new pet
//      - Edit pet
//      - Upload new images (multi-file)
//      - Delete pet
//      - Delete individual image
//      - Drag+drop reorder images -> auto-saves order -> auto-refresh
//  • Rates CRUD with modal:
//      - Add new rate
//      - Edit existing rate
//      - Delete rate
//      - Mark rate Featured
//  • Contacts queue:
//      - Shows only NOT contacted
//      - Mark Contacted ✅ removes it
//  • Auto-refresh after every save/delete
//  • Enter key inside modals = save
//  • Console logs for debug

(function () {
  console.log("💜 Admin UI Loaded - vFinal 2025-11-01-v1");

  // ---------------------------
  // DOM ELEMENTS
  // ---------------------------

  // Sections
  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");

  // Login stuff
  const loginForm = document.getElementById("adminLoginForm");
  const loginStatus = document.getElementById("adminLoginStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");

  // Tabs
  const tabButtons = document.querySelectorAll(".admin-tabs .tab-btn");
  const petsTabPane = document.getElementById("tab-pets");
  const ratesTabPane = document.getElementById("tab-rates");
  const contactsTabPane = document.getElementById("tab-contacts");
  const reviewsTabPane = document.getElementById("tab-reviews");

  // Lists/containers in each tab
  const petListEl = document.getElementById("petList");
  const rateListEl = document.getElementById("rateList");
  const contactListEl = document.getElementById("contactList");

  // Add buttons
  const addPetBtn = document.getElementById("addPetBtn");
  const addRateBtn = document.getElementById("addRateBtn");

  // Pet modal + form fields
  const petModal = document.getElementById("petModal");
  const closePetModalBtn = document.getElementById("closePetModal");
  const petModalTitle = document.getElementById("petModalTitle");
  const petForm = document.getElementById("petForm");
  const petIdInput = document.getElementById("petId");
  const petNameInput = document.getElementById("petName");
  const petStoryInput = document.getElementById("storyDescription");
  const petDorothyCheckbox = document.getElementById("isDorothyPet");
  const petImagesInput = document.getElementById("petImages");
  const savePetBtn = document.getElementById("savePetBtn");

  // Rate modal + form fields
  const rateModal = document.getElementById("rateModal");
  const closeRateModalBtn = document.getElementById("closeRateModal");
  const rateModalTitle = document.getElementById("rateModalTitle");
  const rateForm = document.getElementById("rateForm");
  const rateIdInput = document.getElementById("rateId");
  const serviceTypeInput = document.getElementById("serviceType");
  const ratePerUnitInput = document.getElementById("ratePerUnit");
  const unitTypeInput = document.getElementById("unitType");
  const rateDescriptionInput = document.getElementById("rateDescription");
  const featuredRateCheckbox = document.getElementById("isFeaturedRate");
  const saveRateBtn = document.getElementById("saveRateBtn");

  // ---------------------------
  // STATE / CACHES
  // ---------------------------

  // Tracks whether modal save is "add" or "edit"
  let currentPetMode = "add"; // or "edit"
  let currentRateMode = "add"; // or "edit"

  // Keep last-loaded data in memory so we can reuse it
  let petsCache = [];
  let ratesCache = [];
  let contactsCache = [];

  // ---------------------------
  // UTILS
  // ---------------------------

  function showStatus(el, msg, isError = false) {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "red" : "green";
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    console.log("📸 Opening modal:", modalEl.id);
    modalEl.classList.add("show");
    modalEl.classList.remove("hidden");
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    console.log("📪 Closing modal:", modalEl.id);
    modalEl.classList.remove("show");
    modalEl.classList.add("hidden");
  }

  // Pressing Enter (except in textarea) submits the modal
  function bindEnterToSave(modalEl, saveBtn) {
    if (!modalEl || !saveBtn) return;
    modalEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }

  // Basic fetch helpers
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
  }

  async function postJSON(url, bodyObj) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json();
  }

  async function putJSON(url, bodyObj) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
    return res.json();
  }

  async function deleteReq(url) {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
    // some deletes may return empty body
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  // multipart/form-data for pets create/update
  async function sendPetFormData(method, url, formData) {
    const res = await fetch(url, {
      method,
      body: formData,
    });
    if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
    return res.json();
  }

  // ---------------------------
  // AUTH
  // ---------------------------

  async function handleAdminLogin(e) {
    e.preventDefault();

    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!username || !password) {
      showStatus(loginStatus, "Please enter username and password.", true);
      return;
    }

    console.log("🔐 Attempting admin login...");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        console.warn("❌ Login HTTP error:", res.status);
        showStatus(loginStatus, `Login failed (${res.status})`, true);
        return;
      }

      const data = await res.json();
      if (data && data.success && data.token) {
        console.log("✅ Admin login successful, token stored.");
        localStorage.setItem("adminToken", data.token);
        showStatus(loginStatus, "Logged in!", false);
        enterDashboard();
      } else {
        console.warn("❌ Invalid credentials from server.");
        showStatus(loginStatus, "Invalid credentials.", true);
      }
    } catch (err) {
      console.error("❌ Login failed:", err);
      showStatus(loginStatus, "Network error.", true);
    }
  }

  function enterDashboard() {
    console.log("📊 Entering Admin Dashboard view...");
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";

    switchTab("pets"); // default tab
    refreshAllData();
  }

  function restoreSession() {
    const token = localStorage.getItem("adminToken");
    if (token) {
      console.log("🔄 Restoring existing admin session...");
      if (loginSection) loginSection.style.display = "none";
      if (dashboardSection) dashboardSection.style.display = "block";
      switchTab("pets");
      refreshAllData();
    } else {
      console.log("🔒 No admin token found, showing login.");
      if (dashboardSection) dashboardSection.style.display = "none";
      if (loginSection) loginSection.style.display = "block";
    }
  }

  function handleLogout() {
    console.log("👋 Logging out admin...");
    localStorage.removeItem("adminToken");
    if (dashboardSection) dashboardSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
    showStatus(loginStatus, "Logged out.");
  }

  // ---------------------------
  // TAB SWITCHING
  // ---------------------------

  function switchTab(tabName) {
    console.log("🗂 Switching to tab:", tabName);

    // highlight tab button
    tabButtons.forEach((btn) => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // show only the right pane
    [petsTabPane, ratesTabPane, contactsTabPane].forEach((pane) => {
      if (!pane) return;
      pane.style.display = "none";
    });

    if (tabName === "pets" && petsTabPane) petsTabPane.style.display = "block";
    if (tabName === "rates" && ratesTabPane) ratesTabPane.style.display = "block";
    if (tabName === "contacts" && contactsTabPane) contactsTabPane.style.display = "block";
    if (tabName === "reviews" && reviewsTabPane) reviewsTabPane.style.display = "block";
  }

  // ---------------------------
  // PETS
  // ---------------------------

  // Load all pets and render cards
  async function loadPets() {
    if (!petListEl) return;
    petListEl.innerHTML = `<div class="loading-msg">Loading pets...</div>`;

    try {
      const pets = await getJSON("/api/pets");
      petsCache = pets; // cache for possible reuse
      console.log("🐶 Loaded pets:", pets);

      petListEl.innerHTML = pets
        .map((pet) => {
          const imgsMarkup = (pet.images || [])
            .sort((a, b) => {
              const ao = a.display_order ?? 0;
              const bo = b.display_order ?? 0;
              return ao - bo;
            })
            .map(
              (img) => `
            <div class="img-box" draggable="true" data-img-id="${img.id}">
              <img src="${img.image_url}" alt="${pet.pet_name || ""}" />
              <button class="delete-image" data-pet-id="${pet.id}" data-img-id="${img.id}" title="Delete this image">🗑</button>
            </div>`
            )
            .join("");

          return `
          <div class="admin-card pet-card" data-pet-id="${pet.id}">
            <div class="pet-card-header">
              <div class="pet-card-left">
                <h4>
                  ${pet.pet_name || "Unnamed"}
                  ${
                    pet.is_dorothy_pet
                      ? `<span class="dorothy-badge">Dorothy's Pet</span>`
                      : ""
                  }
                </h4>
              </div>
              <div class="pet-card-actions">
                <button class="btn-sm edit-pet-btn" data-id="${pet.id}">Edit</button>
                <button class="btn-sm danger delete-pet-btn" data-id="${pet.id}">Delete</button>
              </div>
            </div>

            <p class="pet-story">${pet.story_description || ""}</p>

            <div class="pet-images" data-pet-id="${pet.id}">
              ${
                imgsMarkup ||
                "<div class='no-images'>No images yet</div>"
              }
            </div>
            <div class="hint-row">
              Drag to reorder photos • Click 🗑 to remove photo
            </div>
          </div>`;
        })
        .join("");

      bindPetCardEvents();
    } catch (err) {
      console.error("❌ Failed to load pets:", err);
      petListEl.innerHTML =
        "<div class='error-msg'>Failed to load pets. Please refresh.</div>";
    }
  }

  function bindPetCardEvents() {
    // Edit pet
    petListEl.querySelectorAll(".edit-pet-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const petId = btn.getAttribute("data-id");
        openPetEditor(petId);
      });
    });

    // Delete pet
    petListEl.querySelectorAll(".delete-pet-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const petId = btn.getAttribute("data-id");
        if (!confirm("Delete this pet? This cannot be undone.")) return;
        try {
          console.log("🗑 Deleting pet:", petId);
          await deleteReq(`/api/pets/${petId}`);
          console.log("🗑 Pet deleted, refreshing list...");
          loadPets();
        } catch (err) {
          console.error("❌ Delete pet failed:", err);
          alert("Failed to delete pet.");
        }
      });
    });

    // Delete individual image
    petListEl.querySelectorAll(".delete-image").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = btn.getAttribute("data-pet-id");
        const imgid = btn.getAttribute("data-img-id");
        if (!confirm("Delete this image from the pet?")) return;
        try {
          console.log("🗑 Deleting image:", { pid, imgid });
          await deleteReq(`/api/pets/${pid}/images/${imgid}`);
          console.log("🗑 Image deleted, refreshing pets...");
          loadPets();
        } catch (err) {
          console.error("❌ Delete image failed:", err);
          alert("Failed to delete image.");
        }
      });
    });

    // Enable drag+drop reorder for each .pet-images strip
    petListEl.querySelectorAll(".pet-images").forEach((stripEl) => {
      enableDragReorder(stripEl);
    });
  }

  // Drag/reorder logic
  function enableDragReorder(stripEl) {
    let draggingEl = null;

    stripEl.querySelectorAll(".img-box").forEach((imgBox) => {
      imgBox.addEventListener("dragstart", (e) => {
        draggingEl = imgBox;
        imgBox.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      imgBox.addEventListener("dragend", async () => {
        imgBox.classList.remove("dragging");

        const petId = stripEl.getAttribute("data-pet-id");

        // gather new order from DOM
        const newOrderIds = Array.from(
          stripEl.querySelectorAll(".img-box")
        ).map((el) => el.getAttribute("data-img-id"));

        console.log("↕️ New image order:", newOrderIds);

        try {
          await putJSON(`/api/pets/${petId}/images/reorder`, {
            order: newOrderIds,
          });
          console.log("✅ Reorder saved, refreshing pets...");
          loadPets();
        } catch (err) {
          console.error("❌ Reorder failed:", err);
          alert("Failed to save new image order.");
        }

        draggingEl = null;
      });

      // handle dragging over container
      stripEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        const afterEl = getDragAfterElement(stripEl, e.clientY);
        if (!draggingEl) return;
        if (afterEl == null) {
          stripEl.appendChild(draggingEl);
        } else {
          stripEl.insertBefore(draggingEl, afterEl);
        }
      });
    });
  }

  // figure out before/after insert position
  function getDragAfterElement(container, mouseY) {
    const draggableElements = [
      ...container.querySelectorAll(".img-box:not(.dragging)"),
    ];

    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

    draggableElements.forEach((child) => {
      const box = child.getBoundingClientRect();
      const offset = mouseY - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    });

    return closest.element;
  }

  // Open modal for ADD NEW pet
  function openNewPetModal() {
    currentPetMode = "add";
    console.log("📸 Opening Pet Modal (Add New)");

    // reset form fields
    petIdInput.value = "";
    petNameInput.value = "";
    petStoryInput.value = "";
    petDorothyCheckbox.checked = false;
    if (petImagesInput) petImagesInput.value = "";

    petModalTitle.textContent = "Add New Pet";
    openModal(petModal);
  }

  // Open modal for EDIT pet
  async function openPetEditor(petId) {
    currentPetMode = "edit";
    console.log("📸 Opening Pet Modal (Edit) for pet:", petId);

    try {
      // If you DO have GET /api/pets/:id on backend:
      const pet = await getJSON(`/api/pets/${petId}`);
      // Fallback note: if you didn't, we could pull from petsCache by id.

      petIdInput.value = pet.id;
      petNameInput.value = pet.pet_name || "";
      petStoryInput.value = pet.story_description || "";
      petDorothyCheckbox.checked = !!pet.is_dorothy_pet;

      if (petImagesInput) petImagesInput.value = "";

      petModalTitle.textContent = `Edit ${pet.pet_name || "Pet"}`;
      openModal(petModal);
    } catch (err) {
      console.error("❌ Could not load pet details:", err);
      alert("Could not load pet details for editing.");
    }
  }

  // Save Pet (handles both Add + Edit)
  async function handleSavePet() {
    const petIdVal = petIdInput.value.trim();
    const isEdit = currentPetMode === "edit" && petIdVal;

    const formData = new FormData();
    formData.append("pet_name", petNameInput.value.trim());
    formData.append("story_description", petStoryInput.value.trim());
    formData.append(
      "is_dorothy_pet",
      petDorothyCheckbox.checked ? "true" : "false"
    );

    // add any newly selected images
    if (petImagesInput.files && petImagesInput.files.length > 0) {
      Array.from(petImagesInput.files).forEach((file) => {
        formData.append("images", file);
      });
    }

    try {
      if (isEdit) {
        console.log("💾 Updating pet:", petIdVal);
        await sendPetFormData("PUT", `/api/pets/${petIdVal}`, formData);
      } else {
        console.log("💾 Creating new pet…");
        await sendPetFormData("POST", "/api/pets", formData);
      }

      console.log("🐶 Pet saved successfully!");
      closeModal(petModal);
      loadPets(); // refresh list so UI is current
    } catch (err) {
      console.error("❌ Save pet failed:", err);
      alert("Could not save pet.");
    }
  }

  // ---------------------------
  // RATES
  // ---------------------------

  async function loadRates() {
    if (!rateListEl) return;
    rateListEl.innerHTML = `<div class="loading-msg">Loading rates...</div>`;

    try {
      const rates = await getJSON("/api/rates");
      ratesCache = rates;
      console.log("💲 Loaded rates:", rates);

      rateListEl.innerHTML = rates
        .map((rate) => {
          return `
          <div class="admin-card rate-card" data-rate-id="${rate.id}">
            <div class="rate-card-header">
              <div class="rate-card-left">
                <h4>
                  ${rate.service_type || "New Service"}
                  ${
                    rate.is_featured
                      ? `<span class="featured-badge">Featured</span>`
                      : ""
                  }
                </h4>
              </div>
              <div class="rate-card-actions">
                <button class="btn-sm edit-rate-btn" data-id="${rate.id}">Edit</button>
                <button class="btn-sm danger delete-rate-btn" data-id="${rate.id}">Delete</button>
              </div>
            </div>

            <div class="rate-body">
              <div class="rate-line">
                <span class="rate-amount">$${Number(
                  rate.rate_per_unit
                ).toFixed(2)}</span>
                <span class="rate-unit">${rate.unit_type || ""}</span>
              </div>
              <p class="rate-desc">${rate.description || ""}</p>
              <div class="rate-flags">
                ${
                  rate.is_active
                    ? `<span class="flag-active">Active</span>`
                    : `<span class="flag-inactive">Inactive</span>`
                }
              </div>
            </div>
          </div>`;
        })
        .join("");

      bindRateCardEvents();
    } catch (err) {
      console.error("❌ Failed to load rates:", err);
      rateListEl.innerHTML =
        "<div class='error-msg'>Failed to load rates. Please refresh.</div>";
    }
  }

  function bindRateCardEvents() {
    // Edit rate
    rateListEl.querySelectorAll(".edit-rate-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rid = btn.getAttribute("data-id");
        openRateEditor(rid);
      });
    });

    // Delete rate
    rateListEl.querySelectorAll(".delete-rate-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const rid = btn.getAttribute("data-id");
        if (!confirm("Delete this rate?")) return;
        try {
          console.log("🗑 Deleting rate:", rid);
          await deleteReq(`/api/rates/${rid}`);
          console.log("🗑 Rate deleted, refreshing…");
          loadRates();
        } catch (err) {
          console.error("❌ Delete rate failed:", err);
          alert("Failed to delete rate.");
        }
      });
    });
  }

  // Open modal for ADD NEW rate
  function openNewRateModal() {
    currentRateMode = "add";
    console.log("💲 Opening Rate Modal (Add New)");

    rateModalTitle.textContent = "Add New Rate";
    rateIdInput.value = "";
    serviceTypeInput.value = "";
    ratePerUnitInput.value = "";
    unitTypeInput.value = "per_visit";
    rateDescriptionInput.value = "";
    featuredRateCheckbox.checked = false;

    openModal(rateModal);
  }

  // Open modal for EDIT rate
  async function openRateEditor(rateIdVal) {
    currentRateMode = "edit";
    console.log("💲 Opening Rate Modal (Edit) for rate:", rateIdVal);

    // Try backend GET /api/rates/:id first
    let rateData = null;
    try {
      rateData = await getJSON(`/api/rates/${rateIdVal}`);
    } catch (err) {
      console.warn(
        "⚠️ GET /api/rates/:id failed, trying cache as fallback.",
        err
      );
      // fallback to cached list
      rateData = ratesCache.find((r) => String(r.id) === String(rateIdVal));
      if (!rateData) {
        console.error("❌ Could not find rate in cache either.");
        alert("Could not load rate details.");
        return;
      }
    }

    rateModalTitle.textContent = `Edit ${rateData.service_type || "Rate"}`;
    rateIdInput.value = rateData.id || "";
    serviceTypeInput.value = rateData.service_type || "";
    ratePerUnitInput.value = rateData.rate_per_unit || "";
    unitTypeInput.value = rateData.unit_type || "per_visit";
    rateDescriptionInput.value = rateData.description || "";
    featuredRateCheckbox.checked = !!rateData.is_featured;

    openModal(rateModal);
  }

  // Save Rate (Add or Edit)
  async function handleSaveRate() {
    const rid = rateIdInput.value.trim();
    const isEdit = currentRateMode === "edit" && rid;

    const payload = {
      service_type: serviceTypeInput.value.trim(),
      rate_per_unit: parseFloat(ratePerUnitInput.value || "0"),
      unit_type: unitTypeInput.value,
      description: rateDescriptionInput.value.trim(),
      is_featured: featuredRateCheckbox.checked,
      is_active: true, // keep active=true by default
    };

    try {
      if (isEdit) {
        console.log("💾 Updating rate:", rid, payload);
        await putJSON(`/api/rates/${rid}`, payload);
      } else {
        console.log("💾 Creating new rate:", payload);
        await postJSON("/api/rates", payload);
      }

      console.log("💲 Rate saved successfully!");
      closeModal(rateModal);
      loadRates();
    } catch (err) {
      console.error("❌ Save rate failed:", err);
      alert("Could not save rate.");
    }
  }

// Close modal when clicking cancel button
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const modalId = e.target.getAttribute("data-close");
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      console.log("🪟 Closing modal via cancel button:", modalId);
      modalEl.classList.remove("show");
      modalEl.classList.add("hidden");
    }
  });
});
  
  // ---------------------------
  // CONTACTS
  // ---------------------------

  async function loadContacts() {
    if (!contactListEl) return;
    contactListEl.innerHTML = `<div class="loading-msg">Loading contacts...</div>`;

    try {
      // Backend returns only NOT contacted, sorted oldest -> newest.
      const data = await getJSON("/api/contacts");
      contactsCache = data;
      console.log("📬 Loaded contacts:", data);

      if (!Array.isArray(data) || data.length === 0) {
        contactListEl.innerHTML =
          "<div class='empty-msg'>All caught up! 🐾 No pending contacts.</div>";
        return;
      }

      contactListEl.innerHTML = data
        .map((c) => {
          const createdDisplay = c.created_at
            ? new Date(c.created_at).toLocaleString()
            : "";

          return `
          <div class="admin-card contact-card" data-contact-id="${c.id}">
            <div class="contact-card-header">
              <div class="contact-left">
                <h4>${c.name || "No name"}</h4>
                <div class="contact-meta">
                  <span>${c.phone || ""}</span>
                  <span>${c.email || ""}</span>
                </div>
              </div>
              <div class="contact-right">
                <div class="contact-date">Requested: ${createdDisplay}</div>
                <button class="btn-sm mark-contacted-btn" data-id="${
                  c.id
                }">Mark Contacted ✅</button>
              </div>
            </div>

            <div class="contact-body">
              <div><strong>Service:</strong> ${c.service || ""}</div>
              <div><strong>Dates:</strong> ${c.start_date || ""} - ${
            c.end_date || ""
          }</div>
              <div><strong>Message:</strong> ${c.message || ""}</div>
            </div>
          </div>`;
        })
        .join("");

      contactListEl
        .querySelectorAll(".mark-contacted-btn")
        .forEach((btn) => {
          btn.addEventListener("click", async () => {
            const cid = btn.getAttribute("data-id");
            if (!confirm("Mark this contact request as handled?")) return;
            try {
              console.log("📧 Marking contact as contacted:", cid);
              await putJSON(`/api/contacts/${cid}/contacted`, {
                contacted: true,
              });
              console.log("📧 Contact marked, refreshing contacts…");
              loadContacts();
            } catch (err) {
              console.error("❌ Could not mark contacted:", err);
              alert("Could not update contact status.");
            }
          });
        });
    } catch (err) {
      console.error("❌ Failed to load contacts:", err);
      contactListEl.innerHTML =
        "<div class='error-msg'>Failed to load contact requests. Please refresh.</div>";
    }
  }

// ---------- ADMIN: REVIEWS ----------

async function loadAdminReviews() {
  const container = document.getElementById("adminReviewList");
  if (!container) return;

  try {
    const res = await fetch("/api/admin/reviews");
    const reviews = await res.json();

    if (!reviews.length) {
      container.innerHTML = `<p class="muted-text">No reviews submitted yet.</p>`;
      return;
    }

    container.innerHTML = reviews
      .map((r) => {
        const date = r.created_at
          ? new Date(r.created_at).toLocaleDateString()
          : "";
        return `
        <div class="admin-review-card ${
          r.approved ? "approved" : "pending"
        }">
          <div class="admin-review-header">
            <h4>${r.customer_name}</h4>
            <span class="admin-review-rating">⭐ ${r.rating}/5</span>
          </div>
          <p class="admin-review-text">${r.review_text}</p>
          ${
            date
              ? `<p class="admin-review-date">Submitted on ${date}</p>`
              : ""
          }
          <div class="admin-review-actions">
            ${
              r.approved
                ? `<span class="badge badge-approved">Approved</span>`
                : `<button class="btn-primary" onclick="approveReview(${r.id})">Approve</button>`
            }
            <button class="btn-danger" onclick="deleteReview(${r.id})">Delete</button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading admin reviews:", err);
    container.innerHTML = `<p class="error">Failed to load reviews.</p>`;
  }
}

async function approveReview(id) {
  try {
    const res = await fetch(`/api/admin/reviews/${id}/approve`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to approve");
    await loadAdminReviews();
  } catch (err) {
    console.error("Error approving review:", err);
    alert("Error approving review.");
  }
}

async function deleteReview(id) {
  if (!confirm("Are you sure you want to delete this review?")) return;

  try {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");
    await loadAdminReviews();
  } catch (err) {
    console.error("Error deleting review:", err);
    alert("Error deleting review.");
  }
}

  // ---------------------------
  // GLOBAL REFRESH
  // ---------------------------

  function refreshAllData() {
    console.log("🔄 Refreshing all admin data…");
    loadPets();
    loadRates();
    loadContacts();
    loadAdminReviews();
  }

  // ✅ Export review actions for inline onclicks
  window.approveReview = approveReview;
  window.deleteReview = deleteReview;
  
  
  // ---------------------------
  // EVENT BINDINGS
  // ---------------------------

  function bindEvents() {
    // Login form submit
    if (loginForm) {
      loginForm.addEventListener("submit", handleAdminLogin);
    }

    // Logout click
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    // Tab button clicks
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-tab");
        switchTab(t);
      });
    });

    // Add Pet
    if (addPetBtn) {
      addPetBtn.addEventListener("click", () => {
        openNewPetModal();
      });
    }

    // Add Rate
    if (addRateBtn) {
      addRateBtn.addEventListener("click", () => {
        openNewRateModal();
      });
    }

    // Pet modal actions
    if (closePetModalBtn) {
      closePetModalBtn.addEventListener("click", () => closeModal(petModal));
    }
    if (savePetBtn) {
      savePetBtn.addEventListener("click", handleSavePet);
    }

    // Rate modal actions
    if (closeRateModalBtn) {
      closeRateModalBtn.addEventListener("click", () => closeModal(rateModal));
    }
    if (saveRateBtn) {
      saveRateBtn.addEventListener("click", handleSaveRate);
    }

    // Enter-to-save in modals
    bindEnterToSave(petModal, savePetBtn);
    bindEnterToSave(rateModal, saveRateBtn);
  }

  // ---------------------------
  // INIT
  // ---------------------------

  bindEvents();
  restoreSession(); // either show login or dashboard + data
})();
