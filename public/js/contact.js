/* contact.js — handles customer contact form */

document.addEventListener("DOMContentLoaded", () => {
  console.log("📮 Initializing Contact Form...");

  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) {
      console.warn("⚠️ Contact form not found in DOM (this is OK on non-contact pages).");
      return; // exit silently
    }

    console.log("📮 Contact form ready");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fd = new FormData(form);

      const payload = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        best_time: fd.get("best_time"),
        service: fd.get("service"),
        start_date: fd.get("start_date"),
        end_date: fd.get("end_date"),
        pet_info: fd.get("pet_info"),
        message: fd.get("message"),
      };

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        alert("Your message was sent successfully! 🐾");
        form.reset();
      } catch (err) {
        console.error("❌ Contact form submit failed:", err);
        alert("There was a problem submitting your message. Please try again.");
      }
    });
  }

  // Run once at load
  initContactForm();

  // Also initialize again whenever hash navigation changes (#contact)
  window.addEventListener("hashchange", () => {
    if (location.hash === "#contact") {
      setTimeout(initContactForm, 50);
    }
  });
});
