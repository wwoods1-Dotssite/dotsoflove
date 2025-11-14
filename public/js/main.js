// main.js – shared page bootstrap

document.addEventListener("DOMContentLoaded", () => {
  console.log("💜 main.js initialized");

  // Only call admin auth helper if it actually exists.
  if (typeof window.checkAdminAuth === "function") {
    try {
      window.checkAdminAuth();
    } catch (err) {
      console.warn("checkAdminAuth threw an error:", err);
    }
  } else {
    // This is totally normal on non-admin views.
    console.debug("checkAdminAuth is not defined (non-admin view).");
  }
});
