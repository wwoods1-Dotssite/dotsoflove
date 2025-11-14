/* =========================================================
 * admin.js – Login, dashboard visibility & tab switching
 * ======================================================= */

(() => {
  const ADMIN_TOKEN_KEY = "adminToken";

  // ----- Helpers --------------------------------------------------

  function log(...args) {
    console.log("🛠️ [Admin]", ...args);
  }

  function getToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  function isAdminAuthed() {
    return !!getToken();
  }

  // Expose for main.js / other modules
  window.checkAdminAuth = function checkAdminAuth() {
    return isAdminAuthed();
  };

  function emitAuthChanged() {
    const detail = { isAdmin: isAdminAuthed() };
    window.dispatchEvent(
      new CustomEvent("admin-auth-changed", { detail })
    );
  }

  // ----- DOM references -------------------------------------------

  let adminNavLink;
  let adminSection;
  let adminDashboard;

  let adminLoginModal;
  let adminLoginForm;
  let adminUsernameInput;
  let adminPasswordInput;
  let adminLoginCancelBtn;
  let adminLoginCloseBtn;
  let adminLogoutBtn;

  let adminTabButtons = {};
  let adminTabSections = {};

  function cacheDomRefs() {
    adminNavLink = document.getElementById("adminNavLink");
    adminSection = document.getElementById("adminSection");
    adminDashboard = document.getElementById("adminDashboard");

    adminLoginModal = document.getElementById("adminLoginModal");
    adminLoginForm = document.getElementById("adminLoginForm");
    adminUsernameInput = document.getElementById("adminUsername");
    adminPasswordInput = document.getElementById("adminPassword");
    adminLoginCancelBtn = document.getElementById("adminLoginCancel");
    adminLoginCloseBtn = document.getElementById("adminLoginClose");
    adminLogoutBtn = document.getElementById("adminLogoutBtn");

    adminTabButtons = {
      pets: document.getElementById("adminTabPets"),
      rates: document.getElementById("adminTabRates"),
      contacts: document.getElementById("adminTabContacts"),
      reviews: document.getElementById("adminTabReviews")
    };

    adminTabSections = {
      pets: document.getElementById("adminPetsSection"),
      rates: document.getElementById("adminRatesSection"),
      contacts: document.getElementById("adminContactsSection"),
      reviews: document.getElementById("adminReviewsSection")
    };
  }

  // ----- UI helpers -----------------------------------------------

  function showElement(el) {
    if (!el) return;
    el.style.display = "";
    el.classList.remove("hidden");
  }

  function hideElement(el) {
    if (!el) return;
    el.style.display = "none";
    el.classList.add("hidden");
  }

  function openLoginModal() {
    if (!adminLoginModal) return;
    adminLoginModal.classList.add("open");
    adminLoginModal.style.display = "flex";

    if (adminUsernameInput) adminUsernameInput.focus();
  }

  function closeLoginModal() {
    if (!adminLoginModal) return;
    adminLoginModal.classList.remove("open");
    adminLoginModal.style.display = "none";

    if (adminLoginForm) adminLoginForm.reset();
  }

  function scrollToAdminSection() {
    if (!adminSection) return;
    adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setActiveAdminTab(tabKey) {
    Object.entries(adminTabButtons).forEach(([key, btn]) => {
      if (!btn) return;
      if (key === tabKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    Object.entries(adminTabSections).forEach(([key, section]) => {
      if (!section) return;
      if (key === tabKey) {
        showElement(section);
      } else {
        hideElement(section);
      }
    });
  }

  function refreshAdminUI() {
    if (!adminSection || !adminDashboard) return;

    if (isAdminAuthed()) {
      showElement(adminDashboard);
      // Once logged in, make sure the admin section is visible
      showElement(adminSection);
      setActiveAdminTab("pets"); // default tab
      log("Admin token present – dashboard ready.");
    } else {
      hideElement(adminDashboard);
      // Admin section still visible as a public heading, but no dashboard
      log("No admin token – public view.");
    }
  }

  // ----- Event handlers -------------------------------------------

  async function handleLoginSubmit(evt) {
    evt.preventDefault();
    if (!adminUsernameInput || !adminPasswordInput) return;

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    if (!username || !password) {
      alert("Please enter both username and password.");
      return;
    }

    try {
      log("Attempting admin login…");

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        log("Login failed, status", res.status);
        alert("Invalid username or password.");
        return;
      }

      const data = await res.json();
      if (!data.success || !data.token) {
        alert("Login failed. Please try again.");
        return;
      }

      setToken(data.token);
      emitAuthChanged();
      refreshAdminUI();
      closeLoginModal();
      scrollToAdminSection();

      log("Admin login successful.");

    } catch (err) {
      console.error("❌ Admin login error:", err);
      alert("There was a problem logging in. Please try again.");
    }
  }

  function handleLogoutClick() {
    clearToken();
    emitAuthChanged();
    refreshAdminUI();
    log("Admin logged out.");
    // Optionally scroll back to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAdminNavClick(evt) {
    evt.preventDefault();

    if (isAdminAuthed()) {
      // Already logged in – go straight to dashboard
      refreshAdminUI();
      scrollToAdminSection();
    } else {
      // Not logged in – open login modal
      openLoginModal();
    }
  }

  function attachEventListeners() {
    // Admin nav in sticky header
    if (adminNavLink) {
      adminNavLink.addEventListener("click", handleAdminNavClick);
    }

    // Login form
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", handleLoginSubmit);
    }

    if (adminLoginCancelBtn) {
      adminLoginCancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeLoginModal();
      });
    }

    if (adminLoginCloseBtn) {
      adminLoginCloseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeLoginModal();
      });
    }

    // Logout
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleLogoutClick();
      });
    }

    // Tab buttons
    if (adminTabButtons.pets) {
      adminTabButtons.pets.addEventListener("click", () =>
        setActiveAdminTab("pets")
      );
    }
    if (adminTabButtons.rates) {
      adminTabButtons.rates.addEventListener("click", () =>
        setActiveAdminTab("rates")
      );
    }
    if (adminTabButtons.contacts) {
      adminTabButtons.contacts.addEventListener("click", () =>
        setActiveAdminTab("contacts")
      );
    }
    if (adminTabButtons.reviews) {
      adminTabButtons.reviews.addEventListener("click", () =>
        setActiveAdminTab("reviews")
      );
    }
  }

  // ----- Init -----------------------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    cacheDomRefs();
    attachEventListeners();
    refreshAdminUI();
    emitAuthChanged();
    log("Admin login module initialized.");
     const adminNav = document.getElementById("adminNav");

  if (!adminNav) {
    console.warn("[Admin] #adminNav link not found in DOM");
    return;
  }

  console.log("[Admin] Found adminNav element:", adminNav);

  adminNav.addEventListener("click", (event) => {
    event.preventDefault();
    console.log("[Admin] Admin nav clicked");
    openAdminEntry(); // or whatever your entry function is called

  });
  
})();
