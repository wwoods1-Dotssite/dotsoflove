document.addEventListener("DOMContentLoaded", () => {
  console.log("⚙️ Admin dashboard loaded");
  const token = localStorage.getItem("adminToken");
  const loginSection = document.getElementById("adminLogin");
  const dashboard = document.getElementById("admin");

  if (!token) {
    loginSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
  } else {
    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    initDashboard();
  }

  document.getElementById("adminLoginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("adminToken", data.token);
      location.reload();
    } else alert("Invalid credentials");
  });

  function initDashboard() {
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      location.reload();
    });
    loadPets();
    loadRates();
    loadContacts();
  }

  async function loadPets() {
    const res = await fetch("/api/gallery");
    const pets = await res.json();
    const container = document.getElementById("adminPetsContainer");
    container.innerHTML = "";
    pets.forEach((p) => {
      const petDiv = document.createElement("div");
      petDiv.className = "pet-card";
      petDiv.innerHTML = `
        <h4>${p.pet_name}</h4>
        <p>${p.story_description || ""}</p>
        <div class="images">
          ${p.images.map(i => `<div class='img-wrapper'><img src='${i.image_url}' /><button class='btn-delete-img' data-id='${i.id}'>🗑</button></div>`).join("")}
        </div>
        <button class="btn-delete-pet" data-id="${p.id}">Delete Pet</button>`;
      container.appendChild(petDiv);
    });

    document.querySelectorAll(".btn-delete-pet").forEach(btn => btn.addEventListener("click", async e => {
      await fetch(`/api/pets/${e.target.dataset.id}`, { method: "DELETE" });
      loadPets();
    }));

    document.querySelectorAll(".btn-delete-img").forEach(btn => btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      const petId = e.target.closest(".pet-card").querySelector(".btn-delete-pet").dataset.id;
      await fetch(`/api/pets/${petId}/images/${id}`, { method: "DELETE" });
      loadPets();
    }));

    document.getElementById("addPetBtn")?.addEventListener("click", async () => {
      const name = prompt("Pet name:");
      const desc = prompt("Story description:");
      await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_name: name, story_description: desc, is_dorothy_pet: false }),
      });
      loadPets();
    });
  }

  async function loadRates() {
    const res = await fetch("/api/rates");
    const rates = await res.json();
    const container = document.getElementById("adminRatesContainer");
    container.innerHTML = "";
    rates.forEach(r => {
      const div = document.createElement("div");
      div.className = "rate-card";
      div.innerHTML = `
        <h4>${r.service_type}</h4>
        <p>${r.description}</p>
        <strong>$${r.rate_per_unit} ${r.unit_type}</strong>
        <div class="actions">
          <button class="btn-edit" data-id="${r.id}">Edit</button>
          <button class="btn-delete" data-id="${r.id}">Delete</button>
        </div>`;
      container.appendChild(div);
    });

    document.querySelectorAll(".btn-delete").forEach(btn => btn.addEventListener("click", async e => {
      await fetch(`/api/rates/${e.target.dataset.id}`, { method: "DELETE" });
      loadRates();
    }));

    document.querySelectorAll(".btn-edit").forEach(btn => btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      const type = prompt("Service type:");
      const price = prompt("Rate per unit:");
      const unit = prompt("Unit type:");
      const desc = prompt("Description:");
      await fetch(`/api/rates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_type: type, rate_per_unit: price, unit_type: unit, description: desc }),
      });
      loadRates();
    }));

    document.getElementById("addRateBtn")?.addEventListener("click", async () => {
      const type = prompt("Service type:");
      const price = prompt("Rate per unit:");
      const unit = prompt("Unit type:");
      const desc = prompt("Description:");
      await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_type: type, rate_per_unit: price, unit_type: unit, description: desc }),
      });
      loadRates();
    });
  }

  async function loadContacts() {
    const res = await fetch("/api/contact");
    const contacts = await res.json();
    const container = document.getElementById("adminContactsContainer");
    container.innerHTML = "";
    contacts.forEach(c => {
      const div = document.createElement("div");
      div.className = "contact-card";
      div.innerHTML = `<h4>${c.name}</h4><p>${c.email}</p><p>${c.message}</p><button class="btn-delete-contact" data-id="${c.id}">Delete</button>`;
      container.appendChild(div);
    });

    document.querySelectorAll(".btn-delete-contact").forEach(btn => btn.addEventListener("click", async e => {
      await fetch(`/api/contact/${e.target.dataset.id}`, { method: "DELETE" });
      loadContacts();
    }));
  }
});
