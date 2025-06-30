import { db, collection, getDocs, query, where } from "./firebase-config.js";
import { GENRES } from "./genres.js";
import { showMovieDetails } from "./movie-details.js";

const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

// Initialize genre filter
GENRES.forEach((genre) => {
  const option = document.createElement("option");
  option.value = genre;
  option.textContent = genre;
  genreFilter.appendChild(option);
});

searchBtn.addEventListener("click", searchMovies);

export async function searchMovies() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedGenre = genreFilter.value;

  try {
    let q;
    if (selectedGenre) {
      q = query(collection(db, "movies"), where("genre", "==", selectedGenre));
    } else {
      q = collection(db, "movies");
    }

    const querySnapshot = await getDocs(q);
    searchResults.innerHTML = "";

    if (querySnapshot.empty) {
      searchResults.innerHTML = `<div class="cyber-message">NO RESULTS FOUND</div>`;
      return;
    }

    // Get all ratings to calculate averages
    const ratingsSnapshot = await getDocs(collection(db, "ratings"));
    const ratingsData = {};

    ratingsSnapshot.forEach((doc) => {
      const rating = doc.data();
      if (!ratingsData[rating.movieId]) {
        ratingsData[rating.movieId] = {
          total: 0,
          count: 0,
        };
      }
      ratingsData[rating.movieId].total += rating.rating;
      ratingsData[rating.movieId].count++;
    });

    querySnapshot.forEach((doc) => {
      const movie = doc.data();

      if (!GENRES.includes(movie.genre)) return;
      if (searchTerm && !movie.title.toLowerCase().includes(searchTerm)) return;

      const avgRating = ratingsData[doc.id]
        ? (ratingsData[doc.id].total / ratingsData[doc.id].count).toFixed(1)
        : "N/A";

      const movieCard = document.createElement("div");
      movieCard.className = "cyber-movie-card";
      movieCard.dataset.id = doc.id;
      movieCard.innerHTML = `
        <div class="cyber-movie-title">${movie.title}</div>
        <div class="cyber-movie-meta">
          <span>${movie.year}</span>
          <span>${movie.genre}</span>
        </div>
        <div class="cyber-movie-rating">★ ${avgRating}</div>
      `;
      movieCard.addEventListener("click", () =>
        showMovieDetails(doc.id, {
          ...movie,
          avgRating: ratingsData[doc.id]
            ? ratingsData[doc.id].total / ratingsData[doc.id].count
            : null,
        })
      );
      searchResults.appendChild(movieCard);
    });
  } catch (error) {
    console.error("Search error:", error);
    searchResults.innerHTML = `<div class="cyber-message error">SEARCH FAILED</div>`;
  }
}
