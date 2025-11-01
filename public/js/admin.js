/* 
 * DotsofLove Admin UI - Final
 * 💜 Version banner for debugging:
 *    console.log("💜 DotsofLove Admin UI Loaded - vFinal");
 *
 * Features:
 *  - Admin login + session restore
 *  - Tab switching (Pets / Rates / Contacts)
 *  - Pets CRUD:
 *      - Add/Edit pet in modal (no browser prompts)
 *      - Upload images (multi-file)
 *      - Delete image
 *      - Drag to reorder images -> auto-saves order to backend
 *      - Delete full pet
 *  - Rates CRUD:
 *      - Add/Edit rate in modal (no browser prompts)
 *      - Delete rate
 *  - Contacts queue:
 *      - Shows only un-contacted requests (sorted oldest→newest)
 *      - "Mark Contacted" button removes from queue
 *  - Instant pop-in modals
 *  - Pressing Enter in a modal = Save
 *
 * Assumptions about backend routes (as implemented on Railway):
 *  - POST   /api/admin/auth                      { username, password }
 *  - GET    /api/pets
 *  - GET    /api/pets/:petId
 *  - POST   /api/pets                            multipart/form-data (pet_name, story_description, is_dorothy_pet, images[])
 *  - PUT    /api/pets/:petId                     multipart/form-data (same fields; images[] optional)
 *  - DELETE /api/pets/:petId
 *  - DELETE /api/pets/:petId/images/:imageId
 *  - PUT    /api/pets/:petId/images/reorder      JSON { order: [imageId1, imageId2, ...] }
 *
 *  - GET    /api/rates
 *  - POST   /api/rates                           JSON { service_type, rate_per_unit, unit_type, description, is_featured, is_active }
 *  - PUT    /api/rates/:rateId                   same JSON
 *  - DELETE /api/rates/:rateId
 *
 *  - GET    /api/contacts                        returns open/uncontacted only
 *  - PUT    /api/contacts/:contactId/contacted   JSON { contacted: true }
 *
 * Required HTML IDs/classes from index.html:
 *  #adminLogin, #adminLoginForm, #adminUsername, #adminPassword, #adminLoginStatus
 *  #admin, #logoutBtn
 *  .admin-tabs .tab-btn[data-tab="pets"|...]
 *  #tab-pets, #tab-rates, #tab-contacts
 *  #petList, #rateList, #contactList
 *  #addPetBtn, #addRateBtn
 *  #petModal, #closePetModal, #petForm,
 *    #petModalTitle, #petId, #petName, #storyDescription, #isDorothyPet, #petImages, #savePetBtn
 *  #rateModal (if present), #closeRateModal, #rateForm,
 *    #rateModalTitle, #rateId, #serviceType, #ratePerUnit, #unitType, #rateDescription,
 *    #isFeaturedRate, #saveRateBtn
 *
 *  Thumbnail markup is generated dynamically. Each pet card:
 *    <div class="img-box" draggable="true" data-img-id="IMAGE_ID">
 *      <img src="..." />
 *      <button class="delete-image" data-pet-id="PET_ID" data-img-id="IMAGE_ID">🗑</button>
 *    </div>
 *  The container for those is:
 *    <div class="pet-images" data-pet-id="PET_ID"></div>
 *
 *  Dragging and dropping within .pet-images will auto-save new order.
 */

console.log("💜 DotsofLove Admin UI Loaded - vFinal");

(function () {
  // ==========================
  // Cached DOM refs
  // ==========================
  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");

  const loginForm = document.getElementById("adminLoginForm");
  const loginStatus = document.getElementById("adminLoginStatus");
  const logoutBtn = document.getElementById("logoutBtn");

  const tabButtons = document.querySelectorAll(".admin-tabs .tab-btn");
  const petsTabPane = document.getElementById("tab-pets");
  const ratesTabPane = document.getElementById("tab-rates");
  const contactsTabPane = document.getElementById("tab-contacts");

  const petListEl = document.getElementById("petList");
  const rateListEl = document.getElementById("rateList");
  const contactListEl = document.getElementById("contactList");

  const addPetBtn = document.getElementById("addPetBtn");
  const addRateBtn = document.getElementById("addRateBtn");

  // Pet modal elements
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

  // Rate modal elements (may exist in your HTML; if not, you can add it)
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

  // State
  let currentPetMode = "add"; // "add" or "edit"
  let currentRateMode = "add"; // "add" or "edit"

  // ==========================
  // Utility helpers
  // ==========================

  function showStatus(el, msg, isError = false) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "red" : "green";
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("hidden");
    modalEl.classList.add("show"); // .show just sets display:flex in CSS
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.classList.remove("show");
  }

  // Handy: press Enter inside a modal = click save
  function bindEnterToSave(modalEl, saveBtn) {
    if (!modalEl || !saveBtn) return;
    modalEl.addEventListener("keydown", (e) => {
      // only submit on Enter if focused element is not a textarea (so you can still type multi-line text)
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        saveBtn.click();
      }
    });
  }

  // Active tab switching inside Admin dashboard
  function switchTab(tabName) {
    // remove .active from all tab buttons
    tabButtons.forEach((btn) => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // hide all tab panes except chosen
    [petsTabPane, ratesTabPane, contactsTabPane].forEach((pane) => {
      if (!pane) return;
      pane.style.display = "none";
    });

    if (tabName === "pets" && petsTabPane) {
      petsTabPane.style.display = "block";
    }
    if (tabName === "rates" && ratesTabPane) {
      ratesTabPane.style.display = "block";
    }
    if (tabName === "contacts" && contactsTabPane) {
      contactsTabPane.style.display = "block";
    }
  }

  // Re-usable fetch helpers
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return await res.json();
  }

  async function postJSON(url, bodyObj) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return await res.json();
  }

  async function putJSON(url, bodyObj) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
    return await res.json();
  }

  async function deleteReq(url) {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
    return await res.json().catch(() => ({}));
  }

  // Multipart/form-data for pets add/edit
  async function sendPetFormData(method, url, formData) {
    const res = await fetch(url, {
      method,
      body: formData, // no headers, browser sets boundary
    });
    if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
    return await res.json();
  }

  // ==========================
  // AUTH FLOW
  // ==========================

  async function handleAdminLogin(e) {
    e.preventDefault();
    if (!loginForm) return;

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!username || !password) {
      showStatus(loginStatus, "Please enter username and password.", true);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        showStatus(loginStatus, `Login failed (${res.status})`, true);
        return;
      }

      const data = await res.json();
      if (data && data.success && data.token) {
        // Store session token for later checks (even if backend doesn't require yet)
        localStorage.setItem("adminToken", data.token);
        showStatus(loginStatus, "Logged in!", false);
        enterDashboard();
      } else {
        showStatus(loginStatus, "Invalid credentials.", true);
      }
    } catch (err) {
      console.error("Login error:", err);
      showStatus(loginStatus, "Network error.", true);
    }
  }

  function enterDashboard() {
    // Hide login, show admin
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";

    // default to pets tab
    switchTab("pets");

    // Load all data
    loadPets();
    loadRates();
    loadContacts();
  }

  function restoreSession() {
    const token = localStorage.getItem("adminToken");
    if (token) {
      // assume still valid
      if (loginSection) loginSection.style.display = "none";
      if (dashboardSection) dashboardSection.style.display = "block";
      switchTab("pets");
      loadPets();
      loadRates();
      loadContacts();
    } else {
      // not logged in
      if (dashboardSection) dashboardSection.style.display = "none";
      if (loginSection) loginSection.style.display = "block";
    }
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    // reset UI
    if (dashboardSection) dashboardSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
    showStatus(loginStatus, "Logged out.");
  }

  // ==========================
  // PETS
  // ==========================

  // Render pets into #petList
  async function loadPets() {
    if (!petListEl) return;
    petListEl.innerHTML = `<div class="loading-msg">Loading pets...</div>`;

    try {
      const pets = await getJSON("/api/pets");

      // Each pet: {id, pet_name, story_description, is_dorothy_pet, images:[{id,image_url,display_order}]}
      petListEl.innerHTML = pets
        .map((pet) => {
          const imgs = (pet.images || [])
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map(
              (img) => `
            <div class="img-box" draggable="true" data-img-id="${img.id}">
              <img src="${img.image_url}" alt="${pet.pet_name}" />
              <button class="delete-image" data-pet-id="${pet.id}" data-img-id="${img.id}">🗑</button>
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
              ${imgs || "<div class='no-images'>No images yet</div>"}
            </div>
            <div class="hint-row">Drag to reorder photos • Click 🗑 to remove a photo</div>
          </div>`;
        })
        .join("");

      // bind buttons after render
      petListEl.querySelectorAll(".edit-pet-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          openPetEditor(id);
        });
      });

      petListEl.querySelectorAll(".delete-pet-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!confirm("Delete this pet? This cannot be undone.")) return;
          try {
            await deleteReq(`/api/pets/${id}`);
            loadPets(); // refresh list
          } catch (err) {
            console.error("Delete pet failed:", err);
            alert("Failed to delete pet.");
          }
        });
      });

      petListEl.querySelectorAll(".delete-image").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const pid = btn.getAttribute("data-pet-id");
          const imgid = btn.getAttribute("data-img-id");
          if (!confirm("Delete this image from the pet?")) return;
          try {
            await deleteReq(`/api/pets/${pid}/images/${imgid}`);
            loadPets(); // refresh list
          } catch (err) {
            console.error("Delete image failed:", err);
            alert("Failed to delete image.");
          }
        });
      });

      // enable drag reorder
      petListEl
        .querySelectorAll(".pet-images")
        .forEach((stripEl) => enableDragReorder(stripEl));
    } catch (err) {
      console.error("❌ Failed to load pets:", err);
      petListEl.innerHTML =
        "<div class='error-msg'>Failed to load pets. Please refresh.</div>";
    }
  }

  // Drag+drop handler: attaches drag logic to a .pet-images container
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
        // gather new order
        const ids = Array.from(stripEl.querySelectorAll(".img-box")).map((el) =>
          el.getAttribute("data-img-id")
        );

        try {
          await putJSON(`/api/pets/${petId}/images/reorder`, { order: ids });
          // auto refresh so display_order matches DB
          loadPets();
        } catch (err) {
          console.error("Reorder failed:", err);
          alert("Failed to save new image order.");
        }

        draggingEl = null;
      });

      // allow dropping into this same container
      stripEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(stripEl, e.clientX, e.clientY);
        if (!draggingEl) return;
        if (afterElement == null) {
          stripEl.appendChild(draggingEl);
        } else {
          stripEl.insertBefore(draggingEl, afterElement);
        }
      });
    });
  }

  // figure out where to insert while dragging
  function getDragAfterElement(container, x, y) {
    const draggableElements = [
      ...container.querySelectorAll(".img-box:not(.dragging)"),
    ];

    // We'll do center distance calc
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    draggableElements.forEach((child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);

      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    });

    return closest.element;
  }

  // Open the Pet modal in "add" mode
  function openNewPetModal() {
    currentPetMode = "add";
    if (!petForm) return;
    petModalTitle.textContent = "Add New Pet";

    petIdInput.value = "";
    petNameInput.value = "";
    petStoryInput.value = "";
    petDorothyCheckbox.checked = false;
    if (petImagesInput) petImagesInput.value = ""; // clear chosen files

    openModal(petModal);
  }

  // Open the Pet modal in "edit" mode and populate with existing data
  async function openPetEditor(petId) {
    currentPetMode = "edit";

    try {
      const pet = await getJSON(`/api/pets/${petId}`);

      // fill form fields
      petIdInput.value = pet.id;
      petNameInput.value = pet.pet_name || "";
      petStoryInput.value = pet.story_description || "";
      petDorothyCheckbox.checked = !!pet.is_dorothy_pet;
      if (petImagesInput) petImagesInput.value = ""; // don't pre-fill files

      petModalTitle.textContent = `Edit ${pet.pet_name || "Pet"}`;
      openModal(petModal);
    } catch (err) {
      console.error("Failed to load pet for edit:", err);
      alert("Could not load pet details.");
    }
  }

  // Save Pet (Add or Edit)
  async function handleSavePet() {
    if (!petForm) return;

    const id = petIdInput.value.trim();
    const isEdit = currentPetMode === "edit" && id;

    // Build multipart FormData
    const formData = new FormData();
    formData.append("pet_name", petNameInput.value.trim());
    formData.append(
      "story_description",
      petStoryInput.value.trim() || ""
    );
    formData.append(
      "is_dorothy_pet",
      petDorothyCheckbox.checked ? "true" : "false"
    );

    // append new images (zero or many)
    if (petImagesInput && petImagesInput.files && petImagesInput.files.length) {
      Array.from(petImagesInput.files).forEach((file) => {
        formData.append("images", file);
      });
    }

    try {
      if (isEdit) {
        await sendPetFormData("PUT", `/api/pets/${id}`, formData);
      } else {
        await sendPetFormData("POST", "/api/pets", formData);
      }

      closeModal(petModal);
      loadPets(); // refresh list after save
    } catch (err) {
      console.error("Save pet failed:", err);
      alert("Could not save pet.");
    }
  }

  // ==========================
  // RATES
  // ==========================

  async function loadRates() {
    if (!rateListEl) return;
    rateListEl.innerHTML = `<div class="loading-msg">Loading rates...</div>`;

    try {
      const rates = await getJSON("/api/rates");
      // We’ll assume backend returns array of:
      // { id, service_type, rate_per_unit, unit_type, description, is_featured, is_active }

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

      // bind actions
      rateListEl.querySelectorAll(".edit-rate-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const rid = btn.getAttribute("data-id");
          openRateEditor(rid);
        });
      });

      rateListEl.querySelectorAll(".delete-rate-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const rid = btn.getAttribute("data-id");
          if (!confirm("Delete this rate?")) return;
          try {
            await deleteReq(`/api/rates/${rid}`);
            loadRates();
          } catch (err) {
            console.error("Delete rate failed:", err);
            alert("Failed to delete rate.");
          }
        });
      });
    } catch (err) {
      console.error("❌ Failed to load rates:", err);
      rateListEl.innerHTML =
        "<div class='error-msg'>Failed to load rates. Please refresh.</div>";
    }
  }

  // open modal for new rate
  function openNewRateModal() {
    currentRateMode = "add";
    if (!rateModal) return;
    if (rateModalTitle) rateModalTitle.textContent = "Add New Rate";

    // reset form fields
    if (rateIdInput) rateIdInput.value = "";
    if (serviceTypeInput) serviceTypeInput.value = "";
    if (ratePerUnitInput) ratePerUnitInput.value = "";
    if (unitTypeInput) unitTypeInput.value = "per_visit";
    if (rateDescriptionInput) rateDescriptionInput.value = "";
    if (featuredRateCheckbox) featuredRateCheckbox.checked = false;

    openModal(rateModal);
  }

  // open modal for editing rate
  async function openRateEditor(rateId) {
    currentRateMode = "edit";
    if (!rateModal) return;

    try {
      const rate = await getJSON(`/api/rates/${rateId}`);

      if (rateIdInput) rateIdInput.value = rate.id;
      if (serviceTypeInput) serviceTypeInput.value = rate.service_type || "";
      if (ratePerUnitInput)
        ratePerUnitInput.value = rate.rate_per_unit || "";
      if (unitTypeInput) unitTypeInput.value = rate.unit_type || "per_visit";
      if (rateDescriptionInput)
        rateDescriptionInput.value = rate.description || "";
      if (featuredRateCheckbox)
        featuredRateCheckbox.checked = !!rate.is_featured;

      if (rateModalTitle)
        rateModalTitle.textContent = `Edit ${rate.service_type || "Rate"}`;

      openModal(rateModal);
    } catch (err) {
      console.error("Failed to load rate for edit:", err);
      alert("Could not load rate details.");
    }
  }

  // Save Rate (Add or Edit)
  async function handleSaveRate() {
    if (!rateForm) return;

    const rid = rateIdInput ? rateIdInput.value.trim() : "";
    const isEdit = currentRateMode === "edit" && rid;

    const payload = {
      service_type: serviceTypeInput.value.trim(),
      rate_per_unit: parseFloat(ratePerUnitInput.value || "0"),
      unit_type: unitTypeInput.value,
      description: rateDescriptionInput.value.trim(),
      is_featured: featuredRateCheckbox ? featuredRateCheckbox.checked : false,
      is_active: true, // we keep true by default for now
    };

    try {
      if (isEdit) {
        await putJSON(`/api/rates/${rid}`, payload);
      } else {
        await postJSON("/api/rates", payload);
      }

      closeModal(rateModal);
      loadRates(); // refresh UI
    } catch (err) {
      console.error("Save rate failed:", err);
      alert("Could not save rate.");
    }
  }

  // ==========================
  // CONTACT REQUESTS
  // ==========================

  async function loadContacts() {
    if (!contactListEl) return;
    contactListEl.innerHTML = `<div class="loading-msg">Loading contacts...</div>`;

    try {
      // We assume backend returns ONLY un-contacted in chronological order (oldest first),
      // shaped like:
      // {
      //   id, name, email, phone,
      //   service, start_date, end_date,
      //   message, created_at
      // }
      const contacts = await getJSON("/api/contacts");

      if (!Array.isArray(contacts) || !contacts.length) {
        contactListEl.innerHTML =
          "<div class='empty-msg'>All caught up! 🐾 No pending contacts.</div>";
        return;
      }

      contactListEl.innerHTML = contacts
        .map((c) => {
          const created = c.created_at
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
                <div class="contact-date">Requested: ${created}</div>
                <button class="btn-sm mark-contacted-btn" data-id="${c.id}">
                  Mark Contacted ✅
                </button>
              </div>
            </div>

            <div class="contact-body">
              <div><strong>Service:</strong> ${c.service || ""}</div>
              <div><strong>Dates:</strong> ${(c.start_date || "")} - ${(c.end_date || "")}</div>
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
              await putJSON(`/api/contacts/${cid}/contacted`, {
                contacted: true,
              });
              loadContacts(); // refresh list
            } catch (err) {
              console.error("Mark contacted failed:", err);
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

  // ==========================
  // EVENT BINDINGS
  // ==========================

  function bindEvents() {
    // Login submit
    if (loginForm) {
      loginForm.addEventListener("submit", handleAdminLogin);
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    // Tabs
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        switchTab(tabName);
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

    // Pet modal close / save
    if (closePetModalBtn) {
      closePetModalBtn.addEventListener("click", () => closeModal(petModal));
    }
    if (savePetBtn) {
      savePetBtn.addEventListener("click", handleSavePet);
    }

    // Rate modal close / save
    if (closeRateModalBtn) {
      closeRateModalBtn.addEventListener("click", () =>
        closeModal(rateModal)
      );
    }
    if (saveRateBtn) {
      saveRateBtn.addEventListener("click", handleSaveRate);
    }

    // Enter-to-save inside modals
    bindEnterToSave(petModal, savePetBtn);
    bindEnterToSave(rateModal, saveRateBtn);
  }

  // ==========================
  // INIT
  // ==========================

  bindEvents();
  restoreSession(); // decide whether to show login or dashboard
})();
