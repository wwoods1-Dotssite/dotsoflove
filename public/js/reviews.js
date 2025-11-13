// reviews.js — public reviews display + modal submission

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reviewForm");
  const openBtn = document.getElementById("openReviewModalBtn");
  const closeBtn = document.getElementById("closeReviewModalBtn");
  const modal = document.getElementById("reviewModal");

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => openReviewModal(modal));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => closeReviewModal(modal));
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeReviewModal(modal);
    });
  }
  if (form) {
    form.addEventListener("submit", handleReviewSubmit);
  }

  loadPublicReviews();
});

function openReviewModal(modal) {
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("open");
}

function closeReviewModal(modal) {
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("open");

  const statusEl = document.getElementById("reviewStatus");
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.classList.remove("error", "success");
  }
}

// Load approved reviews for public display
async function loadPublicReviews() {
  const list = document.getElementById("reviewsList");
  const emptyMsg = document.getElementById("noReviewsMessage");
  if (!list) return;

  try {
    const res = await fetch("/api/reviews");
    const reviews = await res.json();

    if (!reviews.length) {
      list.innerHTML = "";
      if (emptyMsg) emptyMsg.style.display = "block";
      return;
    } else if (emptyMsg) {
      emptyMsg.style.display = "none";
    }

    list.innerHTML = reviews
      .map((r) => {
        const date = r.created_at
          ? new Date(r.created_at).toLocaleDateString()
          : "";
        return `
          <article class="review-card">
            <header class="review-header">
              <h4>${r.customer_name}</h4>
              <span class="review-rating">⭐ ${r.rating}/5</span>
            </header>
            <p class="review-text">${r.review_text}</p>
            ${
              date
                ? `<p class="review-date">Submitted on ${date}</p>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading public reviews:", err);
    list.innerHTML = `<p class="error">Unable to load reviews right now.</p>`;
  }
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  const statusEl = document.getElementById("reviewStatus");
  const nameEl = document.getElementById("reviewName");
  const ratingEl = document.getElementById("reviewRating");
  const textEl = document.getElementById("reviewText");

  const payload = {
    customer_name: nameEl.value.trim(),
    rating: parseInt(ratingEl.value, 10),
    review_text: textEl.value.trim(),
  };

  if (!payload.customer_name || !payload.rating || !payload.review_text) {
    if (statusEl) {
      statusEl.textContent = "Please complete all fields.";
      statusEl.classList.add("error");
    }
    return;
  }

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (statusEl) {
        statusEl.textContent =
          data.message || "Thank you! Your review is pending approval.";
        statusEl.classList.remove("error");
        statusEl.classList.add("success");
      }
      // Clear form
      nameEl.value = "";
      ratingEl.value = "";
      textEl.value = "";

      // Keep modal open so they can read message; you can auto-close if you want
      // Refresh public reviews (once approved, they'll appear)
      loadPublicReviews();
    } else {
      if (statusEl) {
        statusEl.textContent =
          data.message || "There was a problem submitting your review.";
        statusEl.classList.add("error");
      }
    }
  } catch (err) {
    console.error("Error submitting review:", err);
    if (statusEl) {
      statusEl.textContent = "Network error submitting your review.";
      statusEl.classList.add("error");
    }
  }
}
