document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/gallery";
  const dorothyContainer = document.getElementById("dorothyGallery");
  const clientContainer = document.getElementById("clientGallery");

  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const captionText = document.getElementById("caption");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const closeBtn = document.querySelector(".close");

  let currentImages = [];
  let currentIndex = 0;

  async function loadGallery() {
    try {
      const res = await fetch(API_URL);
      const pets = await res.json();

      if (!Array.isArray(pets)) throw new Error("Invalid gallery data");

      const dorothyPets = pets.filter((p) => p.is_dorothy_pet);
      const clientPets = pets.filter((p) => !p.is_dorothy_pet);

      renderPets(dorothyPets, dorothyContainer);
      renderPets(clientPets, clientContainer);
    } catch (err) {
      console.error("Failed to load gallery:", err);
    }
  }

  function renderPets(pets, container) {
    if (!container) return;
    if (!pets.length) {
      container.innerHTML = `<p>No pets to display yet.</p>`;
      return;
    }

    container.innerHTML = pets
      .map((pet) => {
        const imgUrl =
          (pet.images && pet.images[0]?.image_url) ||
          "https://placehold.co/400x300?text=No+Image";
        return `
          <div class="gallery-card" data-images='${JSON.stringify(
            pet.images || []
          )}'>
            <img src="${imgUrl}" alt="${pet.pet_name}" />
            <div class="gallery-card-content">
              <h4>${pet.pet_name}</h4>
              <p>${pet.story_description || ""}</p>
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll(".gallery-card").forEach((card) => {
      card.addEventListener("click", () => {
        const images = JSON.parse(card.dataset.images || "[]");
        if (images.length > 0) {
          currentImages = images;
          currentIndex = 0;
          showModalImage();
          modal.style.display = "block";
        }
      });
    });
  }

  function showModalImage() {
    if (!currentImages.length) return;
    modalImg.src = currentImages[currentIndex].image_url;
    captionText.innerText = `${currentIndex + 1} of ${currentImages.length}`;
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      showModalImage();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < currentImages.length - 1) {
      currentIndex++;
      showModalImage();
    }
  });

  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  loadGallery();
});