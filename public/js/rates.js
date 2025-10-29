/* =========================================
   rates.js — Dynamic Service Rate Renderer
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("💲 Loading Rates...");
  const API_URL = "/api/rates";

  const featuredContainer = document.createElement("div");
  featuredContainer.classList.add("rates-featured");

  const gridContainer = document.createElement("div");
  gridContainer.classList.add("rates-grid");

  const section = document.getElementById("rates");
  if (!section) {
    console.error("❌ Rates section not found in HTML");
    return;
  }

  section.innerHTML = `
    <h2 class="section-title">Service Rates</h2>
    <p class="section-subtitle">Affordable, caring options for every pet</p>
  `;

  section.appendChild(featuredContainer);
  section.appendChild(gridContainer);

  try {
    const res = await fetch(API_URL);
    const rates = await res.json();

    if (!Array.isArray(rates)) throw new Error("Invalid rates data");

    const featured = rates.find(r => r.is_featured);
    const standard = rates.filter(r => !r.is_featured);

    // Render featured card
    if (featured) {
      const card = createRateCard(featured, true);
      featuredContainer.appendChild(card);
    }

    // Render remaining cards
    standard.forEach(rate => {
      const card = createRateCard(rate, false);
      gridContainer.appendChild(card);
    });
  } catch (err) {
    console.error("❌ Failed to load rates:", err);
    section.innerHTML += `<p class="error">Could not load service rates.</p>`;
  }
});

function createRateCard(rate, isFeatured) {
  const card = document.createElement("div");
  card.classList.add("rate-card");
  if (isFeatured) card.classList.add("featured");

  const badge = isFeatured
    ? `<div class="featured-badge">⭐ Featured Service</div>`
    : "";

  card.innerHTML = `
    ${badge}
    <h3>${rate.service_type}</h3>
    <p>${rate.description || ""}</p>
    <strong>$${parseFloat(rate.rate_per_unit).toFixed(2)} ${
      rate.unit_type.replace("_", " ")
    }</strong>
  `;
  return card;
}
