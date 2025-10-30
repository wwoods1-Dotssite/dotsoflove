// ======================================================
//  Dots of Love Pet Sitting - Admin Dashboard
//  Unified Add/Edit Pet Modal + S3 Uploads + Reordering
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin dashboard initialized");

  const token = localStorage.getItem("adminToken");
  const loginSection = document.getElementById("adminLogin");
  const dashboardSection = document.getElementById("admin");
  const loginForm = document.getElementById("adminLoginForm");
  const petList = document.getElementById("petList");
  const addPetBtn = document.getElementById("addPetBtn");

  // ---------- LOGIN ----------
  if (!token) {
    if (loginSection) loginSection.style.display = "block";
    if (dashboardSection) dashboardSection.style.display = "none";
  } else {
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";
    loadPets();
    loadRates();
    loadContacts();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value.trim();
      const statusEl = document.getElementById("adminLoginStatus");

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("adminToken", data.token);
          statusEl.textContent = "✅ Login successful";
          setTimeout(() => location.reload(), 800);
        } else statusEl.textContent = "❌ Invalid credentials";
      } catch {
        statusEl.textContent = "Server error";
      }
    });
  }

  // ---------- LOAD PETS ----------
  async function loadPets() {
    if (!petList) return;
    petList.innerHTML = "Loading pets...";
    try {
      const res = await fetch("/api/pets");
      const pets = await res.json();
      renderPets(pets);
    } catch (err) {
      console.error("Error loading pets:", err);
      petList.innerHTML = "Error loading pets";
    }
  }

  // ---------- RENDER PETS ----------
  function renderPets(pets) {
    petList.innerHTML = "";
    if (!Array.isArray(pets)) return;

    pets.forEach((pet) => {
      const card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML = `
        <h4>${pet.pet_name}</h4>
        <p>${pet.story_description || ""}</p>
        <div class="pet-images">
          ${
            pet.images?.length
              ? pet.images
                  .map(
                    (img) => `
                <div class="pet-image-chip" draggable="true" data-id="${img.id}">
                  <img src="${img.image_url}" alt="${pet.pet_name}">
                  <button class="delete-image" data-pet="${pet.id}" data-image="${img.id}">🗑</button>
                </div>`
                  )
                  .join("")
              : "<p>No images uploaded.</p>"
          }
        </div>
        <div class="admin-actions">
          <button class="btn-secondary edit-pet" data-id="${pet.id}">Edit</button>
          <button class="btn-danger delete-pet" data-id="${pet.id}">Delete</button>
        </div>
      `;
      petList.appendChild(card);
    });

    attachHandlers();
  }

  // ---------- ATTACH BUTTON HANDLERS ----------
  function attachHandlers() {
    document.querySelectorAll(".delete-pet").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        openConfirm("Delete Pet?", async () => {
          const res = await fetch(`/api/pets/${id}`, { method: "DELETE" });
          if (res.ok) loadPets();
        });
      })
    );

    document.querySelectorAll(".edit-pet").forEach((btn) =>
      btn.addEventListener("click", () => openPetModal(btn.dataset.id))
    );

    document.querySelectorAll(".delete-image").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const pet = e.target.dataset.pet;
        const img = e.target.dataset.image;
        const res = await fetch(`/api/pets/${pet}/images/${img}`, {
          method: "DELETE",
        });
        if (res.ok) loadPets();
      })
    );
  }

  // ---------- ADD / EDIT PET ----------
  if (addPetBtn)
    addPetBtn.addEventListener("click", () => openPetModal(null));

  async function openPetModal(petId) {
    const editing = Boolean(petId);
    let pet = { pet_name: "", story_description: "", is_dorothy_pet: false, images: [] };
    if (editing) {
      const res = await fetch(`/api/pets`);
      const data = await res.json();
      pet = data.find((p) => p.id == petId);
    }

    const overlay = document.createElement("div");
    overlay.className = "admin-modal-overlay";
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3>${editing ? `Edit Pet: ${pet.pet_name}` : "Add New Pet"}</h3>
        </div>
        <div class="admin-modal-body">
          <label>Pet Name</label>
          <input id="petNameInput" value="${pet.pet_name || ""}" />
          <label>Story Description</label>
          <textarea id="petStoryInput">${pet.story_description || ""}</textarea>
          <label><input type="checkbox" id="petDorothyInput" ${pet.is_dorothy_pet ? "checked" : ""}/> Dorothy's Pet</label>
          <label>Upload Photos</label>
          <input type="file" id="petPhotosInput" multiple accept="image/*" />
          <div id="currentPhotos" class="photo-list">
            ${
              pet.images?.length
                ? pet.images
                    .map(
                      (img) => `
                <div class="pet-image-chip" draggable="true" data-id="${img.id}">
                  <img src="${img.image_url}">
                  <button class="delete-image" data-pet="${pet.id}" data-image="${img.id}">🗑</button>
                </div>`
                    )
                    .join("")
                : ""
            }
          </div>
        </div>
        <div class="admin-modal-footer">
          <button id="savePetBtn" class="btn-primary">${editing ? "Save Changes" : "Add Pet"}</button>
          <button id="cancelPetBtn" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("cancelPetBtn").onclick = () => overlay.remove();
    document.getElementById("savePetBtn").onclick = () =>
      savePet(editing, petId, overlay);

    enableDragReorder(overlay);
  }

  async function savePet(editing, id, overlay) {
    const name = document.getElementById("petNameInput").value.trim();
    const story = document.getElementById("petStoryInput").value.trim();
    const isDorothy = document.getElementById("petDorothyInput").checked;
    const files = document.getElementById("petPhotosInput").files;
    const btn = document.getElementById("savePetBtn");
    if (!name) return alert("Name required");
    btn.disabled = true;

    try {
      let petId = id;
      if (!editing) {
        const res = await fetch("/api/pets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pet_name: name, story_description: story, is_dorothy_pet: isDorothy }),
        });
        const data = await res.json();
        petId = data.pet.id;
      } else {
        await fetch(`/api/pets/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pet_name: name, story_description: story, is_dorothy_pet: isDorothy }),
        });
      }

      // upload files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const upRes = await fetch("/api/s3/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });
        const up = await upRes.json();
        await fetch(up.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        await fetch(`/api/pets/${petId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: up.publicUrl, s3_key: up.s3_key }),
        });
      }

      overlay.remove();
      loadPets();
    } catch (err) {
      console.error("❌ savePet:", err);
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- DRAG REORDER ----------
  function enableDragReorder(overlay) {
    const chips = overlay.querySelectorAll(".pet-image-chip");
    let dragSrc;
    chips.forEach((chip) => {
      chip.addEventListener("dragstart", (e) => {
        dragSrc = chip;
        chip.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
      chip.addEventListener("dragover", (e) => e.preventDefault());
      chip.addEventListener("drop", async (e) => {
        e.preventDefault();
        if (dragSrc === chip) return;
        const list = chip.parentNode;
        list.insertBefore(dragSrc, chip);
        const ordered = Array.from(list.querySelectorAll(".pet-image-chip")).map(
          (c, i) => ({ id: c.dataset.id, display_order: i })
        );
        const petId =
          document.querySelector(".delete-image")?.dataset.pet ||
          document.querySelector(".edit-pet")?.dataset.id;
        await fetch(`/api/pets/${petId}/images/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: ordered }),
        });
      });
    });
  }

  // ---------- CONFIRM ----------
  function openConfirm(msg, onConfirm) {
    const o = document.createElement("div");
    o.className = "admin-modal-overlay";
    o.innerHTML = `
      <div class="admin-modal small">
        <div class="admin-modal-header"><h3>${msg}</h3></div>
        <div class="admin-modal-footer">
          <button id="okConfirm" class="btn-danger">Yes</button>
          <button id="cancelConfirm" class="btn-secondary">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(o);
    document.getElementById("okConfirm").onclick = () => {
      o.remove();
      onConfirm();
    };
    document.getElementById("cancelConfirm").onclick = () => o.remove();
  }

  // ---------- LOAD RATES ----------
  async function loadRates() {
    const c = document.getElementById("rateList");
    if (!c) return;
    try {
      const res = await fetch("/api/rates");
      const rates = await res.json();
      c.innerHTML = rates
        .map(
          (r) => `
        <div class="admin-card">
          <h4>${r.service_type}</h4>
          <p>${r.description || ""}</p>
          <strong>$${r.rate_per_unit} ${r.unit_type}</strong>
        </div>`
        )
        .join("");
    } catch (err) {
      c.innerHTML = "Error loading rates.";
    }
  }

  // ---------- LOAD CONTACTS ----------
  async function loadContacts() {
    const c = document.getElementById("contactList");
    if (!c) return;
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      c.innerHTML = data
        .map(
          (ct) => `
        <div class="admin-card">
          <h4>${ct.name}</h4>
          <p><strong>Email:</strong> ${ct.email}</p>
          <p><strong>Phone:</strong> ${ct.phone}</p>
          <p><strong>Service:</strong> ${ct.service}</p>
          <p><strong>Dates:</strong> ${ct.start_date || ""} - ${
            ct.end_date || ""
          }</p>
          <p><strong>Message:</strong> ${ct.message || ""}</p>
        </div>`
        )
        .join("");
    } catch {
      c.innerHTML = "Error loading contact requests.";
    }
  }
});
