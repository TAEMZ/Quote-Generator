// movie-ranking.js
import { db, collection, getDocs, query, where } from "./firebase-config.js";
import { GENRES } from "./genres.js";
import { showMovieDetails } from "./movie-details.js";

const rankingContainer = document.getElementById("moviesRanking");
let allMovies = [];

export async function loadRankings() {
  try {
    const moviesSnapshot = await getDocs(collection(db, "movies"));
    allMovies = [];

    for (const doc of moviesSnapshot.docs) {
      const movie = doc.data();

      if (!GENRES.includes(movie.genre)) continue;

      // Get ratings
      const ratingsQuery = query(
        collection(db, "ratings"),
        where("movieId", "==", doc.id)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);

      // Get the original submission comment (with rating)
      const submissionQuery = query(
        collection(db, "ratings"),
        where("movieId", "==", doc.id),
        where("isSubmission", "==", true)
      );
      const submissionSnapshot = await getDocs(submissionQuery);

      let totalRating = 0;
      let ratingCount = 0;
      const ratingDistribution = [0, 0, 0, 0, 0];
      let submissionComment = null;

      ratingsSnapshot.forEach((ratingDoc) => {
        const rating = ratingDoc.data().rating;
        totalRating += rating;
        ratingCount++;
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating - 1]++;
        }
      });

      if (!submissionSnapshot.empty) {
        const submissionData = submissionSnapshot.docs[0].data();
        submissionComment = {
          text: submissionData.comment || "No comment provided",
          rating: submissionData.rating,
        };
      }

      if (ratingCount > 0) {
        allMovies.push({
          id: doc.id,
          title: movie.title,
          year: movie.year,
          genre: movie.genre,
          avgRating: totalRating / ratingCount,
          ratingCount,
          ratingDistribution,
          submissionComment,
        });
      }
    }

    // Sort by average rating (descending)
    allMovies.sort((a, b) => b.avgRating - a.avgRating);
    displayRankings();
  } catch (error) {
    console.error("Error loading rankings:", error);
    rankingContainer.innerHTML =
      '<div class="cyber-message error">FAILED TO LOAD RANKINGS</div>';
  }
}

function displayRankings() {
  rankingContainer.innerHTML = "";

  if (allMovies.length === 0) {
    rankingContainer.innerHTML =
      '<div class="cyber-message">NO RATINGS YET. BE THE FIRST TO RATE!</div>';
    return;
  }

  allMovies.forEach((movie, index) => {
    const rankItem = document.createElement("div");
    rankItem.className = "cyber-rank-item";

    // Build comment preview
    const commentPreview = movie.submissionComment
      ? `<div class="cyber-comment-preview">
           <div class="cyber-comment-text">"${movie.submissionComment.text}"</div>
           <div class="cyber-comment-rating">${movie.submissionComment.rating}★</div>
         </div>`
      : '<div class="cyber-comment-preview"><div class="cyber-comment-text">No submission comment</div></div>';

    rankItem.innerHTML = `
      <div class="cyber-rank-position">${index + 1}</div>
      <div class="cyber-rank-info">
        <div class="cyber-rank-title">${movie.title}</div>
        <div class="cyber-rank-meta">
          <span>${movie.year}</span>
          <span>${movie.genre}</span>
        </div>
      </div>
      <div class="cyber-comment-section">
        ${commentPreview}
      </div>
      <div class="cyber-rank-rating" data-tooltip="${getRatingTooltip(movie)}">
        <span class="cyber-rank-stars">★ ${movie.avgRating.toFixed(1)}</span>
        <span class="cyber-rank-count">(${movie.ratingCount})</span>
      </div>
    `;
    rankItem.dataset.movieid = movie.id;
    rankItem.addEventListener("click", () => {
      showMovieDetails(movie.id, movie);
    });

    rankingContainer.appendChild(rankItem);
  });
}

function getRatingTooltip(movie) {
  return `Rating Distribution:\n
  5★: ${movie.ratingDistribution[4]}\n
  4★: ${movie.ratingDistribution[3]}\n
  3★: ${movie.ratingDistribution[2]}\n
  2★: ${movie.ratingDistribution[1]}\n
  1★: ${movie.ratingDistribution[0]}`;
}

export function getRankedMovies() {
  return [...allMovies];
}

document.addEventListener("DOMContentLoaded", loadRankings);
