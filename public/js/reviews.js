// public/js/reviews.js
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openReviewModalBtn");
  const modal = document.getElementById("publicReviewModal");
  const closeIcon = document.getElementById("closePublicReviewModal");
  const cancelBtn = document.getElementById("cancelPublicReviewBtn");
  const form = document.getElementById("publicReviewForm");
  const submitBtn = document.getElementById("submitPublicReviewBtn");
  const listContainer = document.getElementById("publicReviewsContainer");

  if (!modal || !openBtn) {
    // Reviews section not on this page – nothing to do.
    return;
  }

  function openModal() {
    modal.classList.add("open");
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  });

  closeIcon?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  async function loadPublicReviews() {
    try {
      const resp = await fetch("/api/reviews/public");
      if (!resp.ok) throw new Error("Failed to load reviews");
      const reviews = await resp.json();

      listContainer.innerHTML = "";
      if (!reviews.length) {
        listContainer.innerHTML =
          '<p class="reviews-empty">No reviews yet – be the first to share your experience!</p>';
        return;
      }

      for (const r of reviews) {
        const card = document.createElement("article");
        card.className = "review-card";
        card.innerHTML = `
          <div class="review-card-header">
            <h3>${r.reviewer_name || "Happy Client"}</h3>
            <div class="review-rating">
              <span class="star">★</span>
              <span>${r.rating || 5}/5</span>
            </div>
          </div>
          <p class="review-text">${r.review_text || ""}</p>
          <p class="review-date">
            Submitted on ${
              r.created_at
                ? new Date(r.created_at).toLocaleDateString()
                : "–"
            }
          </p>
        `;
        listContainer.appendChild(card);
      }
    } catch (err) {
      console.error("Error loading public reviews:", err);
      listContainer.innerHTML =
        '<p class="reviews-empty error">Unable to load reviews right now.</p>';
    }
  }

  async function submitPublicReview(e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      reviewer_name: form.reviewerName.value.trim(),
      rating: Number(form.reviewRating.value || 5),
      review_text: form.reviewText.value.trim(),
    };

    submitBtn.disabled = true;

    try {
      const resp = await fetch("/api/reviews/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        console.error("Review submit failed:", await resp.text());
        alert("Sorry, there was a problem submitting your review.");
        return;
      }

      alert(
        "Thank you! Your review has been submitted and will appear once Dorothy approves it."
      );
      form.reset();
      closeModal();
      await loadPublicReviews();
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Network error submitting review.");
    } finally {
      submitBtn.disabled = false;
    }
  }

  form.addEventListener("submit", submitPublicReview);

  // Initial load of approved public reviews
  loadPublicReviews();
});
