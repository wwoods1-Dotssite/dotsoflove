// ==============================
// ADMIN DASHBOARD FRONTEND (FINAL)
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin dashboard initialized");

  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const statusEl = document.getElementById("adminLoginStatus");

  // ==============================
  // LOGIN HANDLING
  // ==============================
  const token = localStorage.getItem("adminToken");

  if (token) {
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";
    initDashboard();
  } else {
    loginSection.style.display = "block";
    dashboardSection.style.display = "none";
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value.trim();

      if (!username || !password) {
        statusEl.textContent = "❌ Please enter both username and password.";
        statusEl.className = "form-status error";
        return;
      }

      statusEl.textContent = "🔐 Logging in...";
      statusEl.className = "form-status loading";

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (data.success && data.token) {
          localStorage.setItem("adminToken", data.token);
          statusEl.textContent = "✅ Login successful!";
          statusEl.className = "form-status success";

          setTimeout(() => {
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            initDashboard();
          }, 400);
        } else {
          statusEl.textContent = "❌ Invalid credentials.";
          statusEl.className = "form-status error";
        }
      } catch (err) {
        console.error("Login error:", err);
        statusEl.textContent = "⚠️ Server error during login.";
        statusEl.className = "form-status error";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      loginSection.style.display = "block";
      dashboardSection.style.display = "none";
    });
  }

  // ==============================
  // DASHBOARD INITIALIZATION
  // ==============================
  function initDashboard() {
    console.log("✅ Dashboard loaded");
    setupTabs();
    loadPets();
    loadRates();
    loadContacts();
  }

  // ==============================
  // TAB SWITCHING
  // ==============================
  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".admin-tab").forEach((tab) => tab.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(`tab-${btn.dataset.tab}`);
        if (target) target.classList.add("active");
      });
    });
  }

  // ==============================
  // PETS CRUD
  // ==============================
  async function loadPets() {
    try {
      const res = await fetch("/api/gallery");
      const pets = await res.json();
      const container = document.getElementById("petList");
      container.innerHTML = "";

      pets.forEach((p) => {
        const petCard = document.createElement("div");
        petCard.className = "admin-card";
        petCard.innerHTML = `
          <h4>${p.pet_name}</h4>
          <p>${p.story_description || ""}</p>
          <div class="admin-images">
            ${
              p.images && p.images.length
                ? p.images
                    .map(
                      (i) => `
                <div class="image-thumb">
                  <img src="${i.image_url}" alt="${p.pet_name}">
                  <button class="btn-delete delete-img" data-pet="${p.id}" data-id="${i.id}">🗑</button>
                </div>`
                    )
                    .join("")
                : "<p>No images uploaded.</p>"
            }
          </div>
          <button class="btn-delete delete-pet" data-id="${p.id}">Delete Pet</button>
        `;
        container.appendChild(petCard);
      });

      // Delete pet
      document.querySelectorAll(".delete-pet").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (!confirm("Delete this pet?")) return;
          await fetch(`/api/pets/${id}`, { method: "DELETE" });
          loadPets();
        })
      );

      // Delete image
      document.querySelectorAll(".delete-img").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          const { pet, id } = e.target.dataset;
          await fetch(`/api/pets/${pet}/images/${id}`, { method: "DELETE" });
          loadPets();
        })
      );

      // Add new pet
      document.getElementById("addPetBtn")?.addEventListener("click", async () => {
        const name = prompt("Pet name:");
        const desc = prompt("Story description:");
        if (!name) return;
        await fetch("/api/pets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pet_name: name, story_description: desc, is_dorothy_pet: false }),
        });
        loadPets();
      });
    } catch (err) {
      console.error("Error loading pets:", err);
    }
  }

  // ==============================
  // RATES CRUD
  // ==============================
  async function loadRates() {
    try {
      const res = await fetch("/api/rates");
      const rates = await res.json();
      const container = document.getElementById("rateList");
      container.innerHTML = "";

      rates.forEach((r) => {
        const div = document.createElement("div");
        div.className = "admin-card";
        div.innerHTML = `
          <h4>${r.service_type}</h4>
          <p>${r.description}</p>
          <strong>$${r.rate_per_unit} ${r.unit_type}</strong>
          <div class="actions">
            <button class="btn-edit edit-rate" data-id="${r.id}">Edit</button>
            <button class="btn-delete delete-rate" data-id="${r.id}">Delete</button>
          </div>
        `;
        container.appendChild(div);
      });

      // Delete rate
      document.querySelectorAll(".delete-rate").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          await fetch(`/api/rates/${e.target.dataset.id}`, { method: "DELETE" });
          loadRates();
        })
      );

      // Edit rate
      document.querySelectorAll(".edit-rate").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          const type = prompt("Service type:");
          const price = prompt("Rate per unit:");
          const unit = prompt("Unit type:");
          const desc = prompt("Description:");
          await fetch(`/api/rates/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ service_type: type, rate_per_unit: price, unit_type: unit, description: desc }),
          });
          loadRates();
        })
      );

      // Add new rate
      document.getElementById("addRateBtn")?.addEventListener("click", async () => {
        const type = prompt("Service type:");
        const price = prompt("Rate per unit:");
        const unit = prompt("Unit type:");
        const desc = prompt("Description:");
        await fetch("/api/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service_type: type, rate_per_unit: price, unit_type: unit, description: desc }),
        });
        loadRates();
      });
    } catch (err) {
      console.error("Error loading rates:", err);
    }
  }

  // ==============================
  // CONTACTS CRUD
  // ==============================
  async function loadContacts() {
    try {
      const res = await fetch("/api/contact");
      const contacts = await res.json();
      const container = document.getElementById("contactList");
      container.innerHTML = "";

      contacts.forEach((c) => {
        const div = document.createElement("div");
        div.className = "admin-card";
        div.innerHTML = `
          <h4>${c.name}</h4>
          <p>${c.email}</p>
          <p>${c.message}</p>
          <button class="btn-delete delete-contact" data-id="${c.id}">Delete</button>
        `;
        container.appendChild(div);
      });

      document.querySelectorAll(".delete-contact").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          if (!confirm("Delete this contact?")) return;
          await fetch(`/api/contact/${e.target.dataset.id}`, { method: "DELETE" });
          loadContacts();
        })
      );
    } catch (err) {
      console.error("Error loading contacts:", err);
    }
  }
});
