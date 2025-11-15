// js/admin.js
(() => {
  "use strict";

  const ADMIN_TOKEN_KEY = "dotsAdminToken";

  // -----------------------------
  // State
  // -----------------------------
  let isLoggedIn = false;
  let currentTab = "adminPets";

  // -----------------------------
  // Cached DOM refs
  // -----------------------------
  let adminNavLink;
  let adminLoginModal;
  let adminLoginForm;
  let adminLoginClose;
  let adminLoginCancel;

  let adminPanel;
  let adminLogoutBtn;

  let adminTabs = [];
  let adminSections = [];

  let adminPetsSection;
  let adminRatesSection;
  let adminContactsSection;
  let adminReviewsSection;
  let adminRatesCache = []; // holds last fetched rates for admin

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

    // Login modal
    adminLoginModal = document.getElementById("adminLoginModal");
    adminLoginForm = document.getElementById("adminLoginForm");
    adminLoginClose = document.getElementById("adminLoginClose");
    adminLoginCancel = document.getElementById("adminLoginCancel");

    // Admin panel + logout
    adminPanel = document.getElementById("adminPanel");
    adminLogoutBtn = document.getElementById("adminLogoutBtn");

    // Tabs + sections
    adminTabs = Array.from(document.querySelectorAll(".admin-tab"));
    adminSections = Array.from(document.querySelectorAll(".admin-section"));

    adminPetsSection = document.getElementById("adminPets");
    adminRatesSection = document.getElementById("adminRates");
    adminContactsSection = document.getElementById("adminContacts");
    adminReviewsSection = document.getElementById("adminReviews");

    console.log("[Admin] cacheDom()", {
      adminNavLink,
      adminLoginModal,
      adminPanel,
      tabs: adminTabs.length,
      sections: adminSections.length,
    });
  }

  function attachListeners() {
    // Header “Admin” nav link
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

    // Review actions delegation (approve / delete)
    if (adminReviewsSection) {
      adminReviewsSection.addEventListener("click", handleReviewActions);
    }

    // Contacts actions delegation (mark contacted / delete)
    if (adminContactsSection) {
      adminContactsSection.addEventListener("click", (evt) => {
        const btn = evt.target.closest("button[data-action]");
        if (!btn) return;

        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (!id || !action) return;

        if (action === "contacted") {
          markContacted(id);
        } else if (action === "delete-contact") {
          deleteContact(id);
        }
      });
    }
  }

  // review actions (approve / delete) via delegation
if (adminReviewsSection) {
  adminReviewsSection.addEventListener("click", handleReviewActions);
}

// NEW: rate actions (add / edit / delete)
if (adminRatesSection) {
  adminRatesSection.addEventListener("click", handleRateActions);
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

    const username = adminLoginForm
      .querySelector("#adminUsername")
      ?.value.trim();
    const password =
      adminLoginForm.querySelector("#adminPassword")?.value ?? "";

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

    // Buttons
    adminTabs.forEach((btn) => {
      if (btn.dataset.section === sectionId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Sections
    adminSections.forEach((sec) => {
      if (sec.id === sectionId) {
        sec.style.display = "block";
      } else {
        sec.style.display = "none";
      }
    });

    // Load data for this tab
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
  // PETS TAB
  // -----------------------------
  async function loadAdminPets() {
    if (!adminPetsSection) return;
    adminPetsSection.innerHTML = "<p>Loading pets…</p>";

    try {
      const res = await fetch("/api/pets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pets = await res.json();

      if (!pets.length) {
        adminPetsSection.innerHTML = "<p>No pets found.</p>";
        return;
      }

      const rows = pets
        .map(
          (p) => `
          <tr>
            <td>${escapeHtml(p.pet_name || "")}</td>
            <td>${p.is_dorothy_pet ? "Dorothy" : "Client"}</td>
            <td>${escapeHtml(p.story_description || "")}</td>
            <td>${(p.images || []).length}</td>
          </tr>`
        )
        .join("");

      adminPetsSection.innerHTML = `
        <h3>Pets</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Story</th>
              <th># Photos</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    } catch (err) {
      console.error("[Admin] Error loading pets", err);
      adminPetsSection.innerHTML =
        "<p class='admin-error'>Unable to load pets.</p>";
    }
  }

// -----------------------------
// RATES TAB (with modal form)
// -----------------------------
let editingRateId = null;
let adminRatesCache = [];

// Load Rates
async function loadAdminRates() {
  if (!adminRatesSection) return;
  adminRatesSection.innerHTML = "<p>Loading rates…</p>";

  try {
    const res = await fetch("/api/rates");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    adminRatesCache = await res.json();

    if (!adminRatesCache.length) {
      adminRatesSection.innerHTML = "<p>No rates found.</p>";
      return;
    }

    const rows = adminRatesCache
      .map(
        (r) => `
        <tr>
          <td>${escapeHtml(r.service_type || "")}</td>
          <td>${escapeHtml(r.unit_type || "")}</td>
          <td>$${Number(r.rate_per_unit).toFixed(2)}</td>
          <td>${escapeHtml(r.description || "")}</td>
          <td>${r.is_featured ? "Yes" : "No"}</td>
          <td>
            <button class="btn-small js-edit-rate" data-id="${r.id}">Edit</button>
            <button class="btn-small btn-danger js-delete-rate" data-id="${r.id}">Delete</button>
          </td>
        </tr>`
      )
      .join("");

    adminRatesSection.innerHTML = `
      <h3>Service Rates</h3>
      <button class="btn-primary js-add-rate" style="margin-bottom:15px;">+ Add New Rate</button>

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
      </table>
    `;
  } catch (err) {
    console.error("[Admin] Error loading rates", err);
    adminRatesSection.innerHTML =
      "<p class='admin-error'>Unable to load rates.</p>";
  }
}

// Open Modal
function openRateModal(rate) {
  const modal = adminRateModal;
  if (!modal) return;

  if (rate) {
    editingRateId = rate.id;
    rateModalTitle.textContent = "Edit Rate";
    rateServiceType.value = rate.service_type || "";
    rateAmount.value = rate.rate_per_unit || "";
    rateUnit.value = rate.unit_type || "";
    rateDescription.value = rate.description || "";
    rateFeatured.checked = !!rate.is_featured;
  } else {
    editingRateId = null;
    rateModalTitle.textContent = "Add New Rate";
    rateServiceType.value = "";
    rateAmount.value = "";
    rateUnit.value = "per_day";
    rateDescription.value = "";
    rateFeatured.checked = false;
  }

  modal.classList.remove("hidden");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

// Close Modal
function closeRateModal() {
  adminRateModal.classList.remove("show");
  adminRateModal.classList.add("hidden");
  adminRateModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Save (Add/Update)
async function saveRate(e) {
  e.preventDefault();

  const payload = {
    service_type: rateServiceType.value.trim(),
    rate_per_unit: rateAmount.value.trim(),
    unit_type: rateUnit.value,
    description: rateDescription.value.trim(),
    is_featured: rateFeatured.checked ? "true" : "false",
  };

  try {
    let url = "/api/rates";
    let method = "POST";

    if (editingRateId) {
      url = `/api/rates/${editingRateId}`;
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
    alert("Could not save rate.");
  }
}

// Delete rate
async function deleteRate(id) {
  if (!confirm("Delete this rate? This cannot be undone.")) return;

  try {
    const res = await fetch(`/api/rates/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await loadAdminRates();
  } catch (err) {
    console.error("[Admin] Error deleting rate:", err);
    alert("Could not delete rate.");
  }
}

// Handle button clicks inside the rate table
async function handleRateActions(e) {
  const addBtn = e.target.closest(".js-add-rate");
  const editBtn = e.target.closest(".js-edit-rate");
  const deleteBtn = e.target.closest(".js-delete-rate");

  if (addBtn) {
    openRateModal(null);
    return;
  }

  const id = editBtn?.dataset.id || deleteBtn?.dataset.id;
  if (!id) return;

  if (editBtn) {
    const rate = adminRatesCache.find((r) => String(r.id) === String(id));
    openRateModal(rate);
    return;
  }

  if (deleteBtn) {
    await deleteRate(id);
  }
}

// Attach listeners on DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  rateModalClose?.addEventListener("click", closeRateModal);
  rateModalCancel?.addEventListener("click", closeRateModal);
  rateModalForm?.addEventListener("submit", saveRate);

  adminRatesSection?.addEventListener("click", handleRateActions);
});  
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
        adminContactsSection.innerHTML = "<p>No contact requests.</p>";
        return;
      }

      const rows = contacts
        .map(
          (c) => `
          <tr>
            <td>${escapeHtml(c.name || "")}</td>
            <td>${escapeHtml(c.email || "")}</td>
            <td>${escapeHtml(c.phone || "")}</td>
            <td>${escapeHtml(c.service || "")}</td>
            <td>${escapeHtml(c.start_date || "")}</td>
            <td>${escapeHtml(c.message || "")}</td>
            <td class="admin-actions">
              <button
                type="button"
                class="btn-primary"
                data-id="${c.id}"
                data-action="contacted">
                Mark Contacted
              </button>
              <button
                type="button"
                class="btn-danger"
                data-id="${c.id}"
                data-action="delete-contact">
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
              <th>Start Date</th>
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

  async function markContacted(id) {
    try {
      const res = await fetch(`/api/admin/contacts/${id}/contacted`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await loadAdminContacts();
    } catch (err) {
      console.error("[Admin] Error marking contact as contacted:", err);
      alert("Couldn't mark contact as contacted.");
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
    const deleteBtn = e.target.closest(".js-delete-review");

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
