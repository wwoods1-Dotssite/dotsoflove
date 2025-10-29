// ===============================
// Gallery Logic (Final Stable Build)
// ===============================

// ---------- GLOBALS ----------
const API_BASE = "/api";
let allPets = [];
let currentGalleryImages = [];
let currentImageIndex = 0;

// ---------- LOAD GALLERY ----------
async function loadGallery() {
  console.log("🐾 Loading gallery...");
  const dorothyPetsContainer = document.getElementById("dorothyPets");
  const clientPetsContainer = document.getElementById("clientPets");

  try {
    const res = await fetch(`${API_BASE}/gallery`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const pets = await res.json();
    allPets = pets;

    const dorothyPets = pets.filter((p) => p.is_dorothy_pet);
    const clientPets = pets.filter((p) => !p.is_dorothy_pet);


    dorothyPetsContainer.innerHTML = dorothyPets.length
      ? dorothyPets
          .map(
            (pet) => `
          <div class="gallery-card" data-pet="${pet.id}">
            <img src="${pet.images?.[0]?.image_url || ""}" alt="${pet.pet_name}" />
            <h4>${pet.pet_name}</h4>
            <p>${pet.story_description || ""}</p>
            ${
              pet.images?.length > 1
                ? `<p class="muted">📸 Click to view more photos</p>`
                : ""
            }
          </div>`
          )
          .join("")
      : `<p class="muted">No pets to display yet.</p>`;

    clientPetsContainer.innerHTML = clientPets.length
      ? clientPets
          .map(
            (pet) => `
          <div class="gallery-card" data-pet="${pet.id}">
            <img src="${pet.images?.[0]?.image_url || ""}" alt="${pet.pet_name}" />
            <h4>${pet.pet_name}</h4>
            <p>${pet.story_description || ""}</p>
            ${
              pet.images?.length > 1
                ? `<p class="muted">📸 Click to view more photos</p>`
                : ""
            }
          </div>`
          )
          .join("")
      : `<p class="muted">No client pets to show yet.</p>`;

    bindGalleryClicks();
  } catch (err) {
    console.error("❌ Failed to load gallery:", err);
    dorothyPetsContainer.innerHTML = `<p class="error">Error loading gallery. Please try again later.</p>`;
  }
}

// ---------- GALLERY CLICK HANDLERS ----------
function bindGalleryClicks() {
  const cards = document.querySelectorAll(".gallery-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const petId = card.dataset.pet;
      const pet = allPets.find((p) => p.id == petId);
      if (pet && pet.images?.length) {
        openImageModal(pet.images);
      }
    });
  });
}

// ---------- MODAL / CAROUSEL ----------
function openImageModal(images) {
  currentGalleryImages = images;
  currentImageIndex = 0;

  const modal = document.getElementById("imageModal");
  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `<img src="${images[0].image_url}" alt="Pet photo" />`;

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // Prevent scrolling background

  bindModalControls();
}

function bindModalControls() {
  const modal = document.getElementById("imageModal");
  const closeBtn = document.getElementById("modalClose");
  const prevBtn = document.getElementById("modalPrev");
  const nextBtn = document.getElementById("modalNext");

  // Close modal
  closeBtn.onclick = () => closeModal();
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  // Navigation
  prevBtn.onclick = () => showPrevImage();
  nextBtn.onclick = () => showNextImage();

  // Keyboard controls
  document.onkeydown = (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showPrevImage();
    if (e.key === "ArrowRight") showNextImage();
  };
}

function closeModal() {
  const modal = document.getElementById("imageModal");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.onkeydown = null;
}

function showPrevImage() {
  if (!currentGalleryImages.length) return;
  currentImageIndex =
    (currentImageIndex - 1 + currentGalleryImages.length) %
    currentGalleryImages.length;
  updateModalImage();
}

function showNextImage() {
  if (!currentGalleryImages.length) return;
  currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length;
  updateModalImage();
}

function updateModalImage() {
  const modalBody = document.getElementById("modalBody");
  const current = currentGalleryImages[currentImageIndex];
  modalBody.innerHTML = `<img src="${current.image_url}" alt="Pet photo" />`;
}
