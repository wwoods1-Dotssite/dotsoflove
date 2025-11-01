/* =========================================
   gallery.js — Responsive Gallery with Modal
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  console.log("📸 Initializing Gallery...");

  const dorothyGallery = document.getElementById("dorothyGallery");
  const clientGallery = document.getElementById("clientGallery");
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const caption = document.getElementById("caption");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const closeBtn = document.querySelector(".close");

  let allImages = [];
  let currentIndex = 0;

 // ===============================
// GALLERY INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Gallery...");
  await loadPets();
});

// ===============================
// LOAD PETS FROM API
// ===============================
async function loadPets() {
  try {
    const res = await fetch("/api/pets");
    const pets = await res.json();
    console.log("Loaded pets:", pets);

    const dorothyContainer = document.getElementById("dorothyPets");
    const clientContainer = document.getElementById("clientPets");
    dorothyContainer.innerHTML = "";
    clientContainer.innerHTML = "";

    pets.forEach((pet) => {
      const card = document.createElement("div");
      card.classList.add("gallery-card");

      // Add thumbnail or placeholder 🐾
      let imageHTML = "";
      if (pet.images && pet.images.length > 0) {
        imageHTML = `
          <img src="${pet.images[0].image_url}" alt="${pet.pet_name}" class="gallery-thumb" />
        `;
      } else {
        imageHTML = `
          <div class="no-image-placeholder">
            <div class="placeholder-icon">🐾</div>
            <div class="placeholder-text">No photo yet</div>
          </div>
        `;
      }

      // Build card HTML
      card.innerHTML = `
        ${imageHTML}
        <div class="gallery-info">
          <h3>${pet.pet_name}</h3>
          <p>${pet.story_description || ""}</p>
        </div>
      `;

      if (pet.is_dorothy_pet) {
        dorothyContainer.appendChild(card);
      } else {
        clientContainer.appendChild(card);
      }
    });
  } catch (err) {
    console.error("Error loading gallery pets:", err);
  }
}
      // Bind click to open modal carousel
      card.addEventListener("click", () => openModal(images, pet.pet_name));
    });
  }

  // Open modal carousel
  function openModal(images, petName) {
    if (!images.length) return;

    allImages = images;
    currentIndex = 0;

    modal.style.display = "block";
    updateModalImage(petName);
  }

  // Update modal image
  function updateModalImage(petName) {
    const imgData = allImages[currentIndex];
    if (!imgData) return;

    modalImg.src = imgData.image_url;
    caption.textContent = `${petName} — ${imgData.is_primary ? "Primary" : "Gallery Image"}`;
  }

  // Navigation
  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    updateModalImage();
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % allImages.length;
    updateModalImage();
  });

  // Close modal
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  loadGallery();
});
