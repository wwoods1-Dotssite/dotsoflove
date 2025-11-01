/* ============================================================
   Admin Dashboard Script (CommonJS Safe)
   ============================================================ */

console.log("⚙️ Admin dashboard initialized");

// -------------------- GLOBAL HELPERS --------------------
function openModal(modalId, title = "") {
  const modal = document.getElementById(modalId);
  if (title) modal.querySelector(".modal-title").textContent = title;
  modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove("active");
}

// Generic fetch helper
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// -------------------- PET MANAGEMENT --------------------
async function loadPets() {
  try {
    const pets = await fetchJSON("/api/pets");
    const petList = document.getElementById("petList");
    petList.innerHTML = "";

    pets.forEach((pet) => {
      const card = document.createElement("div");
      card.classList.add("pet-card");
      card.dataset.id = pet.id;

      const imagesHTML = (pet.images || [])
        .map(
          (img) => `
          <div class="img-wrap" data-pet-id="${pet.id}">
            <img src="${img.image_url}" alt="${pet.pet_name}" class="pet-thumb" />
            <button class="delete-image" data-id="${img.id}">🗑</button>
          </div>
        `
        )
        .join("");

      card.innerHTML = `
        <h4 class="pet-name">${pet.pet_name}</h4>
        <p class="pet-description">${pet.story_description || ""}</p>
        <p class="pet-dorothy"><strong>Dorothy's Pet:</strong> ${
          pet.is_dorothy_pet ? "Yes" : "No"
        }</p>
        <div class="admin-image-grid">${imagesHTML}</div>
        <div class="pet-actions">
          <button class="btn-primary edit-pet">✏️ Edit</button>
          <button class="btn-danger delete-pet">Delete</button>
        </div>
      `;

      petList.appendChild(card);
    });
  } catch (err) {
    console.error("❌ Error loading pets:", err);
    document.getElementById("petList").innerHTML =
      "<p>Error loading pets.</p>";
  }
}

// Add or edit pet modal
document.getElementById("addPetBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("petModal");
  modal.dataset.editing = "";
  modal.querySelector("#petName").value = "";
  modal.querySelector("#petDescription").value = "";
  modal.querySelector("#isDorothyPet").checked = false;
  openModal("petModal", "Add New Pet");
});

// Edit existing pet
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-pet")) {
    const card = e.target.closest(".pet-card");
    const id = card.dataset.id;
    const name = card.querySelector(".pet-name").textContent;
    const desc = card.querySelector(".pet-description").textContent;
    const isDorothy = card.querySelector(".pet-dorothy").textContent.includes("Yes");

    const modal = document.getElementById("petModal");
    modal.dataset.editing = id;
    modal.querySelector("#petName").value = name;
    modal.querySelector("#petDescription").value = desc;
    modal.querySelector("#isDorothyPet").checked = isDorothy;
    openModal("petModal", `Edit Pet: ${name}`);
  }
});

// Save pet (add/edit)
document.getElementById("savePetBtn")?.addEventListener("click", async () => {
  const modal = document.getElementById("petModal");
  const id = modal.dataset.editing;
  const payload = {
    pet_name: modal.querySelector("#petName").value,
    story_description: modal.querySelector("#petDescription").value,
    is_dorothy_pet: modal.querySelector("#isDorothyPet").checked,
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `/api/pets/${id}` : "/api/pets";

  try {
    await fetchJSON(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeModal("petModal");
    loadPets();
  } catch (err) {
    console.error("❌ Save pet failed:", err);
  }
});

// Delete pet
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-pet")) {
    const id = e.target.closest(".pet-card").dataset.id;
    if (!confirm("Are you sure you want to delete this pet?")) return;
    try {
      await fetch(`/api/pets/${id}`, { method: "DELETE" });
      loadPets();
    } catch (err) {
      console.error("❌ Delete pet failed:", err);
    }
  }
});

// Delete single image
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-image")) {
    const id = e.target.dataset.id;
    if (!confirm("Delete this image?")) return;
    try {
      await fetch(`/api/pet_images/${id}`, { method: "DELETE" });
      loadPets();
    } catch (err) {
      console.error("❌ Delete image failed:", err);
    }
  }
});

// -------------------- RATES MANAGEMENT --------------------
async function loadRates() {
  try {
    const rates = await fetchJSON("/api/rates");
    const rateList = document.getElementById("rateList");
    rateList.innerHTML = "";

    rates.forEach((rate) => {
      const card = document.createElement("div");
      card.classList.add("rate-card");
      card.dataset.id = rate.id;

      card.innerHTML = `
        <h4 class="service-type">${rate.service_type}</h4>
        <p class="rate-description">${rate.description || ""}</p>
        <p><strong>Rate:</strong> $${rate.rate_per_unit} per ${rate.unit_type}</p>
        <div class="rate-actions">
          <button class="btn-primary edit-rate">✏️ Edit</button>
          <button class="btn-danger delete-rate">Delete</button>
        </div>
      `;
      rateList.appendChild(card);
    });
  } catch (err) {
    console.error("❌ Error loading rates:", err);
  }
}

// Add or edit rate modal
document.getElementById("addRateBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("rateModal");
  modal.dataset.editing = "";
  modal.querySelector("#serviceType").value = "";
  modal.querySelector("#ratePerUnit").value = "";
  modal.querySelector("#unitType").value = "";
  modal.querySelector("#rateDescription").value = "";
  openModal("rateModal", "Add New Rate");
});

// Edit existing rate
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-rate")) {
    const card = e.target.closest(".rate-card");
    const id = card.dataset.id;
    const modal = document.getElementById("rateModal");

    modal.dataset.editing = id;
    modal.querySelector("#serviceType").value =
      card.querySelector(".service-type").textContent;
    modal.querySelector("#ratePerUnit").value = parseFloat(
      card.querySelector(".rate-description").textContent
    );
    modal.querySelector("#unitType").value =
      card.querySelector(".unit-type")?.textContent || "visit";
    modal.querySelector("#rateDescription").value =
      card.querySelector(".rate-description").textContent;

    openModal("rateModal", `Edit Rate: ${card.querySelector(".service-type").textContent}`);
  }
});

// Save rate
document.getElementById("saveRateBtn")?.addEventListener("click", async () => {
  const modal = document.getElementById("rateModal");
  const id = modal.dataset.editing;
  const payload = {
    service_type: modal.querySelector("#serviceType").value,
    rate_per_unit: modal.querySelector("#ratePerUnit").value,
    unit_type: modal.querySelector("#unitType").value,
    description: modal.querySelector("#rateDescription").value,
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `/api/rates/${id}` : "/api/rates";

  try {
    await fetchJSON(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeModal("rateModal");
    loadRates();
  } catch (err) {
    console.error("❌ Save rate failed:", err);
  }
});

// Delete rate
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-rate")) {
    const id = e.target.closest(".rate-card").dataset.id;
    if (!confirm("Delete this rate?")) return;
    try {
      await fetch(`/api/rates/${id}`, { method: "DELETE" });
      loadRates();
    } catch (err) {
      console.error("❌ Delete rate failed:", err);
    }
  }
});

// -------------------- CONTACT MANAGEMENT --------------------
async function loadContacts() {
  try {
    const contacts = await fetchJSON("/api/contacts");
    const contactList = document.getElementById("contactList");
    contactList.innerHTML = "";

    contacts.forEach((c) => {
      const card = document.createElement("div");
      card.classList.add("contact-card");
      card.dataset.id = c.id;

      card.innerHTML = `
        <p><strong>${c.name}</strong> (${c.email})</p>
        <p><strong>Phone:</strong> ${c.phone || ""}</p>
        <p><strong>Service:</strong> ${c.service || ""}</p>
        <p><strong>Dates:</strong> ${c.dates || ""}</p>
        <p><strong>Message:</strong> ${c.message || ""}</p>
        <p><strong>Submitted:</strong> ${new Date(c.created_at).toLocaleDateString()}</p>
        <button class="btn-primary mark-contacted">Mark Contacted</button>
      `;
      contactList.appendChild(card);
    });
  } catch (err) {
    console.error("❌ Error loading contacts:", err);
  }
}

// Mark contact as contacted
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("mark-contacted")) {
    const id = e.target.closest(".contact-card").dataset.id;
    try {
      await fetch(`/api/contacts/${id}/contacted`, { method: "PUT" });
      loadContacts();
    } catch (err) {
      console.error("❌ Update contact failed:", err);
    }
  }
});

// -------------------- INIT --------------------
document.addEventListener("DOMContentLoaded", () => {
  loadPets();
  loadRates();
  loadContacts();
});