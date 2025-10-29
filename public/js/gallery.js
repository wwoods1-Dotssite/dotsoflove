// ===============================
// GALLERY.JS (vFinal Patched)
// ===============================

console.log("🐾 Loading gallery...");

async function loadGallery() {
  const container = document.getElementById("galleryContainer");
  if (!container) return;

  try {
    const res = await fetch("/api/gallery");
    const pets = await res.json();

    // Split pets by owner type
    const dorothyPets = pets.filter((p) => p.is_dorothy_pet);
    const clientPets = pets.filter((p) => !p.is_dorothy_pet);

    // Helper to create pet card HTML
    const createPetCard = (pet) => `
      <div class="gallery-card" data-pet="${pet.id}">
        <img src="${pet.images?.[0]?.image_url || '/img/placeholder.jpg'}" 
             alt="${pet.pet_name}" class="gallery-thumb">
        <h4>${pet.pet_name}</h4>
        <p>${pet.story_description || ""}</p>
      </div>
    `;

    container.innerHTML = `
      <h2>Pet Gallery</h2>
      <p>Meet my fur family and some of the wonderful pets I've cared for!</p>

      <div class="card">
        <h3>🐾 Dorothy's Pet Family</h3>
        <p>These are my own pets — the heart and inspiration for Dot’s of Love!</p>
        <div class="gallery-grid">
          ${
            dorothyPets.length
              ? dorothyPets.map(createPetCard).join("")
              : `<p>No pets to display yet.</p>`
          }
        </div>
      </div>

      <div class="card">
        <h3>⭐ Happy Clients</h3>
        <div class="gallery-grid">
          ${
            clientPets.length
              ? clientPets.map(createPetCard).join("")
              : `<p>No client photos yet.</p>`
          }
        </div>
      </div>
    `;

    // Handle modal image viewing
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeModal = document.getElementById("modalClose");

    document.querySelectorAll(".gallery-card img").forEach((img) => {
      img.addEventListener("click", () => {
        modalImg.src = img.src;
        modal.removeAttribute("hidden");
      });
    });

    closeModal.addEventListener("click", () => modal.setAttribute("hidden", ""));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.setAttribute("hidden", "");
    });

    console.log(`✅ Gallery loaded: ${dorothyPets.length} Dorothy pets, ${clientPets.length} client pets`);
  } catch (err) {
    console.error("❌ Failed to load gallery:", err);
    container.innerHTML = `<p class="error">Failed to load pets.</p>`;
  }
}
