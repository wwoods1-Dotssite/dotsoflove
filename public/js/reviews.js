// public/js/reviews.js
document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("reviewModal");
  const closeBtn = document.querySelector("#reviewModal .close-btn");
  const cancelBtn = document.getElementById("cancelReviewBtn");
  const openBtn = document.getElementById("openReviewModalBtn");
  const form = document.getElementById("reviewForm");
  const submitBtn = document.getElementById("submitReviewBtn");
  const reviewList = document.getElementById("publicReviews");

  if (!modal) {
    console.warn("[Reviews] reviewModal not found — skipping review setup.");
    return;
  }

  // --------------------------------------------------
  // Helpers: Open / Close Modal
  // --------------------------------------------------
  function openReviewModal() {
    modal.classList.remove("hidden");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeReviewModal() {
    modal.classList.remove("show");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  // --------------------------------------------------
  // Event Listeners
  // --------------------------------------------------
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openReviewModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeReviewModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeReviewModal);
  }

  // close when clicking background overlay
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeReviewModal();
  });

  // --------------------------------------------------
  // Submit Review
  // --------------------------------------------------
  async function submitReview(e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      customer_name: form.reviewerName.value.trim(),
      rating: Number(form.reviewerRating.value),
      review_text: form.reviewerText.value.trim(),
    };

    submitBtn.disabled = true;

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Review submission failed", await res.text());
        alert("Error submitting review.");
        return;
      }

      alert("Thank you! Your review was submitted and awaits approval.");

      // reset + close modal
      form.reset();
      closeReviewModal();

      // reload approved reviews
      loadReviews();

    } catch (err) {
      console.error("Network error submitting review:", err);
      alert("Network error submitting review.");
    }

    submitBtn.disabled = false;
  }

  form.addEventListener("submit", submitReview);

  // --------------------------------------------------
  // Load Approved Reviews
  // --------------------------------------------------
  async function loadReviews() {
    if (!reviewList) return;

    try {
      const res = await fetch("/api/reviews/approved");
      const reviews = await res.json();

      reviewList.innerHTML = "";

      if (!Array.isArray(reviews) || reviews.length === 0) {
        reviewList.innerHTML =
          "<p>No reviews yet — be the first to share your experience!</p>";
        return;
      }

      for (const r of reviews) {
        const item = document.createElement("div");
        item.className = "review-card";
        item.innerHTML = `
          <h4>${r.customer_name}</h4>
          <div class="rating">⭐ ${r.rating}/5</div>
          <p>${r.review_text}</p>
          <small>${new Date(r.created).toLocaleDateString()}</small>
        `;
        reviewList.appendChild(item);
      }

    } catch (err) {
      console.error("Error loading reviews:", err);
      reviewList.innerHTML = "<p>Error loading reviews.</p>";
    }
  }

  loadReviews(); // initial load
});
