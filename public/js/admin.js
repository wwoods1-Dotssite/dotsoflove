// ============================================================
// ADMIN PANEL CONTROLLER
// ============================================================
(() => {
  // -----------------------------
  // State
  // -----------------------------
  let isLoggedIn = false;

  // -----------------------------
  // Cached DOM references
  // -----------------------------
  let adminNavLink;
  let adminLoginModal;
  let adminLoginForm;
  let adminLoginCloseBtn;
  let adminLoginCancelBtn;

  let adminPanel;
  let adminHeader;
  let adminLogoutBtn;
  let adminTabsRow;
  let adminTabs;
  let adminSections;

  let adminPetsSection;
  let adminRatesSection;
  let adminContactsSection;
  let adminReviewsSection;

  // Single key for localStorage
  const ADMIN_TOKEN_KEY = "adminToken";

  // -----------------------------
  // Cache DOM elements
  // -----------------------------
  function cacheDom() {
    adminNavLink = document.getElementById("adminNav");

    // Login modal
    adminLoginModal = document.getElementById("adminLoginModal");
    adminLoginForm = document.getElementById("adminLoginForm");
    adminLoginCloseBtn = document.getElementById("adminLoginClose");
    adminLoginCancelBtn = document.getElementById("adminLoginCancel");

    // Admin panel + header + tabs
    adminPanel = document.getElementById("adminPanel");
    adminHeader = document.getElementById("adminHeader");
    adminLogoutBtn = document.getElementById("adminLogoutBtn");
    adminTabsRow = document.querySelector(".admin-tabs-row");

    // Tabs + sections
    adminTabs = document.querySelectorAll(".admin-tab");
    adminSections = document.querySelectorAll(".admin-section");

    adminPetsSection = document.getElementById("adminPets");
    adminRatesSection = document.getElementById("adminRates");
    adminContactsSection = document.getElementById("adminContacts");
    adminReviewsSection = document.getElementById("adminReviews");

    console.log("[Admin] cacheDom()", {
      adminNavLink,
      adminLoginModal,
      adminPanel,
      adminHeader,
      adminTabsRow,
      tabsCount: adminTabs.length,
      sectionsCount: adminSections.length,
    });
  }

  // -----------------------------
  // Utility: Show / Hide
  // -----------------------------
  function show(el, display = "block") {
    if (!el) return;
    el.style.display = display;
  }

  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }

  // -----------------------------
  // Login Modal
  // -----------------------------
  function showLoginModal() {
    if (!adminLoginModal) {
      console.error("[Admin] adminLoginModal is missing in DOM");
      return;
    }

    console.log("[Admin] Showing login modal…");

    // Clear any inline display style
    adminLoginModal.style.display = "";
    adminLoginModal.classList.add("visible");
    adminLoginModal.setAttribute("aria-hidden", "false");
  }

  function hideLoginModal() {
    if (!adminLoginModal) return;

    console.log("[Admin] Hiding login modal…");

    adminLoginModal.classList.remove("visible");
    adminLoginModal.setAttribute("aria-hidden", "true");
    // optional hard hide:
    // adminLoginModal.style.display = "none";
  }

  // -----------------------------
  // Admin Panel Show / Hide
  // -----------------------------
  function showAdminPanel() {
    if (!adminPanel) return;
    console.log("[Admin] Showing admin panel…");

    show(adminPanel, "block");
    show(adminHeader, "flex");
    if (adminTabsRow) show(adminTabsRow, "flex");

    // default tab
    setActiveAdminTab("adminPets");
  }

  function hideAdminPanel() {
    console.log("[Admin] Hiding admin panel…");
    hide(adminPanel);
  }

  // -----------------------------
  // Switch active tab
  // sectionId: "adminPets" | "adminRates" | "adminContacts" | "adminReviews"
  // -----------------------------
  function setActiveAdminTab(sectionId) {
    if (!adminPanel) return;

    console.log("[Admin] Switching to tab:", sectionId);

    // Show only the matching section
    adminSections.forEach((sec) => {
      if (!sec) return;
      sec.style.display = sec.id === sectionId ? "block" : "none";
    });

    // Update tab button state
    adminTabs.forEach((btn) => {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle("active", isActive);
    });

    // Trigger data loaders if they exist
    try {
      if (sectionId === "adminReviews" && typeof loadAdminReviews === "function") {
        loadAdminReviews();
      } else if (sectionId === "adminPets" && typeof loadAdminPets === "function") {
        loadAdminPets();
      } else if (sectionId === "adminRates" && typeof loadAdminRates === "function") {
        loadAdminRates();
      } else if (sectionId === "adminContacts" && typeof loadAdminContacts === "function") {
        loadAdminContacts();
      }
    } catch (err) {
      console.error("[Admin] Error loading tab data:", err);
    }
  }

  // -----------------------------
  // Login submit
  // -----------------------------
  async function handleLoginSubmit(e) {
    e.preventDefault();
    console.log("[Admin] Login attempt…");

    const usernameInput = document.getElementById("adminUsername");
    const passwordInput = document.getElementById("adminPassword");

    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        console.warn("[Admin] Auth failed with status", res.status);
        alert("Invalid credentials.");
        return;
      }

      const data = await res.json();
      if (data && data.success && data.token) {
        console.log("[Admin] Login successful");
        isLoggedIn = true;
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);

        hideLoginModal();
        showAdminPanel();
      } else {
        console.warn("[Admin] Auth response not successful:", data);
        alert("Invalid credentials.");
      }
    } catch (err) {
      console.error("[Admin] Error during login:", err);
      alert("Error logging in. Please try again.");
    }
  }

  // -----------------------------
  // Logout
  // -----------------------------
  function handleLogout() {
    console.log("[Admin] Logging out…");
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    isLoggedIn = false;
    hideAdminPanel();
    alert("Logged out.");
  }

  // -----------------------------
  // Restore login on load
  // -----------------------------
  function restoreLoginState() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      console.log("[Admin] Restoring logged-in session");
      isLoggedIn = true;
      showAdminPanel();
    } else {
      console.log("[Admin] No admin token — public view.");
      hideAdminPanel();
    }
  }

  // -----------------------------
  // Event listeners
  // -----------------------------
  function addListeners() {
    // Nav click
    if (adminNavLink) {
      adminNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[Admin] Admin nav clicked");

        if (isLoggedIn) {
          showAdminPanel();
        } else {
          showLoginModal();
        }
      });
    }

    // Modal close / cancel
    if (adminLoginCloseBtn) {
      adminLoginCloseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        hideLoginModal();
      });
    }

    if (adminLoginCancelBtn) {
      adminLoginCancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        hideLoginModal();
      });
    }

    // Login form submit
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", handleLoginSubmit);
    }

    // Logout button
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleLogout();
      });
    }

    // Tab buttons
    if (adminTabs && adminTabs.forEach) {
      adminTabs.forEach((btn) => {
        btn.addEventListener("click", () => {
          const sectionId = btn.dataset.section;
          setActiveAdminTab(sectionId);
        });
      });
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[Admin] Initializing admin.js…");
    cacheDom();
    addListeners();
    restoreLoginState();
  });
})();
