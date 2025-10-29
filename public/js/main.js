/* Main app controller: navigation, routing, and screen boot.
   Keeps gallery.js (modal/carousel) and admin.js (auth & dashboard) intact. */

(function () {
  const PAGES = ["about", "gallery", "rates", "contact", "admin"];
  const DEFAULT_PAGE = "about";
  const API_BASE = "/api";

  // --------- Navigation helpers ---------
  function setActiveNav(page) {
    document.querySelectorAll(".site-nav .nav-link").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.nav === page);
    });
  }

  function showOnly(page) {
    PAGES.forEach(p => {
      const el = document.getElementById(p);
      if (!el) return;
      if (p === page) {
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
    setActiveNav(page);
  }

  // --------- Page loaders (lightweight, keep your existing endpoints) ---------
  async function loadRates() {
    const container = document.getElementById("ratesList");
    if (!container) return;
    try {
      const res = await fetch(`${API_BASE}/rates`);
      const rates = await res.json();
      container.innerHTML = rates
        .map(r => `
          <article class="rate-card">
            <h3>${r.service_type}${r.is_featureed ? " ⭐" : ""}</h3>
            ${r.description ? `<p>${r.description}</p>` : ""}
            <p class="price"><strong>$${(+r.rate_per_unit).toFixed(2)}</strong> ${r.unit_type}</p>
          </article>
        `)
        .join("");
    } catch (err) {
      console.error("Rates error:", err);
      container.innerHTML = `<p class="error">Failed to load rates.</p>`;
    }
  }

  async function loadGallery() {
    // Use your existing gallery.js wiring. We only call the public functions if present.
    if (typeof window.loadDualGallery === "function") {
      try {
        await window.loadDualGallery(); // fills #dorothyPets and #clientPets
      } catch (e) {
        console.error("loadDualGallery failed:", e);
      }
      return;
    }

    // Fallback (rarely used if gallery.js present)
    const dorothy = document.getElementById("dorothyPets");
    const clients = document.getElementById("clientPets");
    try {
      const res = await fetch(`${API_BASE}/gallery`);
      const pets = await res.json();
      const isDorothy = p => !!p.is_dorothy_pet;

      const html = p => `
        <div class="gallery-item" data-pet='${JSON.stringify(p).replace(/"/g, "&quot;")}'>
          <div class="gallery-image">
            ${p.images?.length ? `<img src="${p.images[0].image_url}" alt="${p.pet_name}">` : "🐾"}
          </div>
          <div class="gallery-content">
            ${p.is_dorothy_pet ? `<div class="dorothy-pet-badge">Dorothy's Pet</div>` : ""}
            <div class="pet-name">${p.pet_name}</div>
            ${p.service_date ? `<div class="pet-date">${p.service_date}</div>` : ""}
            ${p.story_description ? `<div class="pet-story">${p.story_description}</div>` : ""}
          </div>
        </div>`;

      dorothy.innerHTML = pets.filter(isDorothy).map(html).join("") || "<p>No pets yet.</p>";
      clients.innerHTML  = pets.filter(p => !isDorothy(p)).map(html).join("") || "<p>Client pet photos coming soon!</p>";
    } catch (err) {
      console.error("Gallery error:", err);
      dorothy.innerHTML = clients.innerHTML = `<p class="error">Failed to load gallery.</p>`;
    }
  }

  // --------- Contact form ----------
  function wireContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const status = document.getElementById("contactResult");
    const start = document.getElementById("contactStart");
    const end   = document.getElementById("contactEnd");

    // basic date validation
    function validateDates() {
      if (start.value && end.value && end.value < start.value) {
        end.setCustomValidity("End date cannot be before start date.");
      } else {
        end.setCustomValidity("");
      }
    }
    start.addEventListener("change", validateDates);
    end.addEventListener("change", validateDates);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      validateDates();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const payload = {
        name:       document.getElementById("contactName").value.trim(),
        email:      document.getElementById("contactEmail").value.trim(),
        phone:      document.getElementById("contactPhone").value.trim(),
        best_time:  document.getElementById("contactBestTime").value,
        service:    document.getElementById("contactService").value,
        pet_info:   document.getElementById("contactPetInfo").value.trim(),
        start_date: document.getElementById("contactStart").value,
        end_date:   document.getElementById("contactEnd").value,
        message:    document.getElementById("contactMessage").value.trim(),
      };

      try {
        const res = await fetch(`${API_BASE}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        status.textContent = data?.message || "Message received!";
        form.reset();
      } catch (err) {
        console.error("Contact error:", err);
        status.textContent = "Sorry, something went wrong. Please try again.";
      }
    });
  }

  // --------- Admin helpers ----------
  function ensureAdminVisibility() {
    // Always call the global helper if admin.js is loaded.
    if (typeof window.checkAdminAuth === "function") {
      window.checkAdminAuth(); // shows login vs panel + sets banner
    } else {
      // If admin.js hasn't loaded for some reason, at least show the login section.
      const login = document.getElementById("adminLogin");
      const panel = document.getElementById("adminPanel");
      if (login) login.style.display = "block";
      if (panel) panel.style.display = "none";
    }
  }

  // --------- Router ----------
  function routeTo(page) {
    switch (page) {
      case "gallery":
        showOnly("gallery");
        loadGallery();
        break;

      case "rates":
        showOnly("rates");
        loadRates();
        break;

      case "contact":
        showOnly("contact");
        wireContactForm();
        break;

      case "admin":
        showOnly("admin");
        ensureAdminVisibility();
        break;

      default:
        showOnly("about");
    }
  }

  function getInitialPageFromURL() {
    const hash = (window.location.hash || "").replace("#", "").trim().toLowerCase();
    if (hash && PAGES.includes(hash)) return hash;

    // support pretty URL /admin
    const path = window.location.pathname.replace(/^\//, "").toLowerCase();
    if (PAGES.includes(path)) return path;

    return DEFAULT_PAGE;
  }

  function updateURL(page) {
    // keep nice hash for SPA, and pretty path for /admin
    if (page === "admin") {
      if (window.location.pathname !== "/admin") {
        window.history.pushState({}, "", "/admin");
      }
    } else {
      const want = `/#${page}`;
      if (window.location.hash !== `#${page}` || window.location.pathname !== "/") {
        window.history.pushState({}, "", want);
      }
    }
  }

  function handleNavClick(e) {
    const btn = e.target.closest("[data-nav]");
    if (!btn) return;

    const page = btn.dataset.nav;
    updateURL(page);
    routeTo(page);
  }

  function handlePopState() {
    routeTo(getInitialPageFromURL());
  }

  // --------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    // Wire nav clicks
    document.querySelector(".site-nav")?.addEventListener("click", handleNavClick);

    // Initial route (never override admin)
    const initial = getInitialPageFromURL();
    routeTo(initial);

    // Allow in-place back/forward
    window.addEventListener("popstate", handlePopState);

    // If user lands on /admin or #admin and admin.js is slow to load, re-check once it arrives.
    document.addEventListener("admin:ready", () => {
      if (getInitialPageFromURL() === "admin") ensureAdminVisibility();
    });
  });

})();
