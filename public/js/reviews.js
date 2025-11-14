// public/js/reviews.js
// Handles the public "Share Your Experience" modal + submission

(function () {
  "use strict";

  let reviewModal;
  let openBtn;
  let closeBtn;
  let cancelBtn;
  let form;
  let listContainer;

  // -----------------------------
  // Helpers: show/hide modal
  // -----------------------------
  function showReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.remove("hidden");
    reviewModal.classList.add("show");
    reviewModal.setAttribute("aria-hidden", "false");
    console.log("[Reviews] Opening review modal");
  }

  function hideReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.remove("show");
    reviewModal.classList.add("hidden");
    reviewModal.setAttribute("aria-hidden", "true");
    console.log("[Reviews] Closing review modal");
  }

  // -----------------------------
  // Submit handler
  // -----------------------------
  async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!form) return;

    const name = form.querySelector("#reviewName").value.trim();
    const rating = parseInt(
      form.querySelector("#reviewRating").value,
      10
    );
    const text = form.querySelector("#reviewText").value.trim();

    if (!name || !text || !rating) {
      alert("Please fill in your name, rating, and review text.");
      return;
    }

    const payload = {
      customer_name: name,
      rating: rating,
      review_text: text,
    };

    console.log("[Reviews] Submitting review payload:", payload);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("[Reviews] Server responded with", res.status);
        alert(
          "Sorry, there was a problem submitting your review. Please try again."
        );
        return;
      }

      // Clear the form and close the modal
      form.reset();
      hideReviewModal();

      alert(
        "Thank you! Your review has been submitted and will appear once approved."
      );
    } catch (err) {
      console.error("[Reviews] Error submitting review:", err);
      alert(
        "Sorry, there was a network error submitting your review. Please try again."
      );
    }
  }

  // -----------------------------
  // (Optional) Load approved reviews
  // -----------------------------
  async function loadApprovedReviews() {
    if (!listContainer) return; // If you don't have a list on the page, skip.

    try {
      const res = await fetch("/api/reviews");
      if (!res.ok) {
        console.warn(
          "[Reviews] Failed to load approved reviews, status:",
          res.status
        );
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data)) return;

      listContainer.innerHTML = "";

      if (data.length === 0) {
        listContainer.innerHTML =
          '<p class="muted">No reviews yet—be the first to share your experience!</p>';
        return;
      }

      data
        .filter((r) => r.approved !== false) // if backend includes approved flag
        .forEach((review) => {
          const card = document.createElement("article");
          card.className = "review-card";

          const nameEl = document.createElement("h4");
          nameEl.textContent = review.customer_name || "Happy Client";

          const ratingEl = document.createElement("div");
          ratingEl.className = "review-rating";
          const stars = "★★★★★☆☆☆☆☆".slice(5 - (review.rating || 5), 10);
          ratingEl.textContent = "★".repeat(review.rating || 5);

          const textEl = document.createElement("p");
          textEl.textContent = review.review_text || "";

          card.appendChild(nameEl);
          card.appendChild(ratingEl);
          card.appendChild(textEl);

          listContainer.appendChild(card);
        });
    } catch (err) {
      console.warn("[Reviews] Error loading approved reviews:", err);
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    reviewModal = document.getElementById("reviewModal");
    openBtn = document.getElementById("openReviewModal");
    closeBtn = document.getElementById("reviewModalClose");
    cancelBtn = document.getElementById("reviewModalCancel");
    form = document.getElementById("reviewForm");
    listContainer = document.getElementById("publicReviewsList");

    console.log("[Reviews] Initializing reviews.js", {
      reviewModal,
      openBtn,
      closeBtn,
      cancelBtn,
      form,
      listContainer,
    });

    // Wire up open
    if (openBtn) {
      openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showReviewModal();
      });
    }

    // Wire up close / cancel
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        hideReviewModal();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        hideReviewModal();
      });
    }

    // Clicking backdrop closes modal
    if (reviewModal) {
      reviewModal.addEventListener("click", (e) => {
        if (e.target === reviewModal) {
          hideReviewModal();
        }
      });
    }

    // Form submit
    if (form) {
      form.addEventListener("submit", handleReviewSubmit);
    }

    // Load approved reviews if the container exists
    loadApprovedReviews();
  });
})();
