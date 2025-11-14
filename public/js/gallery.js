/* gallery.js – Responsive gallery with thumbnail modal */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🖼 Initializing Gallery…");

  const dorothyGrid = document.getElementById("dorothyGallery");
  const clientGrid = document.getElementById("clientGallery");

  if (!dorothyGrid || !clientGrid) {
    console.warn("Gallery containers not found in DOM.");
    return;
  }

  // Modal elements (optional – we fall back to thumbnails only if missing)
  const modal = document.getElementById("imageModal");
  const modalImg = modal ? modal.querySelector(".image-modal-img") : null;
  const modalCaption = modal ? modal.querySelector(".image-modal-caption") : null;
  const modalClose = modal ? modal.querySelector(".image-modal-close") : null;
  const modalPrev = modal ? modal.querySelector(".image-modal-prev") : null;
  const modalNext = modal ? modal.querySelector(".image-modal-next") : null;

  let activeImages = [];
  let activeIndex = 0;
  let activeCaption = "";

  const modalAvailable =
    modal && modalImg && modalCaption && modalClose && modalPrev && modalNext;

  if (!modalAvailable) {
    console.warn(
      "Image modal elements not found; gallery will show thumbnails only."
    );
  }

  // ---------- Modal helpers ----------

  function showCurrentImage() {
    if (!modalAvailable || !activeImages.length) return;
    modalImg.src = activeImages[activeIndex];
    modalImg.alt = activeCaption || "Pet photo";
    modalCaption.textContent = activeCaption;
  }

  function openModal(images, startIndex, caption) {
    if (!modalAvailable || !images.length) return;

    activeImages = images;
    activeIndex = startIndex ?? 0;
    activeCaption = caption || "";

    showCurrentImage();
    modal.classList.add("open");
    document.body.classList.add("no-scroll");
  }

  function closeModal() {
    if (!modalAvailable) return;
    modal.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  function showNext(delta) {
    if (!modalAvailable || !activeImages.length) return;
    const len = activeImages.length;
    activeIndex = (activeIndex + delta + len) % len;
    showCurrentImage();
  }

  if (modalAvailable) {
    modalClose.addEventListener("click", closeModal);
    modalPrev.addEventListener("click", () => showNext(-1));
    modalNext.addEventListener("click", () => showNext(1));

    // Close when clicking backdrop
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) closeModal();
    });

    // Close on Escape
    window.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape" && modal.classList.contains("open")) {
        closeModal();
      }
    });
  }

  // ---------- Render helpers ----------

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
      openModal(urls, index, name);
    });
  }

  // ---------- Fetch + render ----------

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
        "<p class=\"gallery-error\">Sorry, the pet gallery is unavailable right now.</p>";
      clientGrid.innerHTML = "";
    }
  }

  loadPets();
});
