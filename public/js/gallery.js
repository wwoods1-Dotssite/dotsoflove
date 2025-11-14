/* =========================================================
   gallery.js – Responsive Gallery with Modal
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📸 Initializing Gallery...");

  const dorothyContainer = document.getElementById("dorothyGallery");
  const clientContainer = document.getElementById("clientGallery");

  // If there are no gallery containers, bail out quietly
  if (!dorothyContainer && !clientContainer) {
    console.warn("Gallery containers not found in DOM. Skipping gallery.js.");
    return;
  }

  const modal    = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const caption  = document.getElementById("caption");
  const prevBtn  = document.getElementById("prevBtn");
  const nextBtn  = document.getElementById("nextBtn");
  const closeBtn = document.querySelector(".close");

  let allImages = [];   // flattened list of all images in display order
  let currentIndex = 0; // index into allImages[]

  /* ================================
     MODAL HELPERS
     ================================ */

  function renderCurrentImage() {
    const data = allImages[currentIndex];
    if (!data || !modalImg || !caption) return;

    modalImg.src = data.url;
    modalImg.alt = data.alt || data.petName || "Pet photo";
    caption.textContent = data.caption || data.petName || "";
  }

  function openModalFromIndex(index) {
    if (!modal) return;
    if (!allImages.length) return;

    currentIndex = index;
    renderCurrentImage();
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  function showPrevImage() {
    if (!allImages.length) return;
    currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    renderCurrentImage();
  }

  function showNextImage() {
    if (!allImages.length) return;
    currentIndex = (currentIndex + 1) % allImages.length;
    renderCurrentImage();
  }

  // Wire modal controls **only if** the buttons exist
  if (modal) {
    if (prevBtn && typeof prevBtn.addEventListener === "function") {
      prevBtn.addEventListener("click", showPrevImage);
    }

    if (nextBtn && typeof nextBtn.addEventListener === "function") {
      nextBtn.addEventListener("click", showNextImage);
    }

    if (closeBtn && typeof closeBtn.addEventListener === "function") {
      closeBtn.addEventListener("click", closeModal);
    }

    // Click outside image closes modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // ESC closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  } else {
    console.warn("Image modal elements not found; gallery will show thumbnails only.");
  }

  /* ================================
     RENDER HELPERS
     ================================ */

  function createThumb(img, petName) {
    const thumb = document.createElement("img");
    thumb.className = "pet-thumb";
    thumb.src = img.image_url;
    thumb.alt = petName || "Pet photo";

    const globalIndex = allImages.length;
    allImages.push({
      url: img.image_url,
      petName,
      caption: petName,
      alt: petName
    });

    thumb.addEventListener("click", () => openModalFromIndex(globalIndex));
    return thumb;
  }

  function createPlaceholderThumb() {
    const wrap = document.createElement("div");
    wrap.className = "pet-thumb pet-thumb--empty";
    wrap.textContent = "No photos yet";
    return wrap;
  }

  function renderPetCard(pet) {
    const card = document.createElement("article");
    card.className = "pet-card";

    const nameEl = document.createElement("h3");
    nameEl.className = "pet-name";
    nameEl.textContent = pet.pet_name || "Unnamed friend";

    const storyEl = document.createElement("p");
    storyEl.className = "pet-story";
    storyEl.textContent = pet.story_description || "";

    const strip = document.createElement("div");
    strip.className = "pet-images-row";

    if (Array.isArray(pet.images) && pet.images.length > 0) {
      pet.images.forEach((img) => {
        if (!img || !img.image_url) return;
        strip.appendChild(createThumb(img, pet.pet_name));
      });
    } else {
      strip.appendChild(createPlaceholderThumb());
    }

    card.appendChild(nameEl);
    card.appendChild(storyEl);
    card.appendChild(strip);

    const target = pet.is_dorothy_pet ? dorothyContainer : clientContainer;
    if (target) target.appendChild(card);
  }

  /* ================================
     LOAD DATA FROM API
     ================================ */

  async function loadPets() {
    try {
      console.log("🐶 Fetching pets for gallery...");
      const res = await fetch("/api/pets");

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const pets = await res.json();

      // Clear existing
      if (dorothyContainer) dorothyContainer.innerHTML = "";
      if (clientContainer) clientContainer.innerHTML = "";
      allImages = [];

      pets.forEach(renderPetCard);
      console.log(`✅ Loaded pets: ${pets.length}`);
    } catch (err) {
      console.error("❌ Error loading pets for gallery:", err);
    }
  }

  // Kick things off
  await loadPets();
});
