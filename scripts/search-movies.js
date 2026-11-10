import { GENRES } from "./genres.js";
import { showMovieDetails } from "./movie-details.js";
import { getMoviesCatalogSnapshot } from "./movie-store.js";

const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const sortFilter = document.getElementById("sortFilter");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const catalogIndexStatus = document.getElementById("catalogIndexStatus");
const catalogPagination = document.getElementById("catalogPagination");
const catalogStatsSummary = document.getElementById("catalogStatsSummary");

const ITEMS_PER_PAGE = 4;
let currentPage = 1;

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

function createArrowIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", "M5 12h14M13 6l6 6-6 6");
  svg.appendChild(line);
  return svg;
}

function formatIndexNumber(num) {
  return `#${String(num).padStart(2, "0")}`;
}

if (genreFilter) {
  GENRES.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });
}

function resetAndRender() {
  currentPage = 1;
  searchMovies();
}

searchBtn?.addEventListener("click", resetAndRender);
genreFilter?.addEventListener("change", resetAndRender);
sortFilter?.addEventListener("change", resetAndRender);
searchInput?.addEventListener("input", resetAndRender);
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    resetAndRender();
  }
});

function renderCatalogSkeletons() {
  if (!searchResults) return;
  searchResults.innerHTML = "";
  for (let i = 0; i < ITEMS_PER_PAGE; i++) {
    const skel = document.createElement("div");
    skel.className = "skeleton-card";
    searchResults.appendChild(skel);
  }
}

function renderCatalogEmpty(message) {
  if (!searchResults) return;
  searchResults.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state catalog-full-span";
  empty.textContent = message;
  searchResults.appendChild(empty);
  if (catalogIndexStatus) catalogIndexStatus.textContent = "0 matching films";
  if (catalogPagination) catalogPagination.innerHTML = "";
}

function sortMatches(matches, sortMode) {
  const list = [...matches];
  if (sortMode === "newest") {
    list.sort(
      (a, b) =>
        (b.year || 0) - (a.year || 0) ||
        (b.avgRating || 0) - (a.avgRating || 0) ||
        a.title.localeCompare(b.title)
    );
  } else if (sortMode === "title") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    list.sort(
      (a, b) =>
        (b.avgRating ?? -1) - (a.avgRating ?? -1) ||
        b.ratingCount - a.ratingCount ||
        a.title.localeCompare(b.title)
    );
  }
  return list;
}

function renderPaginationControls(totalPages) {
  if (!catalogPagination) return;
  catalogPagination.innerHTML = "";

  if (totalPages <= 1) {
    const single = document.createElement("span");
    single.className = "page-indicator";
    single.textContent = "Page 1 of 1";
    catalogPagination.appendChild(single);
    return;
  }

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "page-btn";
  prevBtn.textContent = "Prev";
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      searchMovies();
    }
  });
  catalogPagination.appendChild(prevBtn);

  for (let p = 1; p <= totalPages; p++) {
    const pageBtn = document.createElement("button");
    pageBtn.type = "button";
    pageBtn.className = p === currentPage ? "page-btn active" : "page-btn";
    pageBtn.textContent = String(p);
    pageBtn.setAttribute("aria-label", `Page ${p}`);
    if (p === currentPage) {
      pageBtn.setAttribute("aria-current", "page");
    }
    pageBtn.addEventListener("click", () => {
      if (currentPage !== p) {
        currentPage = p;
        searchMovies();
      }
    });
    catalogPagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "page-btn";
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      searchMovies();
    }
  });
  catalogPagination.appendChild(nextBtn);
}

export async function searchMovies({ forceRefresh = false } = {}) {
  if (!searchResults) return;

  const searchTerm = (searchInput?.value || "").trim().toLowerCase();
  const selectedGenre = genreFilter?.value || "";
  const sortMode = sortFilter?.value || "highest";

  if (forceRefresh) {
    renderCatalogSkeletons();
  }

  try {
    const catalog = await getMoviesCatalogSnapshot({ forceRefresh });

    if (catalogStatsSummary) {
      const totalVotes = catalog.reduce((sum, item) => sum + item.ratingCount, 0);
      catalogStatsSummary.textContent = `${catalog.length} films | ${totalVotes} ratings logged`;
    }

    const filtered = catalog.filter((movie) => {
      if (selectedGenre && movie.genre !== selectedGenre) return false;
      if (searchTerm && !movie.title.toLowerCase().includes(searchTerm)) return false;
      return true;
    });

    if (filtered.length === 0) {
      renderCatalogEmpty(
        selectedGenre || searchTerm
          ? "No matching films found. Try another title or genre."
          : "No films in the archive yet."
      );
      return;
    }

    const sorted = sortMatches(filtered, sortMode);
    const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, sorted.length);
    const pageItems = sorted.slice(startIdx, endIdx);

    if (catalogIndexStatus) {
      catalogIndexStatus.textContent = `Showing ${formatIndexNumber(
        startIdx + 1
      )} to ${formatIndexNumber(endIdx)} of ${sorted.length} ${
        sorted.length === 1 ? "film" : "films"
      }`;
    }

    searchResults.innerHTML = "";

    pageItems.forEach((movie, idx) => {
      const globalIndex = startIdx + idx + 1;

      const card = document.createElement("button");
      card.type = "button";
      card.className = "movie-card";
      card.dataset.id = movie.id;

      const topRow = document.createElement("div");
      topRow.className = "movie-card-top";

      const indexPill = document.createElement("span");
      indexPill.className = "catalog-index-pill";
      indexPill.textContent = formatIndexNumber(globalIndex);

      const scoreGroup = document.createElement("div");
      scoreGroup.className = "movie-score-group";

      const ratingPill = document.createElement("span");
      if (movie.avgRating !== null) {
        ratingPill.className = "rating-pill";
        const scoreText = document.createElement("span");
        scoreText.textContent = movie.avgRating.toFixed(1);
        ratingPill.append(createStarIcon(), scoreText);
      } else {
        ratingPill.className = "rating-pill is-unrated";
        ratingPill.textContent = "Unrated";
      }

      scoreGroup.appendChild(ratingPill);

      if (movie.ratingCount > 0) {
        const votesEl = document.createElement("span");
        votesEl.className = "movie-vote-count";
        votesEl.textContent = `(${movie.ratingCount})`;
        scoreGroup.appendChild(votesEl);
      }

      topRow.append(indexPill, scoreGroup);

      const bodyWrap = document.createElement("div");
      bodyWrap.className = "movie-card-body";

      const titleEl = document.createElement("h3");
      titleEl.className = "movie-card-title";
      titleEl.textContent = movie.title || "Untitled";

      const excerptEl = document.createElement("p");
      if (movie.submissionComment?.text) {
        excerptEl.className = "movie-card-excerpt";
        excerptEl.textContent = `"${movie.submissionComment.text}"`;
      } else {
        excerptEl.className = "movie-card-excerpt is-muted";
        excerptEl.textContent = "Open breakdown to inspect community votes and reviews.";
      }

      bodyWrap.append(titleEl, excerptEl);

      const scoreMeter = document.createElement("div");
      scoreMeter.className = "movie-score-meter";
      scoreMeter.setAttribute("aria-hidden", "true");
      const scoreMeterFill = document.createElement("span");
      scoreMeterFill.className = "movie-score-meter-fill";
      const scorePct =
        movie.avgRating !== null
          ? Math.max(0, Math.min(100, (movie.avgRating / 5) * 100))
          : 0;
      scoreMeterFill.style.width = `${scorePct.toFixed(0)}%`;
      scoreMeter.appendChild(scoreMeterFill);

      const footerEl = document.createElement("div");
      footerEl.className = "movie-card-footer";

      const inlineMeta = document.createElement("span");
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

      const inspectTag = document.createElement("span");
      inspectTag.className = "movie-card-action";
      const inspectLabel = document.createElement("span");
      inspectLabel.textContent = "Inspect";
      inspectTag.append(inspectLabel, createArrowIcon());

      footerEl.append(inlineMeta, inspectTag);
      card.append(topRow, bodyWrap, scoreMeter, footerEl);

      card.addEventListener("click", () =>
        showMovieDetails(movie.id, {
          ...movie,
        })
      );

      searchResults.appendChild(card);
    });

    renderPaginationControls(totalPages);
  } catch (error) {
    console.error("Search error:", error);
    renderCatalogEmpty("Failed to load catalog. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => searchMovies());
