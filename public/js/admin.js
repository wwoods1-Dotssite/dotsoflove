// ==============================
// ADMIN DASHBOARD FRONTEND
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin dashboard loaded");
  const token = localStorage.getItem("adminToken");

  const loginSection = document.getElementById("adminLogin");
  const dashboard = document.getElementById("admin");

  if (!token) {
    loginSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
  } else {
    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    initDashboard();
  }

// ===============================
// ADMIN LOGIN & DASHBOARD LOGIC
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin dashboard loaded");

  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");
  const loginForm = document.getElementById("adminLoginForm");

  // Check token on load
  if (localStorage.getItem("adminToken")) {
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";
  } else {
    loginSection.style.display = "block";
    dashboardSection.style.display = "none";
  }

  // Handle login submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value.trim();
      const statusEl = document.getElementById("adminLoginStatus");

      if (!username || !password) {
        statusEl.textContent = "❌ Enter both fields.";
        statusEl.className = "error";
        return;
      }

      statusEl.textContent = "🔐 Logging in...";
      statusEl.className = "loading";

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
          statusEl.className = "success";

          setTimeout(() => {
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            loadPets();
            loadRates();
            loadContacts();
          }, 500);
        } else {
          statusEl.textContent = "❌ Invalid credentials.";
          statusEl.className = "error";
        }
      } catch (err) {
        console.error("Login error:", err);
        statusEl.textContent = "⚠️ Server error.";
        statusEl.className = "error";
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      loginSection.style.display = "block";
      dashboardSection.style.display = "none";
    });
  }
});


  // ==============================
  // INITIALIZE DASHBOARD
  // ==============================
  function initDashboard() {
    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      location.reload();
    });

    // Tab Switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".admin-tab").forEach((tab) => tab.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(`tab-${btn.dataset.tab}`);
        if (target) target.classList.add("active");
      });
    });

    loadPets();
    loadRates();
    loadContacts();
  }

  // ==============================
  // PETS
  // ==============================
  async function loadPets() {
    try {
      const res = await fetch("/api/gallery");
      const pets = await res.json();
      const container = document.getElementById("petList");
      container.innerHTML = "";
      pets.forEach((p) => {
        const petDiv = document.createElement("div");
        petDiv.className = "admin-card";
        petDiv.innerHTML = `
          <h4>${p.pet_name}</h4>
          <p>${p.story_description || ""}</p>
          <div class="admin-images">
            ${p.images
              .map(
                (i) => `
              <div class="image-thumb">
                <img src="${i.image_url}" />
                <button class="btn-delete delete-img" data-pet="${p.id}" data-id="${i.id}">🗑</button>
              </div>`
              )
              .join("")}
          </div>
          <button class="btn-delete delete-pet" data-id="${p.id}">Delete Pet</button>
        `;
        container.appendChild(petDiv);
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
          const id = e.target.dataset.id;
          const petId = e.target.dataset.pet;
          await fetch(`/api/pets/${petId}/images/${id}`, { method: "DELETE" });
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
  // RATES
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

      document.querySelectorAll(".delete-rate").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          await fetch(`/api/rates/${e.target.dataset.id}`, { method: "DELETE" });
          loadRates();
        })
      );

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
            body: JSON.stringify({
              service_type: type,
              rate_per_unit: price,
              unit_type: unit,
              description: desc,
            }),
          });
          loadRates();
        })
      );

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
  // CONTACTS
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
