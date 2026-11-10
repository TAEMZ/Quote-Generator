import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const QUOTES_CACHE_KEY = "movieTruth_quotesCache_v1";
const QUOTES_CACHE_TTL_MS = 60000;

const quoteEl = document.querySelector(".quote-text-display");
const personEl = document.querySelector(".quote-person-name");
const movieInfoEl = document.querySelector(".quote-movie-meta");
const minuteBadge = document.getElementById("quoteMinuteBadge");
const imageEl = document.querySelector(".quote-media-img");
const imageFrame = document.getElementById("quoteMediaFrame");
const illustrationFallback = document.getElementById("quoteIllustrationFallback");
const newBtn = document.getElementById("newQuoteBtn");
const newBtnLabel = newBtn?.querySelector("span");

const toggleFormBtn = document.getElementById("toggleFormBtn");
const toggleBtnLabel = toggleFormBtn?.querySelector("span");
const navAddQuoteBtn = document.getElementById("navAddQuoteBtn");
const nextQuoteCards = document.querySelectorAll('[data-feature-action="next-quote"]');
const cancelQuoteFormBtn = document.getElementById("cancelQuoteFormBtn");
const quoteFormPanel = document.getElementById("quoteFormPanel");
const quoteForm = document.getElementById("quoteForm");
const submitBtn = document.getElementById("submitQuote");
const formError = document.getElementById("formError");

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("quoteImagePreview");
const fileNameLabel = document.getElementById("fileNameLabel");

const quotesCol = collection(db, "quotes");
let cachedQuotes = null;
let cachedQuotesAt = 0;
let lastQuoteText = "";

function readQuotesCache() {
  try {
    const raw = sessionStorage.getItem(QUOTES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - (parsed.fetchedAt || 0) > QUOTES_CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeQuotesCache(items) {
  try {
    sessionStorage.setItem(
      QUOTES_CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), items })
    );
  } catch {
    // Ignore storage quota errors
  }
}

function invalidateQuotesCache() {
  cachedQuotes = null;
  cachedQuotesAt = 0;
  try {
    sessionStorage.removeItem(QUOTES_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

async function loadQuotesList({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    if (cachedQuotes && Date.now() - cachedQuotesAt <= QUOTES_CACHE_TTL_MS) {
      return cachedQuotes;
    }
    const stored = readQuotesCache();
    if (stored) {
      cachedQuotes = stored;
      cachedQuotesAt = Date.now();
      return cachedQuotes;
    }
  }

  const snapshot = await getDocs(quotesCol);
  const items = snapshot.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      quote: d.quote || "",
      person: d.person || "Unknown",
      movie: d.movie || "",
      minute: d.minute ?? "",
      imageUrl: d.imageUrl || "",
    };
  });

  cachedQuotes = items;
  cachedQuotesAt = Date.now();
  writeQuotesCache(items);
  return cachedQuotes;
}

function setQuoteNotice(message, type) {
  if (!formError) return;
  formError.textContent = message;
  formError.className = type ? `form-notice ${type}` : "form-notice";
}

function showIllustrationFallback() {
  imageFrame?.classList.remove("has-image");
  if (illustrationFallback) {
    illustrationFallback.hidden = false;
  }
}

function showLoadedMedia() {
  imageFrame?.classList.add("has-image");
  if (illustrationFallback) {
    illustrationFallback.hidden = true;
  }
}

function setFormPanelOpen(isOpen, shouldScroll = false) {
  if (!quoteFormPanel) return;
  quoteFormPanel.hidden = !isOpen;
  if (toggleFormBtn) {
    toggleFormBtn.setAttribute("aria-expanded", String(isOpen));
  }
  if (toggleBtnLabel) {
    toggleBtnLabel.textContent = isOpen ? "Close Form" : "Submit Quote";
  }
  if (isOpen) {
    if (shouldScroll) {
      quoteFormPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    document.getElementById("quoteInput")?.focus();
  }
}

imageEl?.addEventListener("load", () => {
  if (imageEl.getAttribute("src")) {
    showLoadedMedia();
  }
});

imageEl?.addEventListener("error", showIllustrationFallback);

function renderQuote(q) {
  lastQuoteText = q.quote || "";

  if (quoteEl) quoteEl.textContent = `"${q.quote || ""}"`;
  if (personEl) personEl.textContent = q.person || "Unknown";
  if (movieInfoEl) movieInfoEl.textContent = q.movie || "";

  const minuteVal =
    q.minute !== undefined && q.minute !== null ? String(q.minute).trim() : "";
  if (minuteBadge) {
    if (minuteVal) {
      minuteBadge.textContent = `${minuteVal} min`;
      minuteBadge.hidden = false;
    } else {
      minuteBadge.textContent = "";
      minuteBadge.hidden = true;
    }
  }

  if (q.imageUrl && imageEl && imageFrame) {
    if (imageEl.getAttribute("src") !== q.imageUrl) {
      showIllustrationFallback();
      imageEl.alt = `${q.movie || "Movie"} scene featuring ${q.person || "character"}`;
      imageEl.src = q.imageUrl;
      if (imageEl.complete && imageEl.naturalWidth > 0) {
        showLoadedMedia();
      }
    } else {
      showLoadedMedia();
    }
  } else {
    if (imageEl) imageEl.removeAttribute("src");
    showIllustrationFallback();
  }
}

// Get Random Quote
async function getRandomQuote({ forceRefresh = false } = {}) {
  const needsNetwork =
    forceRefresh || !cachedQuotes || Date.now() - cachedQuotesAt > QUOTES_CACHE_TTL_MS;

  if (needsNetwork && newBtn) newBtn.disabled = true;
  if (needsNetwork && newBtnLabel) newBtnLabel.textContent = "Loading...";

  try {
    if (needsNetwork && !cachedQuotes) {
      if (quoteEl) quoteEl.textContent = "Loading quote...";
      if (personEl) personEl.textContent = "";
      if (movieInfoEl) movieInfoEl.textContent = "";
      if (minuteBadge) {
        minuteBadge.textContent = "";
        minuteBadge.hidden = true;
      }
      showIllustrationFallback();
    }

    const quotes = await loadQuotesList({ forceRefresh });

    if (!quotes.length) {
      if (quoteEl) quoteEl.textContent = "No quotes in the archive yet.";
      lastQuoteText = "";
      showIllustrationFallback();
      return;
    }

    let pool = quotes;
    if (quotes.length > 1 && lastQuoteText) {
      const filtered = quotes.filter((item) => item.quote !== lastQuoteText);
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    renderQuote(pool[randomIndex]);
  } catch (err) {
    if (quoteEl) quoteEl.textContent = "Failed to load quote. Please try again.";
    console.error(err);
  } finally {
    if (newBtn) newBtn.disabled = false;
    if (newBtnLabel) newBtnLabel.textContent = "Next Quote";
  }
}

newBtn?.addEventListener("click", () => getRandomQuote());

nextQuoteCards.forEach((card) => {
  card.addEventListener("click", () => {
    document
      .getElementById("quotes-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    getRandomQuote();
  });
});

// Toggle Form
toggleFormBtn?.addEventListener("click", () => {
  setFormPanelOpen(Boolean(quoteFormPanel?.hidden));
});

navAddQuoteBtn?.addEventListener("click", () => {
  setFormPanelOpen(true, true);
});

cancelQuoteFormBtn?.addEventListener("click", () => {
  quoteForm?.reset();
  if (imagePreview) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
  if (fileNameLabel) fileNameLabel.textContent = "Choose scene screenshot";
  setQuoteNotice("", "");
  setFormPanelOpen(false);
});

// Live Image Preview
imageInput?.addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    if (fileNameLabel) fileNameLabel.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (imagePreview) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      }
    };
    reader.readAsDataURL(file);
  } else {
    if (fileNameLabel) fileNameLabel.textContent = "Choose scene screenshot";
    if (imagePreview) {
      imagePreview.src = "";
      imagePreview.style.display = "none";
    }
  }
});

// Upload Image to Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "cloudinary");
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/da7hlicdz/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );
  if (!res.ok) {
    throw new Error(`Image upload failed (${res.status})`);
  }
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error("Upload response did not include an image URL");
  }
  return data.secure_url;
}

// Submit Form
quoteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setQuoteNotice("", "");

  const quote = document.getElementById("quoteInput").value.trim();
  const person = document.getElementById("personInput").value.trim();
  const movie = document.getElementById("movieInput").value.trim();
  const minute = document.getElementById("minuteInput").value.trim();
  const imageFile = imageInput?.files[0];

  if (!quote || !person || !movie || !minute || !imageFile) {
    setQuoteNotice("Please fill out all fields and attach a scene image.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  try {
    const imageUrl = await uploadToCloudinary(imageFile);
    await addDoc(quotesCol, {
      quote,
      person,
      movie,
      minute,
      imageUrl,
      createdAt: new Date(),
    });

    invalidateQuotesCache();
    setQuoteNotice("Quote added to the archive.", "success");
    quoteForm.reset();
    if (imagePreview) {
      imagePreview.src = "";
      imagePreview.style.display = "none";
    }
    if (fileNameLabel) fileNameLabel.textContent = "Choose scene screenshot";

    await getRandomQuote({ forceRefresh: true });
    setTimeout(() => {
      setQuoteNotice("", "");
      setFormPanelOpen(false);
    }, 1500);
  } catch (err) {
    setQuoteNotice("Upload failed. Please check your image and try again.", "error");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Quote";
  }
});

// Load initial quote
getRandomQuote();
