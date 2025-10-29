// ===============================
// Admin Dashboard Logic (Final Stable Build)
// ===============================

// ---------- GLOBAL ----------
if (typeof window.adminToken === "undefined") {
  window.adminToken = localStorage.getItem("adminToken") || null;
}

const ADMIN_API_BASE = "/api";

// ---------- AUTH ----------
async function handleAdminLogin(event) {
  event.preventDefault();

  const username = document.getElementById("adminUsername")?.value.trim();
  const password = document.getElementById("adminPassword")?.value.trim();
  const errorBox = document.getElementById("adminError");

  if (!username || !password) {
    if (errorBox) errorBox.textContent = "Please enter username and password.";
    return;
  }

  try {
    console.log("🔐 Attempting admin login...");
    const res = await fetch(`${ADMIN_API_BASE}/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const msg = `Server returned ${res.status}`;
      if (errorBox) errorBox.textContent = msg;
      throw new Error(msg);
    }

    const data = await res.json();
    if (data.success) {
      console.log("✅ Admin login successful");
      localStorage.setItem("adminToken", data.token);
      window.adminToken = data.token;

      // ✅ Navigate directly to the admin dashboard
      if (window.location.pathname !== "/admin") {
        window.history.pushState({}, "", "/admin");
      }

      checkAdminAuth(); // Immediately show dashboard
    } else {
      if (errorBox) errorBox.textContent = "Invalid credentials.";
    }
  } catch (err) {
    console.error("❌ Login failed:", err);
    if (errorBox) errorBox.textContent = "Network or server error.";
  }
}

function handleAdminLogout() {
  localStorage.removeItem("adminToken");
  window.adminToken = null;
  window.location.reload();
}

// ---------- TAB SWITCHING ----------
function switchAdminTab(tabId) {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.style.display = section.id === tabId ? "block" : "none";
  });
}

// ---------- LOAD RATES ----------
async function loadAdminRates() {
  const container = document.getElementById("adminRates");
  if (!container) return;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/rates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rates = await res.json();

    container.innerHTML = rates
      .map(
        (r) => `
        <div class="rate-item">
          <h3>${r.service_type}</h3>
          <p>${r.description || ""}</p>
          <strong>$${r.rate_per_unit} ${r.unit_type}</strong>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading rates:", err);
    container.innerHTML = `<p class="error">Failed to load rates.</p>`;
  }
}

// ---------- LOAD CONTACT REQUESTS ----------
async function loadAdminContacts() {
  const container = document.getElementById("adminContacts");
  if (!container) return;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/contact`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response");
    }

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      container.innerHTML = `<p class="muted">No contact requests yet.</p>`;
      return;
    }

    container.innerHTML = data
      .map(
        (c) => `
        <div class="contact-item">
          <h4>${c.name}</h4>
          <p><strong>Email:</strong> ${c.email}</p>
          <p><strong>Phone:</strong> ${c.phone || "—"}</p>
          <p><strong>Service:</strong> ${c.service || "—"}</p>
          <p><strong>Dates:</strong> ${c.start_date || ""} – ${c.end_date || ""}</p>
          <p><strong>Message:</strong> ${c.message || ""}</p>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("❌ Error loading contacts:", err);
    container.innerHTML = `<p class="error">Failed to load contact requests.</p>`;
  }
}

// ---------- LOAD GALLERY ----------
async function loadAdminGallery() {
  const container = document.getElementById("adminGallery");
  if (!container) return;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/gallery`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pets = await res.json();

    container.innerHTML = pets
      .map(
        (pet) => `
      <div class="admin-pet-card">
        <h3>${pet.pet_name}</h3>
        <p>${pet.story_description || ""}</p>
        ${
          pet.images && pet.images.length
            ? `<div class="admin-pet-images">
                ${pet.images
                  .map(
                    (img) => `
                    <div class="admin-image-wrapper">
                      <img src="${img.image_url}" alt="${pet.pet_name}">
                      <button class="delete-image" data-pet="${pet.id}" data-image="${img.id}">🗑️</button>
                    </div>`
                  )
                  .join("")}
              </div>`
            : "<p>No images uploaded.</p>"
        }
        <button class="delete-pet" data-pet="${pet.id}">Delete Pet</button>
      </div>`
      )
      .join("");

    // Bind delete actions
    document.querySelectorAll(".delete-pet").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const petId = e.target.dataset.pet;
        if (confirm("Are you sure you want to delete this pet?")) {
          await deletePet(petId);
          loadAdminGallery();
        }
      })
    );

    document.querySelectorAll(".delete-image").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const { pet, image } = e.target.dataset;
        if (confirm("Delete this image?")) {
          await deletePetImage(pet, image);
          loadAdminGallery();
        }
      })
    );
  } catch (err) {
    console.error("❌ Failed to load gallery:", err);
    container.innerHTML = `<p class="error">Failed to load gallery.</p>`;
  }
}

// ---------- GALLERY ACTIONS ----------
async function deletePet(petId) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/pets/${petId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
  } catch (err) {
    console.error("Delete pet error:", err);
  }
}

async function deletePetImage(petId, imageId) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/pets/${petId}/images/${imageId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
  } catch (err) {
    console.error("Delete image error:", err);
  }
}

// ---------- GLOBAL AUTH STATE ----------
if (typeof window.checkAdminAuth === "undefined") {
  window.checkAdminAuth = function () {
    const token = window.adminToken || localStorage.getItem("adminToken");
    const loginSection = document.getElementById("adminLogin");
    const panelSection = document.getElementById("adminPanel");
    const banner = document.getElementById("adminStatusBanner");

    if (token) {
      if (loginSection) loginSection.style.display = "none";
      if (panelSection) panelSection.style.display = "block";
      if (banner) {
        banner.textContent = "🟢 Logged in as Admin";
        banner.className = "admin-banner success";
      }
      console.log("✅ Admin already authenticated");
    } else {
      if (loginSection) loginSection.style.display = "block";
      if (panelSection) panelSection.style.display = "none";
      if (banner) {
        banner.textContent = "🔒 Login required";
        banner.className = "admin-banner warning";
      }
      console.log("🔒 Admin authentication required");
    }

    // ✅ Ensure Admin login section is visible when no token exists
    if (!token && loginSection && panelSection) {
      loginSection.style.display = "block";
      panelSection.style.display = "none";
    }

    // ✅ Notify main.js that admin.js is ready
    document.dispatchEvent(new Event("admin:ready"));
  };
}

// ---------- INITIALIZATION ----------
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ admin.js initialized safely (vFinal)");

  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("adminLogout");

  if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", handleAdminLogout);

  // When tabs clicked
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAdminTab(tab.dataset.tab));
  });

  // Run authentication check
  checkAdminAuth();

  // Load content if logged in
  if (window.adminToken) {
    loadAdminGallery();
    loadAdminRates();
    loadAdminContacts();
  }
});
