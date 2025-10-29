document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const serviceDropdown = document.getElementById("service");

  if (!form) {
    console.warn("Contact form not found in DOM.");
    return;
  }

  // ✅ Populate services dynamically
  fetch("/api/rates")
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) throw new Error("Invalid JSON structure");
      data.forEach(rate => {
        const option = document.createElement("option");
        option.value = rate.service_type;
        option.textContent = rate.service_type;
        serviceDropdown.appendChild(option);
      });
    })
    .catch(err => {
      console.warn("⚠️ Could not fetch rates for dropdown:", err);
    });

  // ✅ Handle form submission
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    formStatus.textContent = "Sending...";
    formStatus.className = "form-status";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        formStatus.textContent = "✅ Message sent successfully!";
        formStatus.classList.add("success");
        form.reset();
      } else {
        formStatus.textContent = "⚠️ There was an issue sending your message.";
        formStatus.classList.add("error");
      }
    } catch (err) {
      console.error("❌ Contact form error:", err);
      formStatus.textContent = "❌ Network or server error.";
      formStatus.classList.add("error");
    }
  });
});
