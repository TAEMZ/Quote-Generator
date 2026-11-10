import { showMovieDetails } from "./movie-details.js";
import { getMoviesCatalogSnapshot } from "./movie-store.js";

const rankingContainer = document.getElementById("moviesRanking");
let allMovies = [];

const STAR_SVG_PATH =
  "M12 2.5l2.93 5.94 6.56.95-4.74 4.62 1.12 6.53L12 17.46l-5.87 3.08 1.12-6.53L2.51 9.39l6.56-.95L12 2.5z";

function createStarIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", STAR_SVG_PATH);
  svg.appendChild(path);
  return svg;
}

export async function loadRankings({ forceRefresh = false } = {}) {
  if (!rankingContainer) return;

  try {
    const catalog = await getMoviesCatalogSnapshot({ forceRefresh });
    allMovies = catalog
      .filter((movie) => movie.ratingCount > 0 && movie.avgRating !== null)
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount);

    displayRankings();
  } catch (error) {
    console.error("Error loading rankings:", error);
    rankingContainer.innerHTML =
      '<div class="empty-state">Unable to load rankings right now.</div>';
  }
}

function displayRankings() {
  if (!rankingContainer) return;
  rankingContainer.innerHTML = "";

  if (allMovies.length === 0) {
    rankingContainer.innerHTML =
      '<div class="empty-state">No rated movies yet. Submit a movie entry to get started.</div>';
    return;
  }

  allMovies.forEach((movie, index) => {
    const rankRow = document.createElement("button");
    rankRow.type = "button";
    rankRow.className = "rank-row";
    rankRow.dataset.movieid = movie.id;

    const posEl = document.createElement("span");
    posEl.className = "rank-position";
    posEl.textContent = String(index + 1).padStart(2, "0");

    const infoEl = document.createElement("div");
    infoEl.className = "rank-info";

    const titleEl = document.createElement("div");
    titleEl.className = "rank-title";
    titleEl.textContent = movie.title;

    const inlineMeta = document.createElement("div");
    inlineMeta.className = "movie-inline-meta";

    const yearSpan = document.createElement("span");
    yearSpan.className = "tabular-nums";
    yearSpan.textContent = String(movie.year || "N/A");

    const dotSpan = document.createElement("span");
    dotSpan.className = "meta-dot";
    dotSpan.setAttribute("aria-hidden", "true");
    dotSpan.textContent = "·";

    const genreSpan = document.createElement("span");
    genreSpan.textContent = movie.genre;

    inlineMeta.append(yearSpan, dotSpan, genreSpan);
    infoEl.append(titleEl, inlineMeta);

    const excerptEl = document.createElement("div");
    excerptEl.className = "rank-excerpt";
    const excerptText = document.createElement("p");
    if (movie.submissionComment?.text) {
      excerptText.className = "rank-excerpt-text";
      excerptText.textContent = `"${movie.submissionComment.text}"`;
    } else {
      excerptText.className = "rank-excerpt-text rank-excerpt-muted";
      excerptText.textContent = "No initial review comment";
    }
    excerptEl.appendChild(excerptText);

    const scoreWrap = document.createElement("div");
    scoreWrap.className = "rank-score-wrap";

    const ratingPill = document.createElement("span");
    ratingPill.className = "rating-pill";
    const scoreText = document.createElement("span");
    scoreText.textContent = movie.avgRating.toFixed(1);
    ratingPill.append(createStarIcon(), scoreText);

    const countSpan = document.createElement("span");
    countSpan.className = "rank-count";
    countSpan.textContent = `(${movie.ratingCount})`;

    scoreWrap.append(ratingPill, countSpan);

    rankRow.append(posEl, infoEl, excerptEl, scoreWrap);
    rankRow.addEventListener("click", () => {
      showMovieDetails(movie.id, movie);
    });

    rankingContainer.appendChild(rankRow);
  });
}

export function getRankedMovies() {
  return [...allMovies];
}

document.addEventListener("DOMContentLoaded", () => loadRankings());
