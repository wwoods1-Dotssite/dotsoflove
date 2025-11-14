// gallery.js – Responsive gallery with modal carousel
document.addEventListener("DOMContentLoaded", () => {
  console.log("🖼 Initializing Gallery…");

  const dorothyGrid = document.getElementById("dorothyGallery");
  const clientGrid = document.getElementById("clientGallery");

  if (!dorothyGrid || !clientGrid) {
    console.warn("[Gallery] Grids not found in DOM.");
    return;
  }

  // ===============================
  // Modal elements
  // ===============================
  const modal = document.getElementById("imageModal");
  const modalImg = modal ? modal.querySelector("#modalImage") : null;
  const modalCaption = modal ? modal.querySelector("#caption") : null;
  const closeBtn = modal ? modal.querySelector(".image-modal-close") : null;
  const backdrop = modal ? modal.querySelector(".image-modal-backdrop") : null;
  const prevBtn = modal ? modal.querySelector("#prevBtn") : null;
  const nextBtn = modal ? modal.querySelector("#nextBtn") : null;

  const modalReady =
    modal && modalImg && modalCaption && closeBtn && prevBtn && nextBtn;

  if (!modalReady) {
    console.warn(
      "[Gallery] Modal pieces missing, thumbnails will still render but clicks will do nothing."
    );
  }

  // ===============================
  // Modal state + helpers
  // ===============================
  let currentImages = []; // array of URLs (strings)
  let currentIndex = 0;
  let currentPetName = "";

  function renderModalImage() {
    if (!currentImages.length || !modalImg) return;

    const url = currentImages[currentIndex];
    modalImg.src = url;
    modalImg.alt = `${currentPetName || "Pet"} photo ${currentIndex + 1}`;

    if (modalCaption) {
      modalCaption.textContent = currentPetName || "";
    }
  }

  function showModal() {
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openImageModal(images, startIndex, petName) {
    if (!modalReady) return;

    currentImages = images || [];
    if (!currentImages.length) return;

    currentIndex =
      typeof startIndex === "number" && !Number.isNaN(startIndex)
        ? startIndex
        : 0;
    currentPetName = petName || "";

    renderModalImage();
    showModal();
  }

  // Wire modal controls
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideModal();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      hideModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideModal();
    }
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentImages.length) return;
      currentIndex =
        (currentIndex - 1 + currentImages.length) % currentImages.length;
      renderModalImage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentImages.length) return;
      currentIndex = (currentIndex + 1) % currentImages.length;
      renderModalImage();
    });
  }

  // ===============================
  // Card rendering
  // ===============================
  function createPetCard(pet) {
    const card = document.createElement("article");
    card.className = "pet-card";

    const imageUrls = (pet.images || [])
      .filter((img) => img && img.image_url)
      .map((img) => img.image_url);

    // Store data needed for the modal
    card.dataset.images = JSON.stringify(imageUrls);
    card.dataset.petName = pet.pet_name || "";

    const title = document.createElement("h3");
    title.className = "pet-name";
    title.textContent = pet.pet_name || "Unnamed Pet";

    const story = document.createElement("p");
    story.className = "pet-story";
    story.textContent =
      pet.story_description || "This furry friend is still writing their story.";

    const imagesWrap = document.createElement("div");
    imagesWrap.className = "pet-images";

    if (imageUrls.length) {
      imageUrls.forEach((url, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pet-thumb";
        btn.dataset.index = String(index);

        const img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        img.alt = `${pet.pet_name || "Pet"} photo ${index + 1}`;

        btn.appendChild(img);
        imagesWrap.appendChild(btn);
      });
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "pet-thumb placeholder";
      placeholder.textContent = "No photos yet";
      imagesWrap.appendChild(placeholder);
    }

    card.appendChild(title);
    card.appendChild(story);
    card.appendChild(imagesWrap);

    return card;
  }

  function attachThumbnailClicks(grid) {
    if (!modalReady) return;

    grid.addEventListener("click", (evt) => {
      const thumb = evt.target.closest(".pet-thumb");
      if (!thumb) return;

      const card = thumb.closest(".pet-card");
      if (!card) return;

      const urls = JSON.parse(card.dataset.images || "[]");
      if (!urls.length) return;

      const index = parseInt(thumb.dataset.index || "0", 10) || 0;
      const name = card.dataset.petName || "";

      openImageModal(urls, index, name);
    });
  }

  // ===============================
  // Fetch + render
  // ===============================
  async function loadPets() {
    try {
      console.log("🐶 Fetching pets for gallery…");
      const res = await fetch("/api/pets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      console.log("✅ Loaded pets:", data.length);

      const dorothyPets = data.filter((p) => p.is_dorothy_pet);
      const clientPets = data.filter((p) => !p.is_dorothy_pet);

      dorothyGrid.innerHTML = "";
      clientGrid.innerHTML = "";

      dorothyPets.forEach((pet) => dorothyGrid.appendChild(createPetCard(pet)));
      clientPets.forEach((pet) => clientGrid.appendChild(createPetCard(pet)));

      attachThumbnailClicks(dorothyGrid);
      attachThumbnailClicks(clientGrid);
    } catch (err) {
      console.error("❌ Error loading pets for gallery:", err);
      dorothyGrid.innerHTML =
        '<p class="gallery-error">Sorry, the pet gallery is unavailable right now.</p>';
      clientGrid.innerHTML = "";
    }
  }

  loadPets();
});
