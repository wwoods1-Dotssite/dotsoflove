// ============================================================
// ADMIN PANEL CONTROLLER (CommonJS-safe browser script)
// Version: Stable — matches index.html exactly
// ============================================================

(() => {

  // -----------------------------
  // State
  // -----------------------------
  let isLoggedIn = false;

  // -----------------------------
  // Cached DOM References
  // -----------------------------
  let adminNavLink,
    adminLoginModal,
    adminLoginForm,
    adminLoginClose,
    adminLoginCancel,
    adminPanel,
    adminHeader,
    adminLogoutBtn,
    adminTabs,
    adminSections;

  // -----------------------------
  // Cache DOM elements
  // -----------------------------
  function cacheDom() {
    adminNavLink = document.getElementById("adminNav");

    // Login modal
    adminLoginModal = document.getElementById("adminLoginModal");
    adminLoginForm = document.getElementById("adminLoginForm");
    adminLoginClose = document.getElementById("adminLoginClose");
    adminLoginCancel = document.getElementById("adminLoginCancel");

    // Admin panel + header + tabs
    adminPanel = document.getElementById("adminPanel");
    adminHeader = document.getElementById("adminHeader");
    adminLogoutBtn = document.getElementById("adminLogoutBtn");

    // Tab buttons and sections
    adminTabs = document.querySelectorAll(".admin-tab");
    adminSections = document.querySelectorAll(".admin-section");
  }

  // -----------------------------
  // Utility: Show/Hide Elements
  // -----------------------------
  function show(el) {
    if (el) el.style.display = "block";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  // -----------------------------
  // Admin Login Modal
  // -----------------------------
  function openLoginModal() {
    adminLoginForm.reset();
    show(adminLoginModal);
  }

  function closeLoginModal() {
    hide(adminLoginModal);
  }

  // -----------------------------
  // Switch Active Admin Tab
  // -----------------------------
  function activateTab(sectionId) {
    console.log("[Admin] Switching to tab:", sectionId);

    // Deactivate all tabs
    adminTabs.forEach((btn) => btn.classList.remove("active"));
    adminSections.forEach((sec) => hide(sec));

    // Activate selected tab
    const selectedBtn = document.querySelector(`[data-section="${sectionId}"]`);
    const selectedSection = document.getElementById(sectionId);

    if (selectedBtn) selectedBtn.classList.add("active");
    show(selectedSection);
  }

  // -----------------------------
  // Login Form Submission
  // -----------------------------
  async function handleLoginSubmit(e) {
    e.preventDefault();
    console.log("[Admin] Login attempt...");

    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value.trim();

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        console.log("[Admin] Login successful");
        isLoggedIn = true;
        localStorage.setItem("adminToken", data.token);

        closeLoginModal();
        showAdminPanel();
        return;
      }
    }

    alert("Invalid credentials.");
  }

  // -----------------------------
  // Logout Handler
  // -----------------------------
  function handleLogout() {
    localStorage.removeItem("adminToken");
    isLoggedIn = false;
    hide(adminPanel);
    alert("Logged out.");
  }

  // -----------------------------
  // Show Admin Panel
  // -----------------------------
  function showAdminPanel() {
    console.log("[Admin] Showing admin panel...");

    show(adminPanel);
    show(adminHeader);

    // Default to Pets section
    activateTab("adminPets");
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
    }
  }

  // -----------------------------
  // Event Listeners
  // -----------------------------
  function addListeners() {

    // Click "Admin" in sticky nav
    if (adminNavLink) {
      adminNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[Admin] Admin nav clicked");

        if (isLoggedIn) {
          showAdminPanel();
        } else {
          openLoginModal();
        }
      });
    }

    // Login modal events
    if (adminLoginClose) adminLoginClose.addEventListener("click", closeLoginModal);
    if (adminLoginCancel) adminLoginCancel.addEventListener("click", closeLoginModal);

    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", handleLoginSubmit);
    }

    // Logout
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", handleLogout);
    }

    // Tab switch buttons
    adminTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.dataset.section;
        activateTab(section);
      });
    });
  }

  // -----------------------------
  // Initialize
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[Admin] Initializing admin.js...");
    cacheDom();
    addListeners();
    restoreLoginState();
  });

})();
