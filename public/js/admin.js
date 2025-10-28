// ===============================
// Admin Dashboard Script (Final)
// ===============================

// ---------- GLOBAL ----------
// Prevent redeclaration if script reloaded by dynamic navigation
if (typeof window.adminToken === "undefined") {
  window.adminToken = null;
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
    console.log("Attempting admin login...");
    const res = await fetch(`${ADMIN_API_BASE}/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Login HTTP error:", res.status, text);
      if (errorBox) errorBox.textContent = "Server returned " + res.status;
      return;
    }

    const data = await res.json();
    if (data.success) {
      console.log("✅ Admin logged in successfully");
      localStorage.setItem("adminToken", data.token);
      location.reload();
    } else {
      if (errorBox) errorBox.textContent = "Invalid credentials.";
    }
  } catch (err) {
    console.error("Login failed:", err);
    if (errorBox) errorBox.textContent = "Network error.";
  }
}

function handleAdminLogout() {
  localStorage.removeItem("adminToken");
  location.reload();
}

// ---------- TAB HANDLING ----------
function switchAdminTab(tabId) {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.style.display = "none";
  });

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.style.display = "block";
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
  }
}

// ---------- LOAD RATES ----------
async function loadAdminRates() {
  const container = document.getElementById("adminRates");
  if (!container) return;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/rates`);
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
    const res = await fetch(`${ADMIN_API_BASE}/contacts`);
    const data = await res.json();

    container.innerHTML = data
      .map(
        (c) => `
      <div class="contact-item">
        <h4>${c.name}</h4>
        <p><strong>Email:</strong> ${c.email}</p>
        <p><strong>Phone:</strong> ${c.phone}</p>
        <p><strong>Service:</strong> ${c.service}</p>
        <p><strong>Dates:</strong> ${c.start_date || ""} - ${
          c.end_date || ""
        }</p>
        <p><strong>Message:</strong> ${c.message || ""}</p>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading contacts:", err);
    container.innerHTML = `<p class="error">Failed to load contact requests.</p>`;
  }
}

// ---------- GALLERY MANAGEMENT ----------
async function loadAdminGallery() {
  const container = document.getElementById("adminGallery");
  if (!container) return;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/gallery`);
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
                    </div>
                  `
                  )
                  .join("")}
              </div>`
            : "<p>No images uploaded.</p>"
        }
        <button class="delete-pet" data-pet="${pet.id}">Delete Pet</button>
      </div>`
      )
      .join("");

    // Event bindings
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
    console.error("Failed to load gallery:", err);
    container.innerHTML = `<p class="error">Failed to load gallery.</p>`;
  }
}

// ---------- GALLERY ACTIONS ----------
async function deletePet(petId) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/pets/${petId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed");
  } catch (err) {
    console.error("Delete pet error:", err);
  }
}

async function deletePetImage(petId, imageId) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/pets/${petId}/images/${imageId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed");
  } catch (err) {
    console.error("Delete image error:", err);
  }
}

// ---------- INITIALIZATION ----------
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("adminLogout");
  const token = localStorage.getItem("adminToken");
  const banner = document.getElementById("adminStatusBanner");

  if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", handleAdminLogout);

  if (token) {
    adminToken = token;
    document.body.classList.add("admin-logged-in");

    if (banner) banner.textContent = "🔐 Logged in as Dorothy";
    if (banner) banner.style.display = "block";

    loadAdminGallery();
    loadAdminRates();
    loadAdminContacts();
  } else if (banner) {
    banner.style.display = "none";
  }
});
