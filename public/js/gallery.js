/* gallery.js – Responsive gallery with thumbnail modal */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🖼 Initializing Gallery…");

  const dorothyGrid = document.getElementById("dorothyGallery");
  const clientGrid = document.getElementById("clientGallery");

  if (!dorothyGrid || !clientGrid) {
    console.warn("Gallery containers not found in DOM.");
    return;
  }

  // ===============================
  // MODAL ELEMENTS
  // ===============================
  const modal = document.getElementById("imageModal");
  const modalImg = modal ? modal.querySelector(".image-modal-img") : null;
  const modalCaption = modal ? modal.querySelector(".image-modal-caption") : null;
  const modalClose = modal ? modal.querySelector(".image-modal-close") : null;
  const modalPrev = modal ? modal.querySelector(".image-modal-prev") : null;
  const modalNext = modal ? modal.querySelector(".image-modal-next") : null;

  const modalAvailable =
    modal && modalImg && modalCaption && modalClose && modalPrev && modalNext;

  if (!modalAvailable) {
    console.warn(
      "[Gallery] Image modal elements not found; gallery will show thumbnails only."
    );
  }

  // ===============================
  // MODAL STATE + HELPERS
  // ===============================
  let currentImages = [];
  let currentIndex = 0;
  let currentTitle = "";

  function updateModalImage() {
    if (!modalAvailable || !currentImages.length) return;

    const url = currentImages[currentIndex];
    modalImg.src = url;
    modalImg.alt = currentTitle ? `${currentTitle} photo` : "Pet photo";

    if (modalCaption) {
      modalCaption.textContent = currentTitle || "";
    }
  }

  function openImageModal(urls, startIndex = 0, title = "") {
    if (!modalAvailable) return;
    if (!urls || !urls.length) return;

    currentImages = urls;
    currentIndex = startIndex;
    currentTitle = title;

    updateModalImage();

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // lock background scroll
  }

  function closeImageModal() {
    if (!modalAvailable) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Bind modal controls (if available)
  if (modalAvailable) {
    // Close button
    modalClose.addEventListener("click", () => {
      closeImageModal();
    });

    // Click backdrop to close (click outside content)
    modal.addEventListener("click", (e) => {
      if (
        e.target === modal ||
        e.target.classList.contains("image-modal-backdrop")
      ) {
        closeImageModal();
      }
    });

    // Keyboard ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeImageModal();
      }
    });

    // Prev / Next
    modalPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentImages.length) return;
      currentIndex =
        (currentIndex - 1 + currentImages.length) % currentImages.length;
      updateModalImage();
    });

    modalNext.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentImages.length) return;
      currentIndex = (currentIndex + 1) % currentImages.length;
      updateModalImage();
    });
  }

  // ===============================
  // RENDER HELPERS
  // ===============================
  function createPetCard(pet) {
    const card = document.createElement("article");
    card.className = "pet-card";

    // store data for modal
    const imageUrls = (pet.images || [])
      .filter((img) => img && img.image_url)
      .map((img) => img.image_url);

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
    if (!modalAvailable) return;

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
  // FETCH + RENDER PETS
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
