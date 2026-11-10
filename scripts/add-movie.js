import {
  db,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  getViewerSessionId,
} from "./firebase-config.js";
import { GENRES } from "./genres.js";
import { loadRankings } from "./movie-ranking.js";
import { searchMovies } from "./search-movies.js";
import { invalidateCatalogCache } from "./movie-store.js";

const movieForm = document.getElementById("movieForm");
const titleInput = document.getElementById("title");
const yearSelect = document.getElementById("year");
const genreSelect = document.getElementById("genre");
const commentInput = document.getElementById("comment");
const stars = document.querySelectorAll("#movieStarGroup .star-btn");
const ratingHint = document.getElementById("movieRatingHint");
const submitMovieBtn = document.getElementById("submitMovieBtn");
const formMessage = document.getElementById("formMessage");
const rankingsSection = document.getElementById("rankings-section");
const cancelAddMovieBtn = document.getElementById("cancelAddMovieBtn");

let selectedRating = 0;

// Initialize year dropdown
const currentYear = new Date().getFullYear();
for (let year = currentYear; year >= 1900; year--) {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = String(year);
  yearSelect.appendChild(option);
}

// Initialize genre select
GENRES.forEach((genre) => {
  const option = document.createElement("option");
  option.value = genre;
  option.textContent = genre;
  genreSelect.appendChild(option);
});

function updateStarDisplay(rating, isHover = false) {
  stars.forEach((star, index) => {
    if (isHover) {
      star.classList.toggle("is-hovered", index < rating);
    } else {
      star.classList.remove("is-hovered");
      star.classList.toggle("active", index < rating);
    }
  });
  if (!isHover && ratingHint) {
    ratingHint.textContent = rating > 0 ? `${rating} / 5` : "";
  }
}

stars.forEach((star) => {
  const value = parseInt(star.dataset.value, 10);

  star.addEventListener("mouseenter", () => {
    updateStarDisplay(value, true);
  });

  star.addEventListener("mouseleave", () => {
    updateStarDisplay(0, true);
  });

  star.addEventListener("click", () => {
    selectedRating = value;
    updateStarDisplay(selectedRating, false);
  });
});

function activateTab(tabId) {
  document.querySelectorAll(".tab-trigger").forEach((t) => {
    const isTarget = t.dataset.tab === tabId;
    t.classList.toggle("active", isTarget);
    t.setAttribute("aria-selected", String(isTarget));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  if (tabId === "add-movie") {
    titleInput?.focus({ preventScroll: true });
  }
}

document.querySelectorAll(".tab-trigger").forEach((tab) => {
  tab.addEventListener("click", () => {
    activateTab(tab.dataset.tab);
  });
});

function setActiveNavView(view) {
  document.querySelectorAll(".nav-pill-group .nav-link").forEach((navItem) => {
    const isCurrent = navItem.dataset.navView === view;
    navItem.classList.toggle("active", isCurrent);
    if (isCurrent) {
      navItem.setAttribute("aria-current", "page");
    } else {
      navItem.removeAttribute("aria-current");
    }
  });
}

document.querySelectorAll("[data-nav-view]").forEach((link) => {
  link.addEventListener("click", () => {
    const view = link.dataset.navView;
    setActiveNavView(view);
    if (view === "rankings" || view === "catalog") {
      activateTab("search-movies");
    }
  });
});

cancelAddMovieBtn?.addEventListener("click", () => {
  activateTab("search-movies");
});

function syncTabFromHash() {
  if (window.location.hash === "#add-movie") {
    activateTab("add-movie");
  } else if (window.location.hash === "#rankings-section") {
    activateTab("search-movies");
    setActiveNavView("rankings");
    rankingsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

window.addEventListener("hashchange", syncTabFromHash);
document.addEventListener("DOMContentLoaded", syncTabFromHash);

// Form submission
movieForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const year = yearSelect.value;
  const genre = genreSelect.value;
  const comment = commentInput.value.trim();

  if (!title || !year || !genre || selectedRating === 0) {
    showMessage("Please complete title, release year, genre, and a 1 to 5 rating.", "error");
    return;
  }

  submitMovieBtn.disabled = true;
  submitMovieBtn.textContent = "Submitting...";

  try {
    const moviesRef = collection(db, "movies");
    const allMovies = await getDocs(moviesRef);

    const titleLower = title.toLowerCase();
    const yearNum = parseInt(year, 10);

    let movieExists = false;
    allMovies.forEach((docSnap) => {
      const movieData = docSnap.data();
      const existingTitleLower = movieData.title?.toLowerCase() || "";
      const existingYear = movieData.year || 0;

      if (existingTitleLower === titleLower && existingYear === yearNum) {
        movieExists = true;
      }
    });

    if (movieExists) {
      showMessage("This movie and release year already exist in the catalog.", "error");
      return;
    }

    const movieRef = await addDoc(moviesRef, {
      title,
      year: yearNum,
      genre,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "ratings"), {
      movieId: movieRef.id,
      rating: selectedRating,
      comment: comment || "No comment provided",
      createdAt: serverTimestamp(),
      sessionId: getViewerSessionId(),
      isSubmission: true,
    });

    invalidateCatalogCache();
    showMessage("Movie entry saved and added to rankings.", "success");
    movieForm.reset();
    selectedRating = 0;
    updateStarDisplay(0, false);

    await Promise.all([loadRankings(), searchMovies()]);
  } catch (error) {
    console.error("Database error:", error);
    showMessage("Database connection failed. Please try again.", "error");
  } finally {
    submitMovieBtn.disabled = false;
    submitMovieBtn.textContent = "Submit Entry";
  }
});

let messageTimer = null;
function showMessage(message, type) {
  if (messageTimer) clearTimeout(messageTimer);
  formMessage.textContent = message;
  formMessage.className = `form-notice ${type}`;
  messageTimer = setTimeout(() => {
    formMessage.textContent = "";
    formMessage.className = "form-notice";
  }, 4000);
}
