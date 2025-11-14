// admin.js
// Admin Dashboard Script for Dot's of Love Pet Sitting
// - Handles admin auth (client-side token gate)
// - Manages Pets, Rates, Contacts, Reviews admin panels
// - Uses existing backend API routes
// - CommonJS-friendly (no ES module syntax)

(function () {
  const API_BASE = "/api";

  // --------------------------
  // DOM ELEMENTS
  // --------------------------
  const adminNav = document.getElementById("adminNav");
  const adminSection = document.getElementById("admin");
  const logoutBtn = document.getElementById("logoutBtn");

  const adminPetsPanel = document.getElementById("adminPets");
  const adminRatesPanel = document.getElementById("adminRates");
  const adminContactsPanel = document.getElementById("adminContacts");
  const adminReviewsPanel = document.getElementById("adminReviews");

  const adminTabButtons = Array.from(document.querySelectorAll(".admin-tab"));

  // Admin auth token (purely client-side gate)
  let adminToken = localStorage.getItem("adminToken") || null;
  let adminInitialized = false;

  // ======================================================================
  // AUTH: LOGIN MODAL
  // ======================================================================

  function createLoginModal() {
    // Only create once
    if (document.getElementById("adminLoginModal")) return;

    const modal = document.createElement("div");
    modal.id = "adminLoginModal";
    modal.className = "modal";

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Admin Login</h3>
          <button class="close-btn" data-close="adminLoginModal">×</button>
        </div>
        <div class="modal-body">
          <label for="adminLoginUser">Username</label>
          <input type="text" id="adminLoginUser" autocomplete="username" />
          <label for="adminLoginPass">Password</label>
          <input type="password" id="adminLoginPass" autocomplete="current-password" />
          <p id="adminLoginError" style="color:#ff4e53; font-size:0.9rem; min-height:1.2em; margin-top:6px;"></p>
          <div style="margin-top: 12px; display:flex; gap:10px; justify-content:flex-end;">
            <button id="adminLoginSubmit" class="btn-primary">Login</button>
            <button class="btn-danger" data-close="adminLoginModal">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal || evt.target.dataset.close === "adminLoginModal") {
        closeLoginModal();
      }
    });
  }

  function openLoginModal() {
    createLoginModal();
    const modal = document.getElementById("adminLoginModal");
    const userInput = document.getElementById("adminLoginUser");
    const passInput = document.getElementById("adminLoginPass");
    const errorEl = document.getElementById("adminLoginError");

    if (!modal) return;
    modal.classList.add("active");

    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    if (errorEl) errorEl.textContent = "";

    setTimeout(() => {
      userInput?.focus();
    }, 50);
  }

  function closeLoginModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.classList.remove("active");
  }

  async function handleAdminLogin() {
    const userEl = document.getElementById("adminLoginUser");
    const passEl = document.getElementById("adminLoginPass");
    const errorEl = document.getElementById("adminLoginError");

    if (!userEl || !passEl) return;

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    if (!username || !password) {
      if (errorEl) errorEl.textContent = "Please enter username and password.";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Admin login error:", res.status, text);
        if (errorEl) errorEl.textContent = "Invalid credentials or server error.";
        return;
      }

      const data = await res.json();
      if (data && data.success) {
        adminToken = data.token || "admin-token";
        localStorage.setItem("adminToken", adminToken);
        closeLoginModal();
        showAdminDashboard();
      } else {
        if (errorEl) errorEl.textContent = "Invalid credentials.";
      }
    } catch (err) {
      console.error("Admin login request failed:", err);
      if (errorEl) errorEl.textContent = "Network error.";
    }
  }

  // Prompt for login, then show admin if successful
  function requireAdminAuth() {
    if (adminToken) {
      showAdminDashboard();
      return;
    }
    openLoginModal();
  }

  // ======================================================================
  // ADMIN DASHBOARD INITIALIZATION + TABS
  // ======================================================================

  function showAdminDashboard() {
    if (!adminSection) return;
    adminSection.style.display = "block";

    if (!adminInitialized) {
      initAdminDashboard();
      adminInitialized = true;
    }

    // Default tab: pets
    activateAdminTab("adminPets");
    loadPetsAdmin();
    // Scroll into view
    adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initAdminDashboard() {
    // Hook up login modal submit
    const loginSubmitBtn = document.getElementById("adminLoginSubmit");
    if (loginSubmitBtn) {
      loginSubmitBtn.addEventListener("click", handleAdminLogin);
    }
    // Also handle Enter key in login modal
    document.addEventListener("keydown", (evt) => {
      const modal = document.getElementById("adminLoginModal");
      if (modal && modal.classList.contains("active") && evt.key === "Enter") {
        evt.preventDefault();
        handleAdminLogin();
      }
    });

    // Admin tab switching
    adminTabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetSection = btn.getAttribute("data-section");
        if (targetSection) {
          activateAdminTab(targetSection);

          if (targetSection === "adminPets") loadPetsAdmin();
          if (targetSection === "adminRates") loadRatesAdmin();
          if (targetSection === "adminContacts") loadContactsAdmin();
          if (targetSection === "adminReviews") loadReviewsAdmin();
        }
      });
    });

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("adminToken");
        adminToken = null;
        if (adminSection) {
          adminSection.style.display = "none";
        }
        alert("Logged out.");
      });
    }
  }

  function activateAdminTab(sectionId) {
    // Highlight tab
    adminTabButtons.forEach((btn) => {
      const isActive = btn.getAttribute("data-section") === sectionId;
      btn.classList.toggle("active", isActive);
    });

    // Show only the chosen admin panel
    const panels = [
      adminPetsPanel,
      adminRatesPanel,
      adminContactsPanel,
      adminReviewsPanel,
    ];

    panels.forEach((panel) => {
      if (!panel) return;
      if (panel.id === sectionId) {
        panel.style.display = "block";
      } else {
        panel.style.display = "none";
      }
    });
  }

  // ======================================================================
  // PETS ADMIN
  // ======================================================================

  async function loadPetsAdmin() {
    if (!adminPetsPanel) return;
    adminPetsPanel.innerHTML = "<p>Loading pets...</p>";

    try {
      const res = await fetch(`${API_BASE}/pets`);
      if (!res.ok) throw new Error("Failed to load pets");
      const pets = await res.json();

      if (!pets || pets.length === 0) {
        adminPetsPanel.innerHTML = `
          <div class="admin-card">
            <p>No pets in the gallery yet.</p>
            <button class="btn-primary" id="adminAddPetBtn">Add First Pet</button>
          </div>
        `;
        const addBtn = document.getElementById("adminAddPetBtn");
        if (addBtn) addBtn.addEventListener("click", () => openPetForm());
        return;
      }

      const htmlParts = [];
      htmlParts.push(`
        <div style="text-align:right; margin-bottom:12px;">
          <button class="btn-primary" id="adminAddPetBtn">Add New Pet</button>
        </div>
      `);

      pets.forEach((pet) => {
        const isDorothy = pet.is_dorothy_pet ? "Yes" : "No";
        const images = Array.isArray(pet.images) ? pet.images : [];
        const created = pet.created_at
          ? new Date(pet.created_at).toLocaleDateString()
          : "";

        let imagesHtml = "";
        if (images.length) {
          imagesHtml = `
            <div class="thumb-grid">
              ${images
                .map(
                  (img) => `
                  <div style="position:relative;">
                    <img
                      src="${img.image_url}"
                      alt="${pet.pet_name || ""}"
                      class="thumb"
                    />
                    <span
                      class="delete-icon"
                      data-pet-id="${pet.id}"
                      data-image-id="${img.id}"
                      title="Delete image"
                    >
                      🗑
                    </span>
                  </div>
                `
                )
                .join("")}
            </div>
          `;
        } else {
          imagesHtml = `<p style="font-size:0.9rem; color:#555;">No images uploaded for this pet yet.</p>`;
        }

        htmlParts.push(`
          <div class="admin-card" data-pet-id="${pet.id}">
            <h3>${pet.pet_name || "Unnamed Pet"}</h3>
            <p><strong>Dorothy's Pet:</strong> ${isDorothy}</p>
            <p><strong>Created:</strong> ${created}</p>
            <p>${pet.story_description || ""}</p>
            ${imagesHtml}
            <div style="margin-top:12px; display:flex; gap:8px;">
              <button class="btn-primary" data-action="edit-pet" data-id="${pet.id}">
                Edit Pet
              </button>
              <button class="btn-danger" data-action="delete-pet" data-id="${pet.id}">
                Delete Pet
              </button>
            </div>
          </div>
        `);
      });

      adminPetsPanel.innerHTML = htmlParts.join("");

      // Wire Add button
      const addBtn = document.getElementById("adminAddPetBtn");
      if (addBtn) addBtn.addEventListener("click", () => openPetForm());

      // Wire edit/delete & image delete
      adminPetsPanel.querySelectorAll("[data-action='edit-pet']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          openPetForm(id);
        });
      });

      adminPetsPanel.querySelectorAll("[data-action='delete-pet']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          if (confirm("Are you sure you want to delete this pet and all images?")) {
            deletePet(id);
          }
        });
      });

      adminPetsPanel.querySelectorAll(".delete-icon").forEach((icon) => {
        icon.addEventListener("click", () => {
          const imageId = icon.getAttribute("data-image-id");
          if (!imageId) return;
          if (confirm("Delete this image?")) {
            deletePetImage(imageId);
          }
        });
      });
    } catch (err) {
      console.error("Error loading pets in admin:", err);
      adminPetsPanel.innerHTML =
        "<p style='color:#ff4e53;'>Failed to load pets. Please try again.</p>";
    }
  }

  async function deletePet(petId) {
    try {
      const res = await fetch(`${API_BASE}/pets/${petId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadPetsAdmin();
    } catch (err) {
      console.error("Error deleting pet:", err);
      alert("Failed to delete pet.");
    }
  }

  async function deletePetImage(imageId) {
    try {
      const res = await fetch(`${API_BASE}/pets/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete image failed");
      await loadPetsAdmin();
    } catch (err) {
      console.error("Error deleting pet image:", err);
      alert("Failed to delete image.");
    }
  }

  // Pet Add/Edit form: simple prompt-based for now to preserve functionality
  function openPetForm(petId) {
    const isEdit = Boolean(petId);
    const name = prompt(isEdit ? "Enter updated pet name:" : "Enter pet name:");
    if (name === null || !name.trim()) return;

    const desc = prompt(
      isEdit ? "Enter updated story/description:" : "Enter story/description (optional):"
    );
    if (desc === null) return;

    const isDorothy = confirm("Is this Dorothy's pet? Click OK for Yes, Cancel for No.");

    // For images: the nice modal file uploading would require HTML additions.
    // To avoid breaking your current layout, we keep this part as text-only.
    // Images can still be added later from whatever flow you had previously.
    if (isEdit) {
      updatePet(petId, name.trim(), desc.trim(), isDorothy);
    } else {
      createPet(name.trim(), desc.trim(), isDorothy);
    }
  }

  async function createPet(name, desc, isDorothy) {
    try {
      const formData = new FormData();
      formData.append("pet_name", name);
      formData.append("story_description", desc);
      formData.append("is_dorothy_pet", isDorothy ? "true" : "false");

      const res = await fetch(`${API_BASE}/pets`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Create pet failed");
      await loadPetsAdmin();
    } catch (err) {
      console.error("Error creating pet:", err);
      alert("Failed to create pet.");
    }
  }

  async function updatePet(id, name, desc, isDorothy) {
    try {
      const formData = new FormData();
      formData.append("pet_name", name);
      formData.append("story_description", desc);
      formData.append("is_dorothy_pet", isDorothy ? "true" : "false");

      const res = await fetch(`${API_BASE}/pets/${id}`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) throw new Error("Update pet failed");
      await loadPetsAdmin();
    } catch (err) {
      console.error("Error updating pet:", err);
      alert("Failed to update pet.");
    }
  }

  // ======================================================================
  // RATES ADMIN
  // ======================================================================

  async function loadRatesAdmin() {
    if (!adminRatesPanel) return;
    adminRatesPanel.innerHTML = "<p>Loading rates...</p>";

    try {
      const res = await fetch(`${API_BASE}/rates`);
      if (!res.ok) throw new Error("Failed to load rates");
      const rates = await res.json();

      const parts = [];
      parts.push(`
        <div style="text-align:right; margin-bottom:12px;">
          <button class="btn-primary" id="adminAddRateBtn">Add New Rate</button>
        </div>
      `);

      if (!rates || rates.length === 0) {
        parts.push(`<div class="admin-card"><p>No rates configured yet.</p></div>`);
      } else {
        rates.forEach((rate) => {
          parts.push(`
            <div class="admin-card" data-rate-id="${rate.id}">
              <h3>${rate.service_type}</h3>
              <p><strong>Unit:</strong> ${rate.unit_type}</p>
              <p><strong>Rate:</strong> $${rate.rate_per_unit}</p>
              <p>${rate.description || ""}</p>
              <div style="margin-top:10px; display:flex; gap:8px;">
                <button class="btn-primary" data-action="edit-rate" data-id="${rate.id}">
                  Edit
                </button>
                <button class="btn-danger" data-action="delete-rate" data-id="${rate.id}">
                  Delete
                </button>
              </div>
            </div>
          `);
        });
      }

      adminRatesPanel.innerHTML = parts.join("");

      const addBtn = document.getElementById("adminAddRateBtn");
      if (addBtn) addBtn.addEventListener("click", () => openRateForm());

      adminRatesPanel.querySelectorAll("[data-action='edit-rate']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          openRateForm(id);
        });
      });

      adminRatesPanel.querySelectorAll("[data-action='delete-rate']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          if (confirm("Delete this rate?")) {
            deleteRate(id);
          }
        });
      });
    } catch (err) {
      console.error("Error loading rates in admin:", err);
      adminRatesPanel.innerHTML =
        "<p style='color:#ff4e53;'>Failed to load rates.</p>";
    }
  }

  function openRateForm(rateId) {
    const isEdit = Boolean(rateId);
    const serviceType = prompt(
      isEdit ? "Enter updated service type:" : "Enter service type (e.g. Overnight Stay):"
    );
    if (serviceType === null || !serviceType.trim()) return;

    const rateValue = prompt(
      isEdit ? "Enter updated rate (numeric):" : "Enter rate (numeric):"
    );
    if (rateValue === null || !rateValue.trim()) return;

    const unitType = prompt(
      isEdit
        ? 'Enter updated unit type (e.g. "per_night", "per_visit"):'
        : 'Enter unit type (e.g. "per_night", "per_visit"):'
    );
    if (unitType === null || !unitType.trim()) return;

    const description = prompt(
      isEdit ? "Enter updated description (optional):" : "Enter description (optional):"
    );
    if (description === null) return;

    if (isEdit) {
      updateRate(rateId, serviceType.trim(), rateValue.trim(), unitType.trim(), description.trim());
    } else {
      createRate(serviceType.trim(), rateValue.trim(), unitType.trim(), description.trim());
    }
  }

  async function createRate(serviceType, rateValue, unitType, description) {
    try {
      const payload = {
        service_type: serviceType,
        rate_per_unit: parseFloat(rateValue),
        unit_type: unitType,
        description: description,
      };

      const res = await fetch(`${API_BASE}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Create rate failed");
      await loadRatesAdmin();
    } catch (err) {
      console.error("Error creating rate:", err);
      alert("Failed to create rate.");
    }
  }

  async function updateRate(id, serviceType, rateValue, unitType, description) {
    try {
      const payload = {
        service_type: serviceType,
        rate_per_unit: parseFloat(rateValue),
        unit_type: unitType,
        description: description,
      };
      const res = await fetch(`${API_BASE}/rates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update rate failed");
      await loadRatesAdmin();
    } catch (err) {
      console.error("Error updating rate:", err);
      alert("Failed to update rate.");
    }
  }

  async function deleteRate(id) {
    try {
      const res = await fetch(`${API_BASE}/rates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadRatesAdmin();
    } catch (err) {
      console.error("Error deleting rate:", err);
      alert("Failed to delete rate.");
    }
  }

  // ======================================================================
  // CONTACTS ADMIN
  // ======================================================================

  async function loadContactsAdmin() {
    if (!adminContactsPanel) return;
    adminContactsPanel.innerHTML = "<p>Loading contacts...</p>";

    try {
      const res = await fetch(`${API_BASE}/contacts`);
      if (!res.ok) throw new Error("Failed to load contacts");
      const contacts = await res.json();

      if (!contacts || contacts.length === 0) {
        adminContactsPanel.innerHTML =
          "<div class='admin-card'><p>No pending contact requests.</p></div>";
        return;
      }

      const parts = contacts.map((c) => {
        const created = c.created_at
          ? new Date(c.created_at).toLocaleString()
          : "";
        return `
          <div class="admin-card" data-contact-id="${c.id}">
            <h3>${c.name}</h3>
            <p><strong>Email:</strong> ${c.email || ""}</p>
            <p><strong>Phone:</strong> ${c.phone || ""}</p>
            <p><strong>Best Time:</strong> ${c.best_time || ""}</p>
            <p><strong>Service:</strong> ${c.service || ""}</p>
            <p><strong>Dates:</strong> ${c.start_date || ""} → ${
          c.end_date || ""
        }</p>
            <p><strong>Pet Info:</strong> ${c.pet_info || ""}</p>
            <p><strong>Message:</strong> ${c.message || ""}</p>
            <p><strong>Received:</strong> ${created}</p>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button class="btn-primary" data-action="contacted" data-id="${c.id}">
                Mark as Contacted
              </button>
            </div>
          </div>
        `;
      });

      adminContactsPanel.innerHTML = parts.join("");

      adminContactsPanel
        .querySelectorAll("[data-action='contacted']")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            if (!id) return;
            if (confirm("Mark this request as contacted?")) {
              markContacted(id);
            }
          });
        });
    } catch (err) {
      console.error("Error loading contacts:", err);
      adminContactsPanel.innerHTML =
        "<p style='color:#ff4e53;'>Failed to load contacts.</p>";
    }
  }

  async function markContacted(id) {
    try {
      const res = await fetch(`${API_BASE}/contacts/${id}/contacted`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Mark contacted failed");
      await loadContactsAdmin();
    } catch (err) {
      console.error("Error marking contact as contacted:", err);
      alert("Failed to update contact.");
    }
  }

  // ======================================================================
  // REVIEWS ADMIN
  // ======================================================================

  async function loadReviewsAdmin() {
    if (!adminReviewsPanel) return;
    adminReviewsPanel.innerHTML = "<p>Loading reviews...</p>";

    try {
      const res = await fetch(`${API_BASE}/reviews`);
      if (!res.ok) throw new Error("Failed to load reviews");
      const reviews = await res.json();

      if (!reviews || reviews.length === 0) {
        adminReviewsPanel.innerHTML =
          "<div class='admin-card'><p>No reviews submitted yet.</p></div>";
        return;
      }

      const parts = reviews.map((r) => {
        const created = r.created_at
          ? new Date(r.created_at).toLocaleString()
          : "";
        const statusLabel = r.is_approved ? "Approved" : "Pending";
        return `
          <div class="admin-card" data-review-id="${r.id}">
            <h3>${r.reviewer_name || "Anonymous"}</h3>
            <p><strong>Rating:</strong> ${r.rating || 5}/5</p>
            <p>${r.review_text || ""}</p>
            <p><strong>Status:</strong> ${statusLabel}</p>
            <p><strong>Submitted:</strong> ${created}</p>
            <div style="margin-top:10px; display:flex; gap:8px;">
              ${
                r.is_approved
                  ? ""
                  : `<button class="btn-primary" data-action="approve-review" data-id="${r.id}">
                       Approve
                     </button>`
              }
              <button class="btn-danger" data-action="delete-review" data-id="${r.id}">
                Delete
              </button>
            </div>
          </div>
        `;
      });

      adminReviewsPanel.innerHTML = parts.join("");

      adminReviewsPanel
        .querySelectorAll("[data-action='approve-review']")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            if (!id) return;
            if (confirm("Approve this review?")) {
              approveReview(id);
            }
          });
        });

      adminReviewsPanel
        .querySelectorAll("[data-action='delete-review']")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            if (!id) return;
            if (confirm("Delete this review?")) {
              deleteReview(id);
            }
          });
        });
    } catch (err) {
      console.error("Error loading reviews:", err);
      adminReviewsPanel.innerHTML =
        "<p style='color:#ff4e53;'>Failed to load reviews.</p>";
    }
  }

  async function approveReview(id) {
    try {
      const res = await fetch(`${API_BASE}/reviews/${id}/approve`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Approve failed");
      await loadReviewsAdmin();
    } catch (err) {
      console.error("Error approving review:", err);
      alert("Failed to approve review.");
    }
  }

  async function deleteReview(id) {
    try {
      const res = await fetch(`${API_BASE}/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadReviewsAdmin();
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("Failed to delete review.");
    }
  }

// =====================================================
// Admin nav + login handling (safe to append at bottom)
// =====================================================
(() => {
  const TOKEN_KEY = "dotsAdminToken";

  // Sections
  const adminNav = document.getElementById("navAdmin");
  const adminSection =
    document.getElementById("adminDashboard") ||
    document.getElementById("adminSection") ||
    document.getElementById("admin");

  const customerSections = [
    document.getElementById("about"),
    document.getElementById("gallery"),
    document.getElementById("reviews"),
    document.getElementById("rates"),
    document.getElementById("contact"),
  ].filter(Boolean);

  // Modal + form
  const loginModal = document.getElementById("adminLoginModal");
  const loginForm = document.getElementById("adminLoginForm");
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const cancelBtn = document.getElementById("adminLoginCancel");
  const logoutBtn = document.getElementById("adminLogoutBtn"); // optional

  function hasToken() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function showAdmin() {
    if (!adminSection) return;

    // Hide public sections
    customerSections.forEach((sec) => {
      if (!sec) return;
      sec.dataset.prevDisplay = sec.style.display || "";
      sec.style.display = "none";
    });

    // Show dashboard
    adminSection.style.display = "block";

    // Scroll to top of admin
    const offset = adminSection.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: offset, behavior: "smooth" });
  }

  function showPublic() {
    if (adminSection) {
      adminSection.style.display = "none";
    }
    customerSections.forEach((sec) => {
      if (!sec) return;
      sec.style.display = sec.dataset.prevDisplay || "";
    });
  }

  function openLoginModal() {
    if (!loginModal) return;
    loginModal.classList.add("is-visible");
    document.body.classList.add("modal-open");
    if (usernameInput) usernameInput.focus();
  }

  function closeLoginModal() {
    if (!loginModal) return;
    loginModal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    if (loginForm) loginForm.reset();
  }

  // Expose for main.js or inline handlers if needed
  window.openAdminLoginModal = openLoginModal;
  window.closeAdminLoginModal = closeLoginModal;

  // Main.js calls this – give it something useful to do.
  window.checkAdminAuth = function checkAdminAuth() {
    if (hasToken()) {
      console.info("Admin token present, click 'Admin' to enter dashboard.");
    } else {
      console.info("No admin token – public view.");
    }
  };

  // Nav click: either go straight to dashboard (if logged in)
  // or open the login modal.
  if (adminNav) {
    adminNav.addEventListener("click", (e) => {
      e.preventDefault();
      if (hasToken()) {
        showAdmin();
      } else {
        openLoginModal();
      }
    });
  }

  // Login submit
  if (loginForm && usernameInput && passwordInput) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        alert("Please enter both username and password.");
        return;
      }

      try {
        const resp = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!resp.ok) {
          alert("Invalid credentials.");
          return;
        }

        const data = await resp.json();
        if (!data || !data.success || !data.token) {
          alert("Login failed. Please try again.");
          return;
        }

        localStorage.setItem(TOKEN_KEY, data.token);
        closeLoginModal();
        showAdmin();
      } catch (err) {
        console.error("Admin login error:", err);
        alert("Could not log in. Please try again.");
      }
    });
  }

  // Cancel button closes modal
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeLoginModal();
    });
  }

  // Optional: logout button inside the dashboard
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem(TOKEN_KEY);
      showPublic();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // On initial load, hide admin dashboard if we’re on the public view
  if (adminSection && !hasToken()) {
    adminSection.style.display = "none";
  }

  console.log("🔐 Admin login module initialized.");
})();
  
  // ======================================================================
  // WIRE UP NAV + INITIAL STATE
  // ======================================================================

  document.addEventListener("DOMContentLoaded", () => {
    // Admin nav click → require auth
    if (adminNav) {
      adminNav.addEventListener("click", (evt) => {
        evt.preventDefault();
        requireAdminAuth();
      });
    }

    // If we already have a token (user previously logged in),
    // allow them to simply click Admin and go straight in.
    if (adminToken) {
      console.log("Admin token present, click 'Admin' to enter dashboard.");
    }
  });
})();
