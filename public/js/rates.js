// public/js/rates.js
// Public-facing rates display with "featured" support

document.addEventListener("DOMContentLoaded", () => {
  const ratesContainer = document.getElementById("ratesContainer");
  const featuredRateCard = document.getElementById("featuredRateCard");

  if (!ratesContainer) {
    console.warn("[Rates] #ratesContainer not found; skipping rates.js");
    return;
  }

  async function loadRates() {
    try {
      console.log("[Rates] Fetching rates…");
      const res = await fetch("/api/rates");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rates = await res.json();

      if (!Array.isArray(rates) || !rates.length) {
        ratesContainer.innerHTML =
          '<p class="rates-empty">Rates are coming soon. Please check back.</p>';
        if (featuredRateCard) featuredRateCard.innerHTML = "";
        return;
      }

      // Filter to active ones only
      const activeRates = rates.filter((r) => r.is_active !== false);

      // Find a featured rate (if any)
      const featured = activeRates.find((r) => r.is_featured);

      // Sort list for public display: featured first, then by created_at or id
      const sorted = [...activeRates].sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;

        if (a.created_at && b.created_at) {
          return new Date(a.created_at) - new Date(b.created_at);
        }
        return (a.id || 0) - (b.id || 0);
      });

      // ---------- Render featured card into ABOUT section ----------
      if (featuredRateCard) {
        if (featured) {
          featuredRateCard.innerHTML = createFeaturedRateCard(featured);
        } else {
          featuredRateCard.innerHTML = "";
        }
      }

      // ---------- Render full rates list ----------
      ratesContainer.innerHTML = createRatesGrid(sorted);
    } catch (err) {
      console.error("[Rates] Error loading rates:", err);
      ratesContainer.innerHTML =
        '<p class="rates-error">Sorry, rates are unavailable right now.</p>';
      if (featuredRateCard) featuredRateCard.innerHTML = "";
    }
  }

  function formatPrice(rate) {
    const num = Number(rate.rate_per_unit);
    if (Number.isNaN(num)) return rate.rate_per_unit || "";
    return `$${num.toFixed(2)}`;
  }

  function formatUnit(unitType) {
    switch (unitType) {
      case "per_visit":
        return "per visit";
      case "per_day":
        return "per day";
      case "per_night":
        return "per night";
      default:
        return unitType || "";
    }
  }

  function createFeaturedRateCard(rate) {
    const price = formatPrice(rate);
    const unit = formatUnit(rate.unit_type);

    return `
      <article class="featured-rate-card">
        <div class="featured-pill">Featured Service</div>
        <h3 class="featured-rate-title">${escapeHtml(rate.service_type || "")}</h3>
        <p class="featured-rate-price">
          <span class="amount">${price}</span>
          ${unit ? `<span class="unit"> ${escapeHtml(unit)}</span>` : ""}
        </p>
        ${
          rate.description
            ? `<p class="featured-rate-description">${escapeHtml(
                rate.description
              )}</p>`
            : ""
        }
      </article>
    `;
  }

  function createRatesGrid(rates) {
    if (!rates.length) {
      return '<p class="rates-empty">Rates are coming soon.</p>';
    }

    const cards = rates
      .map((r) => {
        const price = formatPrice(r);
        const unit = formatUnit(r.unit_type);
        const isFeatured = !!r.is_featured;

        return `
          <article class="rate-card ${isFeatured ? "featured" : ""}">
            ${
              isFeatured
                ? '<div class="rate-badge">Featured</div>'
                : ""
            }
            <h3 class="rate-title">${escapeHtml(r.service_type || "")}</h3>
            <p class="rate-price">
              <span class="amount">${price}</span>
              ${unit ? `<span class="unit"> ${escapeHtml(unit)}</span>` : ""}
            </p>
            ${
              r.description
                ? `<p class="rate-description">${escapeHtml(
                    r.description
                  )}</p>`
                : ""
            }
          </article>
        `;
      })
      .join("");

    return `<div class="rates-grid">${cards}</div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  loadRates();
});
