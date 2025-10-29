
// admin.js - Enhanced Pets Management
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
        <button class="btn-secondary edit-pet" data-id="${pet.id}">Edit</button>
        <button class="btn-danger delete-pet" data-id="${pet.id}">Delete</button>
      `;
      petList.appendChild(card);
    });

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
});
