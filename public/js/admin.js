// admin.js - Enhanced Pets Management with Edit/Delete support
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin dashboard initialized");

  const token = localStorage.getItem("adminToken");
  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");
  const loginForm = document.getElementById("adminLoginForm");
  const petList = document.getElementById("petList");
  const addPetBtn = document.getElementById("addPetBtn");

  if (!token) {
    loginSection.style.display = "block";
    dashboardSection.style.display = "none";
  } else {
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";
    loadPets();
  }

  // ---------- ADMIN LOGIN ----------
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value.trim();
      const statusEl = document.getElementById("adminLoginStatus");

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("adminToken", data.token);
          statusEl.textContent = "✅ Login successful";
          setTimeout(() => location.reload(), 1000);
        } else {
          statusEl.textContent = "❌ Invalid credentials";
        }
      } catch (err) {
        statusEl.textContent = "Server error";
      }
    });
  }

  // ---------- LOAD PETS ----------
  async function loadPets() {
    petList.innerHTML = "Loading pets...";
    try {
      const res = await fetch("/api/pets");
      const pets = await res.json();
      renderPets(pets);
    } catch (err) {
      console.error("Error loading pets:", err);
      petList.innerHTML = "Error loading pets";
    }
  }

  // ---------- RENDER PET CARDS ----------
  function renderPets(pets) {
    if (!Array.isArray(pets)) return;
    petList.innerHTML = "";

    pets.forEach((pet) => {
      const card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML = `
        <h4>${pet.pet_name}</h4>
        <p>${pet.story_description || ""}</p>
        <div class="pet-images">
          ${
            pet.images.length
              ? pet.images
                  .map(
                    (img) => `
                      <div class="img-box">
                        <img src="${img.image_url}" alt="${pet.pet_name}" />
                        <button class="delete-image" data-pet="${pet.id}" data-image="${img.id}">🗑️</button>
                      </div>`
                  )
                  .join("")
              : "<p>No images uploaded.</p>"
          }
        </div>
        <div class="admin-actions">
          <button class="btn-secondary edit-pet" data-id="${pet.id}">Edit</button>
          <button class="btn-danger delete-pet" data-id="${pet.id}">Delete</button>
        </div>
      `;
      petList.appendChild(card);
    });

    attachImageDeleteHandlers();
    attachPetEditHandlers();
    attachPetDeleteHandlers();
  }

  // ---------- DELETE IMAGE ----------
  function attachImageDeleteHandlers() {
    document.querySelectorAll(".delete-image").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const petId = e.target.dataset.pet;
        const imgId = e.target.dataset.image;
        if (!confirm("Delete this image?")) return;
        const res = await fetch(`/api/pets/${petId}/images/${imgId}`, { method: "DELETE" });
        if (res.ok) loadPets();
      });
    });
  }

  // ---------- DELETE PET ----------
  function attachPetDeleteHandlers() {
    document.querySelectorAll(".delete-pet").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const petId = e.target.dataset.id;
        if (!confirm("Are you sure you want to delete this pet?")) return;
        try {
          const res = await fetch(`/api/pets/${petId}`, { method: "DELETE" });
          if (res.ok) {
            alert("Pet deleted successfully!");
            loadPets();
          } else {
            alert("Failed to delete pet.");
          }
        } catch (err) {
          console.error("❌ Error deleting pet:", err);
        }
      });
    });
  }

  // ---------- EDIT PET ----------
  function attachPetEditHandlers() {
    document.querySelectorAll(".edit-pet").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const petId = e.target.dataset.id;
        const name = prompt("Enter new pet name:");
        const story = prompt("Enter new story description:");
        const isDorothy = confirm("Mark as Dorothy’s pet?");

        if (!name) return;

        try {
          const res = await fetch(`/api/pets/${petId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pet_name: name,
              story_description: story,
              is_dorothy_pet: isDorothy,
            }),
          });
          if (res.ok) {
            alert("Pet updated successfully!");
            loadPets();
          } else {
            alert("Failed to update pet.");
          }
        } catch (err) {
          console.error("❌ Edit Pet error:", err);
        }
      });
    });
  }

  // ---------- ADD PET PLACEHOLDER ----------
  if (addPetBtn) {
    addPetBtn.addEventListener("click", () => {
      alert("Add Pet modal coming soon!");
    });
  }
});
