// ============================================================
// ADMIN PANEL CONTROLLER
// ============================================================

(() => {
  // -----------------------------
  // State
  // -----------------------------
  let isLoggedIn = false;

// Cached DOM references
let adminNavLink,
    adminLoginModal,
    adminLoginForm,
    adminLoginCloseBtn,
    adminLoginCancelBtn,
    adminPanel,
    adminHeader,
    adminLogoutBtn,
    adminTabs,
    adminSections,
    adminPetsSection,
    adminRatesSection,
    adminContactsSection,
    adminReviewsSection;

// Cache DOM elements
function cacheDom() {
  adminNavLink = document.getElementById("adminNav");

  // Login modal
  adminLoginModal = document.getElementById("adminLoginModal");
  adminLoginForm = document.getElementById("adminLoginForm");
  adminLoginCloseBtn = document.getElementById("adminLoginClose");
  adminLoginCancelBtn = document.getElementById("adminLoginCancel");

  // Admin panel
  adminPanel = document.getElementById("adminPanel");
  adminHeader = document.getElementById("adminHeader");
  adminLogoutBtn = document.getElementById("adminLogoutBtn");

  // Tabs + sections
  adminTabs = document.querySelectorAll(".admin-tab");
  adminSections = document.querySelectorAll(".admin-section");
  adminPetsSection = document.getElementById("adminPets");
  adminRatesSection = document.getElementById("adminRates");
  adminContactsSection = document.getElementById("adminContacts");
  adminReviewsSection = document.getElementById("adminReviews");
}

  // -----------------------------
  // Utility: Show/Hide Elements
  // -----------------------------
  function show(el, display = "block") {
    if (el) el.style.display = display;
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  // -----------------------------
  // Admin Login Modal
  // -----------------------------

function showLoginModal() {
  if (!adminLoginModal) {
    console.error("[Admin] adminLoginModal is missing in DOM");
    return;
  }

  console.log("[Admin] Showing login modal…");

  // Clear any inline style that might hide it
  adminLoginModal.style.display = "";

  // Use class + aria to control visibility
  adminLoginModal.classList.add("visible");
  adminLoginModal.setAttribute("aria-hidden", "false");
}

function hideLoginModal() {
  if (!adminLoginModal) return;

  console.log("[Admin] Hiding login modal…");

  adminLoginModal.classList.remove("visible");
  adminLoginModal.setAttribute("aria-hidden", "true");

  // Optional: if you want a hard hide as well, keep this line:
  // adminLoginModal.style.display = "none";
}

  // -----------------------------
  // Switch Active Admin Tab
  //   sectionId is the actual DOM id:
//   "adminPets" | "adminRates" | "adminContacts" | "adminReviews"
// -----------------------------
  function setActiveAdminTab(sectionId) {
    if (!adminPanel || !adminTabsRow) return;

    console.log("[Admin] Switching to tab:", sectionId);

    // Hide all admin sections, show only requested one
    adminSections.forEach((sec) => {
      sec.style.display = sec.id === sectionId ? "block" : "none";
    });

    // Update tab button "active" class
    adminTabs.forEach((btn) => {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle("active", isActive);
    });

    // Optional: call loaders if they exist
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
  // Login Form Submission
  // -----------------------------
  async function handleLoginSubmit(e) {
    e.preventDefault();
    console.log("[Admin] Login attempt…");

    // IMPORTANT: match the IDs in index.html
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
        console.warn("[Admin] Auth request failed with status", res.status);
        alert("Invalid credentials.");
        return;
      }

      const data = await res.json();
      if (data && data.success && data.token) {
        console.log("[Admin] Login successful");
        isLoggedIn = true;
        localStorage.setItem("adminToken", data.token);

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
  // Logout Handler
  // -----------------------------
  function handleLogout() {
    console.log("[Admin] Logging out…");
    localStorage.removeItem("adminToken");
    isLoggedIn = false;
    hide(adminPanel);
    alert("Logged out.");
  }

  // -----------------------------
  // Show Admin Panel
  // -----------------------------
  function showAdminPanel() {
    console.log("[Admin] Showing admin panel…");

    show(adminPanel, "block");
    show(adminHeader, "flex");      // header is flex row in CSS
    if (adminTabsRow) show(adminTabsRow, "flex");

    // Default tab: Pets
    setActiveAdminTab("adminPets");
  }

  // -----------------------------
  // On Page Load — restore login state
  // -----------------------------
  function restoreLoginState() {
    const token = localStorage.getItem("adminToken");
    if (token) {
      console.log("[Admin] Restoring logged-in session");
      isLoggedIn = true;
      showAdminPanel();
    } else {
      hide(adminPanel);
      console.log("[Admin] No admin token — public view.");
    }
  }

 // -----------------------------
// Event Listeners
// -----------------------------
function addListeners() {
  // Click “Admin” in sticky nav
  if (adminNavLink) {
    adminNavLink.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("[Admin] Admin nav clicked");

      if (isLoggedIn) {
        // already authenticated -> jump straight to dashboard
        showAdminPanel();
      } else {
        // not logged in -> open login modal
        showLoginModal();
      }
    });
  }

  // Login modal close / cancel
  if (adminLoginClose) {
    adminLoginClose.addEventListener("click", (e) => {
      e.preventDefault();
      hideLoginModal();
    });
  }

  if (adminLoginCancel) {
    adminLoginCancel.addEventListener("click", (e) => {
      e.preventDefault();
      hideLoginModal();
    });
  }

  // Login submit
  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", handleLoginSubmit);
  }

  // Logout
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Tab switch buttons
  if (adminTabs && adminTabs.forEach) {
    adminTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        // data-section="adminPets" etc.
        const sectionId = btn.dataset.section;
        setActiveAdminTab(sectionId);
      });
    });
  }
}
  // -----------------------------
  // Initialize
  // -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Admin] Initializing admin.js…");
  cacheDom();
  addListeners();

  // restore prior session if any
  isLoggedIn = localStorage.getItem("dotsAdminToken") === "true";

  if (isLoggedIn) {
    console.log("[Admin] Restoring logged-in session");
    showAdminPanel();
  } else {
    console.log("[Admin] No admin token – public view.");
    hideAdminPanel();
  }
});
})();
