// ===============================
// ADMIN DASHBOARD SCRIPT (CommonJS)
// ===============================

// Redirect if not authenticated
if (!localStorage.getItem("adminToken")) {
  console.warn("🔒 Admin not logged in — redirecting to login section");
  const adminSection = document.getElementById("admin");
  if (adminSection) adminSection.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin dashboard initialized");

  const logoutBtn = document.getElementById("logoutBtn");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".admin-tab");

  // Tabs Switching
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabs.forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");

      if (btn.dataset.tab === "pets") loadPets();
      if (btn.dataset.tab === "rates") loadRates();
      if (btn.dataset.tab === "contacts") loadContacts();
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      location.reload();
    });
  }

  // Initialize with Pets
  loadPets();
});

// ===============================
// PET MANAGEMENT
// ===============================
async function loadPets() {
  const petList = document.getElementById("petList");
  petList.innerHTML = "<p>Loading pets...</p>";

  try {
    const res = await fetch("/api/pets");
    const pets = await res.json();
    petList.innerHTML = "";

    pets.forEach((pet) => {
      const card = document.createElement("div");
      card.className = "admin-card";

      const imagesHTML =
        pet.images && pet.images.length
          ? pet.images
              .map(
                (img) => `
            <div class="pet-img-wrapper">
              <img src="${img.image_url}" alt="${pet.pet_name}" />
              <button class="btn-icon delete-img" data-id="${img.id}">🗑️</button>
            </div>`
              )
              .join("")
          : "<p>No images uploaded.</p>";

      card.innerHTML = `
        <h4>${pet.pet_name}</h4>
        <p>${pet.story_description || ""}</p>
        <div class="pet-images">${imagesHTML}</div>
        <div class="btn-group">
          <button class="btn-primary edit-pet" data-id="${pet.id}">Edit</button>
          <button class="btn-danger delete-pet" data-id="${pet.id}">Delete</button>
        </div>
      `;

      petList.appendChild(card);
    });

    document.querySelectorAll(".delete-pet").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (!confirm("Delete this pet?")) return;
        const res = await fetch(`/api/pets/${id}`, { method: "DELETE" });
        if (res.ok) loadPets();
      })
    );

    document.querySelectorAll(".delete-img").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (!confirm("Delete this image?")) return;
        const res = await fetch(`/api/pets/images/${id}`, { method: "DELETE" });
        if (res.ok) loadPets();
      })
    );

    document.querySelectorAll(".edit-pet").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        const petRes = await fetch(`/api/pets/${id}`);
        const pet = await petRes.json();
        openPetModal(pet);
      })
    );

    document.getElementById("addPetBtn").onclick = () =>
      openPetModal({ id: null, pet_name: "", story_description: "", is_dorothy_pet: false });
  } catch (err) {
    console.error("❌ loadPets error:", err);
    petList.innerHTML = "<p>Error loading pets.</p>";
  }
}

// Pet Modal (Add/Edit)
function openPetModal(pet) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${pet.id ? `Edit Pet: ${pet.pet_name}` : "Add New Pet"}</h3>
      <form id="petForm">
        <label>Pet Name</label>
        <input type="text" id="petName" value="${pet.pet_name || ""}" required />
        
        <label>Story Description</label>
        <textarea id="petStory">${pet.story_description || ""}</textarea>
        
        <label>
          <input type="checkbox" id="isDorothyPet" ${pet.is_dorothy_pet ? "checked" : ""} />
          Dorothy's Pet
        </label>

        <label>Upload Photos</label>
        <input type="file" id="petImages" multiple accept="image/*" />

        <div class="modal-actions">
          <button type="submit" class="btn-primary">Save Changes</button>
          <button type="button" class="btn-secondary cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector(".cancel").onclick = () => modal.remove();

  modal.querySelector("#petForm").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.petName.value.trim();
    const story = form.petStory.value.trim();
    const isDorothy = form.isDorothyPet.checked;

    const method = pet.id ? "PUT" : "POST";
    const url = pet.id ? `/api/pets/${pet.id}` : "/api/pets";

    const petRes = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pet_name: name, story_description: story, is_dorothy_pet: isDorothy }),
    });

    if (!petRes.ok) {
      alert("Failed to save pet");
      return;
    }

    const files = form.petImages.files;
    if (files.length) {
      for (const file of files) {
        const uploadRes = await fetch("/api/s3/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });
        const { uploadUrl, publicUrl } = await uploadRes.json();
        await fetch(uploadUrl, { method: "PUT", body: file });
        await fetch(`/api/pets/${pet.id || (await petRes.json()).id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: publicUrl }),
        });
      }
    }

    modal.remove();
    loadPets();
  };
}

await fetch(`/api/pets/${petId}/images/reorder`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ order: newImageOrderArray }),
});

// ===============================
// RATES MANAGEMENT
// ===============================
async function loadRates() {
  const rateList = document.getElementById("rateList");
  rateList.innerHTML = "Loading rates...";
  try {
    const res = await fetch("/api/rates");
    const rates = await res.json();
    rateList.innerHTML = "";

    rates.forEach((rate) => {
      const card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML = `
        <h4>${rate.service_type}</h4>
        <p>${rate.description}</p>
        <p><strong>$${rate.rate_per_unit}</strong> ${rate.unit_type}</p>
        <div class="btn-group">
          <button class="btn-primary edit-rate" data-id="${rate.id}">Edit</button>
          <button class="btn-danger delete-rate" data-id="${rate.id}">Delete</button>
        </div>
      `;
      rateList.appendChild(card);
    });
  } catch (err) {
    rateList.innerHTML = "Error loading rates.";
  }
}

// ===============================
// CONTACT MANAGEMENT
// ===============================
async function loadContacts() {
  const contactList = document.getElementById("contactList");
  contactList.innerHTML = "Loading contacts...";

  try {
    const res = await fetch("/api/contacts");
    const contacts = await res.json();
    contactList.innerHTML = "";

    if (!contacts.length) {
      contactList.innerHTML = "<p>🎉 All contacts have been handled!</p>";
      return;
    }

    contacts.forEach((contact) => {
      const card = document.createElement("div");
      card.className = "admin-card";

      const createdDate = new Date(contact.created_at).toLocaleDateString();

      card.innerHTML = `
        <div class="contact-header">
          <strong>${contact.name}</strong>
          <span class="contact-date">${createdDate}</span>
        </div>
        <p><strong>Email:</strong> ${contact.email || ""}</p>
        <p><strong>Phone:</strong> ${contact.phone || ""}</p>
        <p><strong>Service:</strong> ${contact.service || ""}</p>
        <p><strong>Dates:</strong> ${contact.dates || "-"}</p>
        <p><strong>Message:</strong> ${contact.message || ""}</p>
        <button class="btn-contacted" data-id="${contact.id}">Mark Contacted ✅</button>
      `;

      contactList.appendChild(card);
    });

    document.querySelectorAll(".btn-contacted").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (!confirm("Mark this contact as contacted?")) return;
        const res = await fetch(`/api/contacts/${id}/contacted`, { method: "PUT" });
        if (res.ok) e.target.closest(".admin-card").remove();
      })
    );
  } catch (err) {
    console.error("❌ loadContacts:", err);
    contactList.innerHTML = "Error loading contacts.";
  }
}
