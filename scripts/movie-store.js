import { db, collection, getDocs } from "./firebase-config.js";
import { GENRES } from "./genres.js";

const STORAGE_CACHE_KEY = "movieTruth_catalogSnapshot_v1";
const CACHE_TTL_MS = 45000;

let memoryCatalog = null;
let memoryFetchedAt = 0;
let inFlightPromise = null;

function readSessionCache() {
  try {
    const raw = sessionStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - (parsed.fetchedAt || 0) > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeSessionCache(items) {
  try {
    sessionStorage.setItem(
      STORAGE_CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), items })
    );
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function invalidateCatalogCache() {
  memoryCatalog = null;
  memoryFetchedAt = 0;
  try {
    sessionStorage.removeItem(STORAGE_CACHE_KEY);
  } catch {
    // Ignore storage access errors
  }
}

async function fetchAndAggregateCatalog() {
  const [moviesSnapshot, ratingsSnapshot] = await Promise.all([
    getDocs(collection(db, "movies")),
    getDocs(collection(db, "ratings")),
  ]);

  const ratingsByMovie = new Map();

  ratingsSnapshot.forEach((docSnap) => {
    const ratingDoc = docSnap.data();
    const movieId = ratingDoc.movieId;
    if (!movieId) return;

    if (!ratingsByMovie.has(movieId)) {
      ratingsByMovie.set(movieId, {
        total: 0,
        count: 0,
        distribution: [0, 0, 0, 0, 0],
        submissionComment: null,
      });
    }

    const entry = ratingsByMovie.get(movieId);
    const score = ratingDoc.rating;
    if (typeof score === "number" && score >= 1 && score <= 5) {
      entry.total += score;
      entry.count++;
      entry.distribution[score - 1]++;
    }

    if (
      ratingDoc.isSubmission &&
      !entry.submissionComment &&
      typeof ratingDoc.comment === "string"
    ) {
      const trimmed = ratingDoc.comment.trim();
      if (trimmed && trimmed !== "No comment provided") {
        entry.submissionComment = {
          text: trimmed,
          rating: typeof score === "number" ? score : null,
        };
      }
    }
  });

  const catalog = [];

  moviesSnapshot.forEach((docSnap) => {
    const movie = docSnap.data();
    if (!GENRES.includes(movie.genre)) return;

    const stats = ratingsByMovie.get(docSnap.id);
    const ratingCount = stats?.count || 0;
    const avgRating = ratingCount > 0 ? stats.total / ratingCount : null;

    const createdMs = movie.createdAt?.toMillis
      ? movie.createdAt.toMillis()
      : 0;

    catalog.push({
      id: docSnap.id,
      title: movie.title || "Untitled",
      year: movie.year || null,
      genre: movie.genre,
      createdMs,
      avgRating,
      ratingCount,
      ratingDistribution: stats?.distribution || [0, 0, 0, 0, 0],
      submissionComment: stats?.submissionComment || null,
    });
  });

  memoryCatalog = catalog;
  memoryFetchedAt = Date.now();
  writeSessionCache(catalog);

  return [...catalog];
}

export async function getMoviesCatalogSnapshot({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    if (memoryCatalog && Date.now() - memoryFetchedAt <= CACHE_TTL_MS) {
      return [...memoryCatalog];
    }
    const stored = readSessionCache();
    if (stored) {
      memoryCatalog = stored;
      memoryFetchedAt = Date.now();
      return [...stored];
    }
    if (inFlightPromise) {
      const result = await inFlightPromise;
      return [...result];
    }
  }

  inFlightPromise = fetchAndAggregateCatalog().finally(() => {
    inFlightPromise = null;
  });

  const result = await inFlightPromise;
  return [...result];
}

