/* =========================================
   ADMIN DASHBOARD — FULL CRUD MANAGEMENT
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 Admin dashboard loaded");
/* ---------- ADMIN LOGIN ---------- */
const loginSection = document.getElementById("adminLogin");
const dashboardSection = document.getElementById("admin");
const loginForm = document.getElementById("adminLoginForm");

if (!localStorage.getItem("adminToken")) {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
} else {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
}

if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();
    const statusEl = document.getElementById("adminLoginStatus");

    statusEl.textContent = "Logging in...";
    statusEl.className = "form-status";

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem("adminToken", data.token);
        statusEl.textContent = "✅ Login successful! Loading dashboard...";
        statusEl.classList.add("success");
        setTimeout(() => location.reload(), 1000);
      } else {
        statusEl.textContent = "❌ Invalid credentials.";
        statusEl.classList.add("error");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      statusEl.textContent = "Server error.";
      statusEl.classList.add("error");
    }
  });
}


  const token = localStorage.getItem("adminToken");
  if (!token) {
    document.getElementById("admin").innerHTML = `
      <div class="admin-login-block">
        <p>Please log in to access the Admin Dashboard.</p>
      </div>`;
    return;
  }

  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".admin-tab");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabs.forEach(t => t.classList.remove("active"));

      btn.classList.add("active");
      const target = btn.dataset.tab;
      document.getElementById(`tab-${target}`).classList.add("active");

      if (target === "pets") loadPets();
      if (target === "rates") loadRates();
      if (target === "contacts") loadContacts();
    });
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    location.reload();
  });

  // Initial load
  loadPets();
});

/* ---------- PETS MANAGEMENT ---------- */
async function loadPets() {
  const container = document.getElementById("petList");
  container.innerHTML = "<p>Loading pets...</p>";

  try {
    const res = await fetch("/api/gallery");
    const pets = await res.json();
    if (!Array.isArray(pets)) throw new Error("Invalid data");

    container.innerHTML = pets
      .map(
        p => `
      <div class="admin-card">
        <h4>${p.pet_name}</h4>
        <p>${p.story_description || ""}</p>
        <div class="admin-images">
          ${
            (p.images || [])
              .map(
                img => `
            <div class="image-thumb">
              <img src="${img.image_url}" alt="${p.pet_name}" />
              <button class="btn-delete" data-pet="${p.id}" data-img="${img.id}">🗑</button>
            </div>
          `
              )
              .join("") || "<p>No images</p>"
          }
        </div>
        <button class="btn-delete" data-pet="${p.id}">Delete Pet</button>
      </div>
    `
      )
      .join("");

    document.querySelectorAll(".btn-delete[data-img]").forEach(btn =>
      btn.addEventListener("click", async e => {
        const { pet, img } = e.target.dataset;
        if (!confirm("Delete this image?")) return;
        await fetch(`/api/pets/${pet}/images/${img}`, { method: "DELETE" });
        loadPets();
      })
    );

    document.querySelectorAll(".btn-delete:not([data-img])").forEach(btn =>
      btn.addEventListener("click", async e => {
        const { pet } = e.target.dataset;
        if (!confirm("Delete this pet and all images?")) return;
        await fetch(`/api/pets/${pet}`, { method: "DELETE" });
        loadPets();
      })
    );
  } catch (err) {
    console.error("❌ loadPets error:", err);
    container.innerHTML = `<p class="error">Failed to load pets.</p>`;
  }
}

/* ---------- RATES MANAGEMENT ---------- */
async function loadRates() {
  const container = document.getElementById("rateList");
  container.innerHTML = "<p>Loading rates...</p>";

  try {
    const res = await fetch("/api/rates");
    const rates = await res.json();
    if (!Array.isArray(rates)) throw new Error("Invalid data");

    container.innerHTML = rates
      .map(
        r => `
      <div class="admin-card">
        <h4>${r.service_type}</h4>
        <p>${r.description || ""}</p>
        <p><strong>$${parseFloat(r.rate_per_unit).toFixed(2)} ${
          r.unit_type
        }</strong></p>
        <div class="admin-actions">
          <button class="btn-edit" data-id="${r.id}">✏️ Edit</button>
          <button class="btn-delete" data-id="${r.id}">🗑 Delete</button>
        </div>
      </div>`
      )
      .join("");

    document.querySelectorAll(".btn-delete").forEach(btn =>
      btn.addEventListener("click", async e => {
        const id = e.target.dataset.id;
        if (!confirm("Delete this rate?")) return;
        await fetch(`/api/rates/${id}`, { method: "DELETE" });
        loadRates();
      })
    );
  } catch (err) {
    console.error("❌ loadRates error:", err);
    container.innerHTML = `<p class="error">Failed to load rates.</p>`;
  }
}

/* ---------- CONTACT MANAGEMENT ---------- */
async function loadContacts() {
  const container = document.getElementById("contactList");
  container.innerHTML = "<p>Loading contact requests...</p>";

  try {
    const res = await fetch("/api/contact");
    const contacts = await res.json();
    if (!Array.isArray(contacts)) throw new Error("Invalid data");

    container.innerHTML = contacts
      .map(
        c => `
      <div class="admin-card">
        <h4>${c.name}</h4>
        <p><strong>Email:</strong> ${c.email}</p>
        <p><strong>Phone:</strong> ${c.phone || "N/A"}</p>
        <p><strong>Service:</strong> ${c.service || "N/A"}</p>
        <p><strong>Dates:</strong> ${c.start_date || ""} – ${c.end_date || ""}</p>
        <p><strong>Message:</strong> ${c.message || ""}</p>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("❌ loadContacts error:", err);
    container.innerHTML = `<p class="error">Failed to load contact requests.</p>`;
  }
}
