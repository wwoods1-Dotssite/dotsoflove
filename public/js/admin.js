// ===================================================
//  admin.js — Dots of Love Admin Dashboard (CommonJS)
// ===================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin Dashboard initialized");

  // ------------------------------
  // DOM ELEMENTS
  // ------------------------------
  const loginForm = document.getElementById("adminLoginForm");
  const loginSection = document.getElementById("adminLogin");
  const adminSection = document.getElementById("admin");
  const statusMsg = document.getElementById("adminLoginStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".admin-tab");

  // ------------------------------
  // HELPER FUNCTIONS
  // ------------------------------
  const adminFetch = async (url, options = {}) => {
    const token = localStorage.getItem("adminToken");
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const showSection = (section) => {
    tabs.forEach((t) => t.classList.remove("active"));
    document.getElementById(`tab-${section}`).classList.add("active");
    tabButtons.forEach((b) => b.classList.remove("active"));
    document.querySelector(`[data-tab="${section}"]`).classList.add("active");
  };

  // ------------------------------
  // LOGIN HANDLER
  // ------------------------------
  const initLogin = () => {
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value.trim();
      statusMsg.textContent = "Authenticating...";

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          console.log("✅ Admin authenticated");
          localStorage.setItem("adminToken", data.token);
          loginSection.style.display = "none";
          adminSection.style.display = "block";
          statusMsg.textContent = "";

          // initialize dashboard
          loadPets();
          loadRates();
          loadContacts();
        } else {
          statusMsg.textContent = "❌ Invalid credentials";
        }
      } catch (err) {
        console.error("❌ Login error:", err);
        statusMsg.textContent = "Server error. Try again later.";
      }
    });
  };

  // ------------------------------
  // LOGOUT HANDLER
  // ------------------------------
  const initLogout = () => {
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      adminSection.style.display = "none";
      loginSection.style.display = "block";
    });
  };

  // ------------------------------
  // PETS CRUD
  // ------------------------------
  async function loadPets() {
    try {
      const res = await adminFetch("/api/pets");
      const pets = await res.json();
      const list = document.getElementById("petList");
      list.innerHTML = "";

      pets.forEach((pet) => {
        const card = document.createElement("div");
        card.className = "admin-card";
        card.innerHTML = `
          <h4>${pet.pet_name}</h4>
          <p>${pet.story_description || ""}</p>
          <p><strong>Dorothy’s Pet:</strong> ${pet.is_dorothy_pet ? "Yes" : "No"}</p>
          ${
            pet.images && pet.images.length
              ? `<div class="admin-image-grid">
                  ${pet.images
                    .map(
                      (img) => `
                    <div class="img-wrap">
                      <img src="${img.image_url}" alt="Pet Image">
                      <button class="btn-danger small delete-image" data-id="${img.id}">🗑</button>
                    </div>`
                    )
                    .join("")}
                </div>`
              : "<p>No images</p>"
          }
          <div class="admin-btn-row">
            <button class="btn-primary edit-pet" data-id="${pet.id}">✏️ Edit</button>
            <button class="btn-danger delete-pet" data-id="${pet.id}">🗑 Delete</button>
          </div>
        `;
        list.appendChild(card);
      });

      // Delete Pet
      document.querySelectorAll(".delete-pet").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (!confirm("Delete this pet and its images?")) return;
          await adminFetch(`/api/pets/${id}`, { method: "DELETE" });
          loadPets();
        });
      });

      // Delete Image
      document.querySelectorAll(".delete-image").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (!confirm("Delete this image?")) return;
          await adminFetch(`/api/pets/images/${id}`, { method: "DELETE" });
          loadPets();
        });
      });

      // Edit Pet
      document.querySelectorAll(".edit-pet").forEach((btn) => {
        btn.addEventListener("click", () => openPetModal(btn.dataset.id));
      });
    } catch (err) {
      console.error("❌ Load pets failed:", err);
    }
  }

  async function openPetModal(id) {
    try {
      const res = await adminFetch(`/api/pets/${id}`);
      if (!res.ok) throw new Error("Pet not found");
      const pet = await res.json();

      const name = prompt("Pet Name:", pet.pet_name || "");
      const story = prompt("Story:", pet.story_description || "");
      const dorothy = confirm("Is this Dorothy’s pet?");

      const body = JSON.stringify({
        name,
        story,
        is_dorothy: dorothy,
      });

      const update = await adminFetch(`/api/pets/${id}`, {
        method: "PUT",
        body,
      });

      if (update.ok) loadPets();
    } catch (err) {
      console.error("❌ Edit pet failed:", err);
    }
  }

  // ------------------------------
  // RATES CRUD
  // ------------------------------
  async function loadRates() {
    try {
      const res = await adminFetch("/api/rates");
      const rates = await res.json();
      const list = document.getElementById("rateList");
      list.innerHTML = "";

      rates.forEach((r) => {
        const div = document.createElement("div");
        div.className = "admin-card";
        div.innerHTML = `
          <h4>${r.service_type}</h4>
          <p>${r.description || ""}</p>
          <p><strong>$${r.rate_per_unit}</strong> ${r.unit_type}</p>
          <div class="admin-btn-row">
            <button class="btn-primary edit-rate" data-id="${r.id}">✏️ Edit</button>
            <button class="btn-danger delete-rate" data-id="${r.id}">🗑 Delete</button>
          </div>
        `;
        list.appendChild(div);
      });

      // Edit Rate
      document.querySelectorAll(".edit-rate").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const rate = rates.find((r) => r.id == id);
          const type = prompt("Service Type:", rate.service_type);
          const desc = prompt("Description:", rate.description || "");
          const amt = prompt("Rate per unit:", rate.rate_per_unit);
          const unit = prompt("Unit type:", rate.unit_type);
          const featured = confirm("Is this Featured?");
          await adminFetch(`/api/rates/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              service_type: type,
              description: desc,
              rate_per_unit: amt,
              unit_type: unit,
              featured,
            }),
          });
          loadRates();
        });
      });

      // Delete Rate
      document.querySelectorAll(".delete-rate").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (!confirm("Delete this rate?")) return;
          await adminFetch(`/api/rates/${id}`, { method: "DELETE" });
          loadRates();
        });
      });
    } catch (err) {
      console.error("❌ Load rates failed:", err);
    }
  }

  // ------------------------------
  // CONTACT REQUESTS
  // ------------------------------
  async function loadContacts() {
    try {
      const res = await adminFetch("/api/contacts");
      const contacts = await res.json();
      const list = document.getElementById("contactList");
      list.innerHTML = "";

      contacts.forEach((c) => {
        const div = document.createElement("div");
        div.className = "admin-card";
        div.innerHTML = `
          <h4>${c.name}</h4>
          <p><strong>Email:</strong> ${c.email}</p>
          <p><strong>Phone:</strong> ${c.phone}</p>
          <p><strong>Service:</strong> ${c.service}</p>
          <p><strong>Dates:</strong> ${c.start_date || ""} → ${c.end_date || ""}</p>
          <p><strong>Message:</strong> ${c.message || ""}</p>
          <p><em>Created: ${new Date(c.created_at).toLocaleDateString()}</em></p>
          <div class="admin-btn-row">
            <button class="btn-success mark-contacted" data-id="${c.id}">✅ Mark Contacted</button>
            <button class="btn-danger delete-contact" data-id="${c.id}">🗑 Delete</button>
          </div>
        `;
        list.appendChild(div);
      });

      // Mark Contacted
      document.querySelectorAll(".mark-contacted").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          await adminFetch(`/api/contacts/${id}/contacted`, { method: "PUT" });
          loadContacts();
        });
      });

      // Delete Contact
      document.querySelectorAll(".delete-contact").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (!confirm("Delete this contact?")) return;
          await adminFetch(`/api/contacts/${id}`, { method: "DELETE" });
          loadContacts();
        });
      });
    } catch (err) {
      console.error("❌ Load contacts failed:", err);
    }
  }

  // ------------------------------
  // INITIALIZATION
  // ------------------------------
  const token = localStorage.getItem("adminToken");
  if (token) {
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    loadPets();
    loadRates();
    loadContacts();
  } else {
    adminSection.style.display = "none";
    loginSection.style.display = "block";
  }

  initLogin();
  initLogout();

  // Default tab
  if (document.querySelector('[data-tab="pets"]')) {
    document.querySelector('[data-tab="pets"]').click();
  }

// ------------------------------
// LIGHTBOX CAROUSEL FOR PET IMAGES
// ------------------------------
let currentImageIndex = 0;
let currentImages = [];

const lightbox = document.getElementById("adminLightbox");
const lightboxImg = document.getElementById("lightboxImage");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxClose = document.getElementById("lightboxClose");

// Open lightbox on image click
document.addEventListener("click", (e) => {
  if (e.target.closest(".admin-image-grid img")) {
    const imgElements = Array.from(
      e.target.closest(".admin-image-grid").querySelectorAll("img")
    );
    currentImages = imgElements.map((img) => img.src);
    currentImageIndex = imgElements.indexOf(e.target);
    openLightbox(currentImages[currentImageIndex]);
  }
});

function openLightbox(src) {
  lightbox.classList.remove("hidden");
  lightboxImg.src = src;
}

// Close lightbox
function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxImg.src = "";
  currentImages = [];
  currentImageIndex = 0;
}

if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
if (lightbox) lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Navigate previous / next
function showPrevImage() {
  if (currentImages.length === 0) return;
  currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
  lightboxImg.src = currentImages[currentImageIndex];
}

function showNextImage() {
  if (currentImages.length === 0) return;
  currentImageIndex = (currentImageIndex + 1) % currentImages.length;
  lightboxImg.src = currentImages[currentImageIndex];
}

if (lightboxPrev) lightboxPrev.addEventListener("click", showPrevImage);
if (lightboxNext) lightboxNext.addEventListener("click", showNextImage);

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "ArrowLeft") showPrevImage();
  if (e.key === "ArrowRight") showNextImage();
  if (e.key === "Escape") closeLightbox();
});
  
});
