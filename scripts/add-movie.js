import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "./firebase-config.js";
import { GENRES } from "./genres.js";
import { loadRankings } from "./movie-ranking.js";

const movieForm = document.getElementById("movieForm");
const titleInput = document.getElementById("title");
const yearSelect = document.getElementById("year");
const genreSelect = document.getElementById("genre");
const commentInput = document.getElementById("comment");
const stars = document.querySelectorAll(".cyber-star");
const formMessage = document.getElementById("formMessage");
let selectedRating = 0;

// Initialize year dropdown
const currentYear = new Date().getFullYear();
for (let year = currentYear; year >= 1900; year--) {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  yearSelect.appendChild(option);
}

// Initialize genre select
GENRES.forEach((genre) => {
  const option = document.createElement("option");
  option.value = genre;
  option.textContent = genre;
  genreSelect.appendChild(option);
});

// Star rating functionality
stars.forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    stars.forEach((s, index) => {
      s.classList.toggle("active", index < selectedRating);
    });
  });
});

// Form submission
movieForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const year = yearSelect.value;
  const genre = genreSelect.value;
  const comment = commentInput.value.trim();

  if (!title || !year || !genre || selectedRating === 0) {
    showMessage("PLEASE COMPLETE ALL REQUIRED FIELDS", "error");
    return;
  }

  try {
    // First check existing movies (case-insensitive)
    const moviesRef = collection(db, "movies");
    const allMovies = await getDocs(moviesRef);

    // Convert to lowercase for comparison
    const titleLower = title.toLowerCase();
    const yearNum = parseInt(year);

    // Check for existing movie with same title (case-insensitive) and year
    let movieExists = false;
    allMovies.forEach((doc) => {
      const movieData = doc.data();
      const existingTitleLower = movieData.title?.toLowerCase() || "";
      const existingYear = movieData.year || 0;

      if (existingTitleLower === titleLower && existingYear === yearNum) {
        movieExists = true;
      }
    });

    if (movieExists) {
      showMessage("MOVIE ALREADY EXISTS IN DATABASE", "error");
      return;
    }

    // Add new movie
    const movieRef = await addDoc(moviesRef, {
      title,
      year: yearNum,
      genre,
      createdAt: serverTimestamp(),
    });

    // Add rating/comment as submission
    await addDoc(collection(db, "ratings"), {
      movieId: movieRef.id,
      rating: selectedRating,
      comment: comment || "No comment provided",
      createdAt: serverTimestamp(),
      sessionId: generateSessionId(),
      isSubmission: true, // Mark this as the submission rating
    });

    showMessage("MOVIE ADDED SUCCESSFULLY", "success");
    movieForm.reset();
    stars.forEach((star) => star.classList.remove("active"));
    selectedRating = 0;
    loadRankings();
  } catch (error) {
    console.error("Database error:", error);
    showMessage("DATABASE CONNECTION FAILED", "error");
  }
});

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `cyber-message ${type}`;
  setTimeout(() => {
    formMessage.textContent = "";
    formMessage.className = "cyber-message";
  }, 3000);
}

function generateSessionId() {
  return "session_" + Math.random().toString(36).substr(2, 9);
}

// Tab functionality
document.querySelectorAll(".cyber-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".cyber-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".cyber-tab-content")
      .forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});
