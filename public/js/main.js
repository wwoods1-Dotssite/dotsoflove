// ===============================
// MAIN.JS (vFinal Patched)
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("💜 main.js initialized");
  initNavigation();
  checkAdminAuth?.();
  loadAbout();
});

function initNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("data-page");
      console.log(`🔄 Switching to: ${target}`);

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      pages.forEach((page) => (page.hidden = true));
      const section = document.getElementById(target);
      if (section) section.hidden = false;

      if (target === "gallery") loadGallery();
      if (target === "rates") loadRates();
      if (target === "contact") loadContact();
      if (target === "about") loadAbout();
    });
  });
}

// ---------- LOAD ABOUT ----------
async function loadAbout() {
  const featuredContainer = document.getElementById("featuredRate");
  if (!featuredContainer) return;

  try {
    const res = await fetch("/api/rates");
    const rates = await res.json();
    const featured = rates.find((r) => r.is_featured);

    featuredContainer.innerHTML = featured
      ? `
        <div class="featured-rate-card">
          <div class="featured-badge">⭐ Featured Service</div>
          <h3>${featured.service_type}</h3>
          <p>${featured.description}</p>
          <strong>$${featured.rate_per_unit} ${featured.unit_type}</strong>
        </div>`
      : `<p class="muted">No featured service at the moment.</p>`;
  } catch (err) {
    console.error("❌ Failed to load featured rate:", err);
  }
}

// ---------- LOAD RATES ----------
async function loadRates() {
  const container = document.getElementById("ratesContainer");
  if (!container) return;

  try {
    const res = await fetch("/api/rates");
    const rates = await res.json();

    container.innerHTML = `
      <h2>Service Rates</h2>
      <div class="rates-grid">
        ${rates
          .map(
            (r) => `
          <div class="rate-card ${r.is_featured ? "featured" : ""}">
            ${r.is_featured ? `<div class="featured-badge">⭐ Featured Service</div>` : ""}
            <h3>${r.service_type}</h3>
            <p>${r.description || ""}</p>
            <strong>$${r.rate_per_unit} ${r.unit_type}</strong>
          </div>`
          )
          .join("")}
      </div>
    `;
  } catch (err) {
    console.error("❌ Failed to load rates:", err);
    container.innerHTML = `<p class="error">Failed to load rates.</p>`;
  }
}

// ---------- LOAD CONTACT ----------
async function loadContact() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form));
    const result = document.getElementById("contactResult");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      result.textContent = data.message || "Message sent!";
      result.style.color = "green";
    } catch (err) {
      console.error("❌ Failed to send contact form:", err);
      result.textContent = "Error sending message.";
      result.style.color = "red";
    }
  });
}
