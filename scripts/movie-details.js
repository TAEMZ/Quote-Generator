import {
  db,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "./firebase-config.js";

const modal = document.getElementById("movieDetailsModal");
const closeBtn = document.querySelector(".cyber-close");
const commentForm = document.getElementById("commentForm");
let currentMovieId = null;
let currentMovieData = null;

export async function showMovieDetails(movieId, movieData) {
  currentMovieId = movieId;
  currentMovieData = movieData;

  const title = document.getElementById("movieDetailTitle");
  const year = document.getElementById("movieDetailYear");
  const genre = document.getElementById("movieDetailGenre");
  const rating = document.getElementById("movieDetailRating");
  const commentsContainer = document.getElementById("movieComments");
  const ratingStats = document.getElementById("ratingStats");

  // Set movie details
  title.textContent = movieData.title;
  year.textContent = movieData.year;
  genre.textContent = movieData.genre;
  rating.textContent = `★ ${movieData.avgRating?.toFixed(1) || "N/A"}`;

  // Set movieId on comment form
  commentForm.dataset.movieid = movieId;

  // Load rating statistics
  await loadRatingStats(movieId, ratingStats);

  // Load comments
  await loadComments(movieId, commentsContainer);

  // Show modal
  modal.style.display = "block";
}

async function loadRatingStats(movieId, container) {
  // Use the existing movie data for distribution
  const ratingCounts = currentMovieData.ratingDistribution || [0, 0, 0, 0, 0];
  const totalRatings = currentMovieData.ratingCount || 0;

  container.innerHTML = `
    <h3 class="cyber-comments-title">[ RATING DISTRIBUTION ]</h3>
    <div class="rating-distribution">
      ${ratingCounts
        .map(
          (count, index) => `
        <div class="rating-bar">
          <span>${index + 1}★</span>
          <div class="bar-container">
            <div class="bar" style="width: ${
              totalRatings ? (count / totalRatings) * 100 : 0
            }%"></div>
          </div>
          <span>${count}</span>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="cyber-message">Total ratings: ${totalRatings}</div>
  `;
}

async function loadComments(movieId, container) {
  // Get all comments for this movie
  const q = query(collection(db, "comments"), where("movieId", "==", movieId));
  const querySnapshot = await getDocs(q);

  container.innerHTML = "";

  // Build comment tree
  const comments = [];
  const commentMap = new Map();

  querySnapshot.forEach((doc) => {
    const commentData = doc.data();
    const comment = {
      id: doc.id,
      ...commentData,
      replies: [],
    };

    if (commentData.parentId) {
      const parent = commentMap.get(commentData.parentId);
      if (parent) parent.replies.push(comment);
    } else {
      comments.push(comment);
    }

    commentMap.set(doc.id, comment);
  });

  // Render comments
  if (comments.length === 0) {
    container.innerHTML = '<div class="cyber-message">NO COMMENTS YET</div>';
    return;
  }

  comments.forEach((comment) => {
    container.appendChild(renderComment(comment));
  });
}

function renderComment(comment, depth = 0) {
  const commentEl = document.createElement("div");
  commentEl.className = "cyber-comment";
  commentEl.style.marginLeft = `${depth * 20}px`;

  const date = comment.createdAt?.toDate
    ? comment.createdAt.toDate()
    : new Date();

  commentEl.innerHTML = `
    <div class="cyber-comment-header">
      <span>${date.toLocaleString()}</span>
      ${comment.rating ? `<span>Rating: ${comment.rating}★</span>` : ""}
    </div>
    <div class="cyber-comment-text">${comment.text}</div>
    <button class="cyber-reply-btn" data-commentid="${
      comment.id
    }">[ REPLY ]</button>
    <form class="cyber-reply-form" data-parentid="${
      comment.id
    }" style="display: none;">
      <textarea class="cyber-textarea" placeholder="Write your reply..." required></textarea>
      <button type="submit" class="cyber-button-small">[ POST REPLY ]</button>
    </form>
    <div class="cyber-comment-replies"></div>
  `;

  // Add reply button handler
  const replyBtn = commentEl.querySelector(".cyber-reply-btn");
  const replyForm = commentEl.querySelector(".cyber-reply-form");

  replyBtn.addEventListener("click", () => {
    replyForm.style.display =
      replyForm.style.display === "none" ? "block" : "none";
  });

  // Handle reply submission
  replyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = replyForm.querySelector("textarea");

    if (!textarea.value.trim()) {
      alert("Please enter a comment");
      return;
    }

    try {
      await addDoc(collection(db, "comments"), {
        movieId: comment.movieId, // Ensure movieId is included
        parentId: comment.id,
        text: textarea.value.trim(),
        createdAt: serverTimestamp(),
        sessionId: generateSessionId(),
        isReply: true, // Mark as reply
        isSubmission: false, // Explicitly not a submission
      });

      // Reload comments
      await loadComments(
        comment.movieId,
        document.getElementById("movieComments")
      );
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  });

  // Render replies if they exist
  if (comment.replies.length > 0) {
    const repliesContainer = commentEl.querySelector(".cyber-comment-replies");
    comment.replies.forEach((reply) => {
      repliesContainer.appendChild(renderComment(reply, depth + 1));
    });
  }

  return commentEl;
}

// Main comment form submission
commentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const movieId = commentForm.dataset.movieid;
  const textarea = commentForm.querySelector("textarea");
  const stars = commentForm.querySelectorAll(".cyber-star.active");
  const rating = stars.length;

  if (!textarea.value.trim()) {
    alert("Please enter a comment");
    return;
  }

  try {
    // Save as both a comment and a rating
    await Promise.all([
      addDoc(collection(db, "comments"), {
        movieId,
        text: textarea.value.trim(),
        rating: rating > 0 ? rating : null,
        createdAt: serverTimestamp(),
        sessionId: generateSessionId(),
        isSubmission: false, // Explicitly mark as not submission
      }),
      addDoc(collection(db, "ratings"), {
        movieId,
        rating: rating > 0 ? rating : null,
        createdAt: serverTimestamp(),
        sessionId: generateSessionId(),
        isSubmission: false, // Explicitly mark as not submission
      }),
    ]);

    // Reload all data
    await loadRatingStats(movieId, document.getElementById("ratingStats"));
    await loadComments(movieId, document.getElementById("movieComments"));

    // Update the movie list by reloading rankings
    const rankingModule = await import("./movie-ranking.js");
    await rankingModule.loadRankings();

    // Re-open the details view to show updated data
    const movieElement = document.querySelector(
      `.cyber-rank-item[data-movieid="${movieId}"]`
    );
    if (movieElement) {
      movieElement.click();
    }

    // Reset form
    textarea.value = "";
    stars.forEach((star) => star.classList.remove("active"));
  } catch (error) {
    console.error("Error adding comment:", error);
  }
});

// Initialize star rating functionality
function initStarRating() {
  commentForm?.querySelectorAll(".cyber-star").forEach((star) => {
    star.addEventListener("click", function () {
      const value = parseInt(this.dataset.value);
      const stars = this.parentElement.querySelectorAll(".cyber-star");
      stars.forEach((s, i) => {
        s.classList.toggle("active", i < value);
      });
    });
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initStarRating();
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

function generateSessionId() {
  return "session_" + Math.random().toString(36).substr(2, 9);
}
