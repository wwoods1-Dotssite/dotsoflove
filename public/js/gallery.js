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
  const modalImg = modal ? document.getElementById("modalImage") : null;
  const caption = modal ? document.getElementById("caption") : null;
  const closeBtn = modal ? modal.querySelector(".image-modal-close") : null;
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const modalReady =
    !!modal && !!modalImg && !!caption && !!closeBtn && !!prevBtn && !!nextBtn;

  if (!modalReady) {
    console.warn("[Gallery] Modal pieces missing; thumbnails only.");
  }

  // ===============================
  // Modal state + helpers
  // ===============================
  let currentImages = [];
  let currentIndex = 0;
  let currentCaption = "";

  function updateModalImage() {
    if (!currentImages.length) return;
    const url = currentImages[currentIndex];
    modalImg.src = url;
    modalImg.alt = currentCaption || "Pet photo";
    caption.textContent = currentCaption || "";
  }

  function openModal(images, startIndex = 0, petName = "") {
    if (!modalReady) return;

    currentImages = images || [];
    if (!currentImages.length) return;

    currentIndex = startIndex;
    currentCaption = petName;

    updateModalImage();

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    console.log("[Gallery] Opening modal for", petName, "index", startIndex);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    console.log("[Gallery] Closing modal");
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // Backdrop click (clicking outside the content)
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (
        e.target === modal ||
        e.target.classList.contains("image-modal-backdrop")
      ) {
        closeModal();
      }
    });
  }

  // ESC key closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });

  // Prev / Next
  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentImages.length) return;
      currentIndex =
        (currentIndex - 1 + currentImages.length) % currentImages.length;
      updateModalImage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentImages.length) return;
      currentIndex = (currentIndex + 1) % currentImages.length;
      updateModalImage();
    });
  }

  // ===============================
  // Card creation
  // ===============================
  function createPetCard(pet) {
    const card = document.createElement("article");
    card.className = "pet-card";

    const images = (pet.images || [])
      .filter((img) => img && img.image_url)
      .map((img) => img.image_url);

    card.dataset.images = JSON.stringify(images);
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

    if (images.length) {
      images.forEach((url, index) => {
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

  // ===============================
  // Attach thumbnail click -> modal
  // ===============================
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

      openModal(urls, index, name);
    });
  }

  // ===============================
  // Fetch + render pets
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

      dorothyPets.forEach((pet) =>
        dorothyGrid.appendChild(createPetCard(pet))
      );
      clientPets.forEach((pet) =>
        clientGrid.appendChild(createPetCard(pet))
      );

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
