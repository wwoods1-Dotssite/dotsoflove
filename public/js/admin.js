// ====================================
// ADMIN DASHBOARD (with PETS overhaul)
// ====================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin dashboard initialized");

  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const statusEl = document.getElementById("adminLoginStatus");
  const token = localStorage.getItem("adminToken");

  // ==============================
  // LOGIN / AUTH
  // ==============================
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
      if (!username || !password) return;

      statusEl.textContent = "🔐 Logging in...";
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
          setTimeout(() => {
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            initDashboard();
          }, 500);
        } else {
          statusEl.textContent = "❌ Invalid credentials.";
        }
      } catch {
        statusEl.textContent = "⚠️ Server error during login.";
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
  // DASHBOARD SETUP
  // ==============================
  function initDashboard() {
    setupTabs();
    loadPets();
    loadRates();
    loadContacts();
  }

  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        const tab = document.getElementById(`tab-${btn.dataset.tab}`);
        if (tab) tab.classList.add("active");
      });
    });
  }

  // ==============================
  // PETS CRUD (with Modal)
  // ==============================
  const petModal = document.getElementById("petModal");
  const petForm = document.getElementById("petForm");
  const petModalTitle = document.getElementById("petModalTitle");
  const petFormStatus = document.getElementById("petFormStatus");
  const closePetModal = document.getElementById("closePetModal");
  let editMode = false;
  let editingPetId = null;

  if (closePetModal) {
    closePetModal.addEventListener("click", () => {
      petModal.classList.add("hidden");
      petForm.reset();
    });
  }

  async function loadPets() {
    try {
      const res = await fetch("/api/gallery");
      const pets = await res.json();
      const list = document.getElementById("petList");
      list.innerHTML = "";

      pets.forEach((p) => {
        const card = document.createElement("div");
        card.className = "admin-card";
        card.innerHTML = `
          <h4>${p.pet_name}</h4>
          <p>${p.story_description || ""}</p>
          <div class="image-row">
            ${
              p.images && p.images.length
                ? p.images
                    .map(
                      (img) => `
                  <div class="image-thumb">
                    <img src="${img.image_url}" alt="${p.pet_name}">
                    <button class="delete-img" data-pet="${p.id}" data-id="${img.id}">🗑</button>
                  </div>
                `
                    )
                    .join("")
                : "<p>No images uploaded.</p>"
            }
          </div>
          <div class="actions">
            <button class="btn-edit" data-id="${p.id}" data-name="${p.pet_name}" data-desc="${p.story_description || ""}">Edit</button>
            <button class="btn-delete delete-pet" data-id="${p.id}">Delete</button>
          </div>
        `;
        list.appendChild(card);
      });

      document.querySelectorAll(".delete-pet").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          if (!confirm("Delete this pet?")) return;
          await fetch(`/api/pets/${e.target.dataset.id}`, { method: "DELETE" });
          loadPets();
        })
      );

      document.querySelectorAll(".delete-img").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          const petId = e.target.dataset.pet;
          const imgId = e.target.dataset.id;
          await fetch(`/api/pets/${petId}/images/${imgId}`, { method: "DELETE" });
          loadPets();
        })
      );

      document.querySelectorAll(".btn-edit").forEach((btn) =>
        btn.addEventListener("click", (e) => {
          editMode = true;
          editingPetId = e.target.dataset.id;
          petModalTitle.textContent = "Edit Pet";
          document.getElementById("petName").value = e.target.dataset.name;
          document.getElementById("storyDescription").value = e.target.dataset.desc;
          petModal.classList.remove("hidden");
        })
      );

      const addPetBtn = document.getElementById("addPetBtn");
      if (addPetBtn) {
        addPetBtn.onclick = () => {
          editMode = false;
          editingPetId = null;
          petModalTitle.textContent = "Add New Pet";
          petForm.reset();
          petModal.classList.remove("hidden");
        };
      }
    } catch (err) {
      console.error("Error loading pets:", err);
    }
  }

  if (petForm) {
    petForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(petForm);
      petFormStatus.textContent = "Saving...";
      try {
        const method = editMode ? "PUT" : "POST";
        const url = editMode ? `/api/pets/${editingPetId}` : "/api/pets";
        await fetch(url, { method, body: formData });
        petFormStatus.textContent = "✅ Pet saved!";
        setTimeout(() => {
          petModal.classList.add("hidden");
          loadPets();
        }, 800);
      } catch (err) {
        console.error("Error saving pet:", err);
        petFormStatus.textContent = "❌ Error saving pet.";
      }
    });
  }

  // ==============================
  // Placeholder Loaders for Other Tabs
  // ==============================
  async function loadRates() {
    document.getElementById("rateList").innerHTML = "<p>Rates loading...</p>";
  }

  async function loadContacts() {
    document.getElementById("contactList").innerHTML = "<p>Contacts loading...</p>";
  }
});
