// ===============================
// Main Application Script (Final)
// ===============================

// ---------- GLOBAL SETUP ----------
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js initialized");

  initializeNavigation();
  loadInitialContent();
  setupContactForm();

  // ✅ Support restoring Admin dashboard if logged in
  const hash = window.location.hash || "";
  if (hash === "#admin" || window.location.pathname === "/admin") {
    if (typeof checkAdminAuth === "function") {
      console.log("🔐 Restoring Admin dashboard...");
      checkAdminAuth();
    } else {
      document.addEventListener("admin:ready", () => checkAdminAuth());
    }
  }
});

// ---------- NAVIGATION ----------
function initializeNavigation() {
  const navButtons = document.querySelectorAll(".nav-link");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      switchPage(target);
    });
  });
}

function switchPage(targetId) {
  console.log(`📄 Switching to: ${targetId}`);

  const pages = document.querySelectorAll(".page");
  pages.forEach((p) => (p.hidden = true));

  const targetPage = document.getElementById(targetId);
  if (targetPage) targetPage.hidden = false;

  // Highlight active nav button
  document.querySelectorAll(".nav-link").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === targetId);
  });

  // Update hash (for back/forward navigation)
  window.history.pushState({}, "", `#${targetId}`);

  // Trigger page-specific loads
  switch (targetId) {
    case "gallery":
      if (typeof loadGallery === "function") loadGallery();
      break;
    case "rates":
      loadRates();
      break;
    case "contact":
      break;
    case "admin":
      if (typeof checkAdminAuth === "function") {
        checkAdminAuth();
      } else {
        document.addEventListener("admin:ready", () => checkAdminAuth());
      }
      break;
  }
}

// ---------- INITIAL LOAD ----------
function loadInitialContent() {
  const hash = window.location.hash.replace("#", "");
  const valid = ["about", "gallery", "rates", "contact", "admin"];
  const pageToShow = valid.includes(hash) ? hash : "about";
  switchPage(pageToShow);
}

// ---------- CONTACT FORM ----------
function setupContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const resultBox = document.getElementById("contactResult");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    resultBox.textContent = "Sending...";

    const payload = {
      name: form.querySelector("#contactName")?.value.trim(),
      email: form.querySelector("#contactEmail")?.value.trim(),
      phone: form.querySelector("#contactPhone")?.value.trim(),
      best_time: form.querySelector("#contactBestTime")?.value || "",
      service: form.querySelector("#contactService")?.value || "",
      pet_info: form.querySelector("#contactPetInfo")?.value || "",
      start_date: form.querySelector("#contactStart")?.value || "",
      end_date: form.querySelector("#contactEnd")?.value || "",
      message: form.querySelector("#contactMessage")?.value || "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = `Error ${res.status}: unable to send`;
        resultBox.textContent = msg;
        throw new Error(msg);
      }

      const data = await res.json();
      if (data.success) {
        resultBox.textContent = "✅ Message sent successfully!";
        form.reset();
      } else {
        resultBox.textContent = "❌ Failed to send message.";
      }
    } catch (err) {
      console.error("❌ Contact form error:", err);
      resultBox.textContent = "❌ Network or server issue, please try again.";
    }
  });
}

// ---------- RATES ----------
async function loadRates() {
  const container = document.getElementById("ratesList");
  if (!container) return;

  try {
    const res = await fetch("/api/rates");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rates = await res.json();

    container.innerHTML = rates
      .map(
        (r) => `
      <div class="rate-card">
        <h3>${r.service_type}</h3>
        <p>${r.description || ""}</p>
        <div class="rate-value">
          <strong>$${r.rate_per_unit}</strong> <span>${r.unit_type}</span>
        </div>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading rates:", err);
    container.innerHTML = `<p class="error">Failed to load rates.</p>`;
  }
}

// ---------- GALLERY (Fallback if gallery.js missing) ----------
if (typeof loadGallery === "undefined") {
  async function loadGallery() {
    console.log("🐾 Loading gallery (fallback)");
    const dorothyPets = document.getElementById("dorothyPets");
    const clientPets = document.getElementById("clientPets");

    try {
      const res = await fetch("/api/gallery");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pets = await res.json();

      const dorothy = pets.filter((p) => p.owner === "dorothy");
      const clients = pets.filter((p) => p.owner !== "dorothy");

      dorothyPets.innerHTML = dorothy
        .map(
          (p) => `
        <div class="gallery-card">
          <img src="${p.images?.[0]?.image_url || ""}" alt="${p.pet_name}">
          <h4>${p.pet_name}</h4>
        </div>`
        )
        .join("");

      clientPets.innerHTML = clients
        .map(
          (p) => `
        <div class="gallery-card">
          <img src="${p.images?.[0]?.image_url || ""}" alt="${p.pet_name}">
          <h4>${p.pet_name}</h4>
        </div>`
        )
        .join("");
    } catch (err) {
      console.error("Error loading gallery:", err);
      dorothyPets.innerHTML = `<p class="error">Failed to load gallery.</p>`;
    }
  }
}

// ---------- POPSTATE (Browser back/forward support) ----------
window.addEventListener("popstate", () => {
  const hash = window.location.hash.replace("#", "");
  const valid = ["about", "gallery", "rates", "contact", "admin"];
  const pageToShow = valid.includes(hash) ? hash : "about";
  switchPage(pageToShow);
});
