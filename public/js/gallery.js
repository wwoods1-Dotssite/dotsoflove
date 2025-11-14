// gallery.js – Responsive gallery with modal viewer

document.addEventListener("DOMContentLoaded", () => {
  console.log("🖼 Initializing Gallery…");

  const dorothyGrid = document.getElementById("dorothyGallery");
  const clientGrid = document.getElementById("clientGallery");

  if (!dorothyGrid || !clientGrid) {
    console.warn("[Gallery] Pet gallery containers not found in DOM.");
    return;
  }

  // ===============================
  // Modal wiring
  // ===============================
//  const modal = document.getElementById("imageModal");
 // const modalImg = document.getElementById("modalImage");
 // const modalCaption = document.getElementById("caption");
//  const prevBtn = document.getElementById("prevBtn");
//  const nextBtn = document.getElementById("nextBtn");
 // const closeBtn = modal ? modal.querySelector(".image-modal-close") : null;
//  const backdrop = modal ? modal.querySelector(".image-modal-backdrop") : null;



  // ===============================
  // MODAL HELPERS
  // ===============================

  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const modalCaption = document.getElementById("caption");
  const modalClose = modal ? modal.querySelector(".image-modal-close") : null;
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  let currentUrls = [];
 // let currentIndex = 0;
  let currentPetName = "";
  let currentImages = [];
  let currentIndex = 0;
  let currentCaption = "";

  const modalAvailable =
    modal && modalImg && modalCaption && prevBtn && nextBtn && closeBtn && backdrop;

  if (!modalAvailable) {
    console.warn(
      "[Gallery] Modal elements not found; thumbnails will work but no fullscreen viewer."
    );
  }

  function updateModalImage() {
    if (!modal || !modalImg || !currentUrls.length) return;

    const url = currentUrls[currentIndex];
    modalImg.src = url;
    modalImg.alt = `${currentPetName || "Pet"} photo ${currentIndex + 1}`;

    if (modalCaption) {
      modalCaption.textContent = currentPetName || "";
    }
  }

  function openModal(urls, startIndex = 0, petName = "") {
    if (!modal) return;

    currentUrls = urls;
    currentIndex = startIndex;
    currentPetName = petName;

    updateModalImage();

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // lock background scroll
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // restore scroll
  }

  // Close button
  if (modalClose) {
    modalClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // Click on dark backdrop
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

  // ESC key closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });

  // Prev / next arrows
  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentUrls.length) return;
      currentIndex =
        (currentIndex - 1 + currentUrls.length) % currentUrls.length;
      updateModalImage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentUrls.length) return;
      currentIndex = (currentIndex + 1) % currentUrls.length;
      updateModalImage();
    });
  }
  // ===============================
  // Card rendering
  // ===============================

  function createPetCard(pet) {
    const card = document.createElement("article");
    card.className = "pet-card";

    const images = (pet.images || [])
      .filter((img) => img && img.image_url)
      .map((img) => img.image_url);

    // store these for the modal
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
