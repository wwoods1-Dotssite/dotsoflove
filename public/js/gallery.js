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

  // Fetch pets from backend
  async function loadGallery() {
    try {
      const res = await fetch("/api/pets");
      const pets = await res.json();

      // Separate Dorothy’s pets from clients
      const dorothyPets = pets.filter(p => p.is_dorothy_pet);
      const clientPets = pets.filter(p => !p.is_dorothy_pet);

      renderPets(dorothyPets, dorothyGallery);
      renderPets(clientPets, clientGallery);
    } catch (err) {
      console.error("❌ Error loading gallery:", err);
    }
  }

  // Render each pet card
  function renderPets(pets, container) {
    if (!container) return;
    container.innerHTML = "";

    if (!pets.length) {
      container.innerHTML = `<p class="empty-msg">No pets to display yet.</p>`;
      return;
    }

    pets.forEach(pet => {
      const images = pet.images || [];
      if (!images.length) return;

      const primaryImage =
        images.find(img => img.is_primary) || images[0];

      const card = document.createElement("div");
      card.classList.add("gallery-card");

      card.innerHTML = `
        <img src="${primaryImage.image_url}" alt="${pet.pet_name}" class="gallery-thumb" />
        <div class="gallery-info">
          <h4>${pet.pet_name}</h4>
          <p>${pet.story_description || "A lovely companion"}</p>
        </div>
      `;

      container.appendChild(card);

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
