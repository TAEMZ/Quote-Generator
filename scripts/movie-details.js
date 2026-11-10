import {
  db,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  getViewerSessionId,
} from "./firebase-config.js";
import { invalidateCatalogCache } from "./movie-store.js";

const modal = document.getElementById("movieDetailsModal");
const closeBtn = document.querySelector(".modal-close-btn");
const commentForm = document.getElementById("commentForm");
const commentTextarea = document.getElementById("commentTextarea");
const commentRatingHint = document.getElementById("commentRatingHint");
const postCommentBtn = document.getElementById("postCommentBtn");
const commentFormMessage = document.getElementById("commentFormMessage");
const commentStars = commentForm ? commentForm.querySelectorAll(".star-btn") : [];

const STAR_SVG_PATH =
  "M12 2.5l2.93 5.94 6.56.95-4.74 4.62 1.12 6.53L12 17.46l-5.87 3.08 1.12-6.53L2.51 9.39l6.56-.95L12 2.5z";

const AVATAR_BACKGROUNDS = [
  "efe7d6",
  "fae4de",
  "f3e0be",
  "e2dced",
  "d8ece7",
  "f5d9cf",
];

let currentMovieId = null;
let selectedCommentRating = 0;

function createStarIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", STAR_SVG_PATH);
  svg.appendChild(path);
  return svg;
}

function setRatingPill(el, avgRating) {
  el.innerHTML = "";
  if (typeof avgRating === "number" && !Number.isNaN(avgRating)) {
    el.className = "rating-pill";
    const span = document.createElement("span");
    span.textContent = avgRating.toFixed(1);
    el.append(createStarIcon(), span);
  } else {
    el.className = "rating-pill is-unrated";
    el.textContent = "Unrated";
  }
}

function openModal() {
  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
}

function closeModal() {
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
}

function getCommentTime(comment) {
  return comment.createdAt?.toMillis ? comment.createdAt.toMillis() : 0;
}

function buildCommentIdentityMap(rawComments, movieId, currentSessionId) {
  const ordered = [...rawComments].sort((a, b) => {
    const timeDiff = getCommentTime(a) - getCommentTime(b);
    return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
  });

  const identities = new Map();
  const usedAvatarSeeds = new Set();
  let otherViewerCounter = 0;

  ordered.forEach((comment) => {
    const personKey = comment.sessionId || comment.id;
    if (identities.has(personKey)) return;

    const isSelf = Boolean(comment.sessionId && comment.sessionId === currentSessionId);
    const label = isSelf ? "You" : `Viewer ${++otherViewerCounter}`;
    const fallbackInitial = isSelf ? "Y" : `V${otherViewerCounter}`;
    const bgColor = AVATAR_BACKGROUNDS[identities.size % AVATAR_BACKGROUNDS.length];

    let attempt = 0;
    let avatarSeed = `${movieId}-${personKey}`;
    while (usedAvatarSeeds.has(avatarSeed)) {
      attempt++;
      avatarSeed = `${movieId}-${personKey}-${attempt}`;
    }
    usedAvatarSeeds.add(avatarSeed);

    const avatarUrl =
      `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(avatarSeed)}` +
      `&backgroundColor=${bgColor}&radius=50`;

    identities.set(personKey, {
      personKey,
      isSelf,
      label,
      avatarUrl,
      fallbackInitial,
    });
  });

  return identities;
}

export async function showMovieDetails(movieId, movieData) {
  currentMovieId = movieId;

  const title = document.getElementById("movieDetailTitle");
  const year = document.getElementById("movieDetailYear");
  const genre = document.getElementById("movieDetailGenre");
  const rating = document.getElementById("movieDetailRating");
  const commentsContainer = document.getElementById("movieComments");
  const ratingStats = document.getElementById("ratingStats");

  title.textContent = movieData.title || "Untitled";
  year.textContent = String(movieData.year || "N/A");
  genre.textContent = movieData.genre || "Unknown";
  setRatingPill(rating, movieData.avgRating);

  commentForm.dataset.movieid = movieId;
  clearCommentNotice();

  ratingStats.innerHTML = '<div class="skeleton-row"></div>';
  commentsContainer.innerHTML = '<div class="skeleton-row"></div>';

  openModal();

  await Promise.all([
    loadRatingStats(movieId, ratingStats, rating),
    loadComments(movieId, commentsContainer),
  ]);
}

async function loadRatingStats(movieId, container, headerRatingEl) {
  try {
    const q = query(collection(db, "ratings"), where("movieId", "==", movieId));
    const snapshot = await getDocs(q);

    const ratingCounts = [0, 0, 0, 0, 0];
    let totalRatings = 0;
    let ratingSum = 0;

    snapshot.forEach((docSnap) => {
      const score = docSnap.data().rating;
      if (typeof score === "number" && score >= 1 && score <= 5) {
        ratingCounts[score - 1]++;
        totalRatings++;
        ratingSum += score;
      }
    });

    if (headerRatingEl) {
      setRatingPill(headerRatingEl, totalRatings > 0 ? ratingSum / totalRatings : null);
    }

    container.innerHTML = "";

    const heading = document.createElement("h3");
    heading.className = "modal-section-title";

    const headingTitle = document.createElement("span");
    headingTitle.textContent = "Rating Distribution";

    const headingCount = document.createElement("span");
    headingCount.className = "modal-section-sub";
    headingCount.textContent = `${totalRatings} ${totalRatings === 1 ? "rating" : "ratings"}`;

    heading.append(headingTitle, headingCount);

    const distWrap = document.createElement("div");
    distWrap.className = "rating-distribution";

    for (let starVal = 5; starVal >= 1; starVal--) {
      const count = ratingCounts[starVal - 1];
      const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

      const row = document.createElement("div");
      row.className = "rating-bar-row";

      const label = document.createElement("span");
      label.className = "rating-bar-label";
      const starNum = document.createElement("span");
      starNum.textContent = String(starVal);
      label.append(starNum, createStarIcon());

      const track = document.createElement("div");
      track.className = "rating-bar-track";
      const fill = document.createElement("div");
      fill.className = "rating-bar-fill";
      fill.style.width = `${pct}%`;
      track.appendChild(fill);

      const countEl = document.createElement("span");
      countEl.className = "rating-bar-count";
      countEl.textContent = String(count);

      row.append(label, track, countEl);
      distWrap.appendChild(row);
    }

    container.append(heading, distWrap);
  } catch (error) {
    console.error("Error loading rating stats:", error);
    container.innerHTML = '<div class="empty-state">Unable to load rating breakdown.</div>';
  }
}

async function loadComments(movieId, container) {
  try {
    const q = query(collection(db, "comments"), where("movieId", "==", movieId));
    const querySnapshot = await getDocs(q);

    container.innerHTML = "";

    const commentMap = new Map();
    const rawComments = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const comment = {
        id: docSnap.id,
        ...data,
        replies: [],
      };
      commentMap.set(docSnap.id, comment);
      rawComments.push(comment);
    });

    const currentSessionId = getViewerSessionId();
    const identityMap = buildCommentIdentityMap(rawComments, movieId, currentSessionId);

    const topLevel = [];
    rawComments.forEach((comment) => {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).replies.push(comment);
      } else {
        topLevel.push(comment);
      }
    });

    topLevel.sort((a, b) => getCommentTime(b) - getCommentTime(a));
    rawComments.forEach((c) => {
      c.replies.sort((a, b) => getCommentTime(a) - getCommentTime(b));
    });

    if (topLevel.length === 0) {
      container.innerHTML = '<div class="empty-state">No comments yet. Start the discussion above.</div>';
      return;
    }

    topLevel.forEach((comment) => {
      container.appendChild(renderComment(comment, identityMap, currentSessionId));
    });
  } catch (error) {
    console.error("Error loading comments:", error);
    container.innerHTML = '<div class="empty-state">Failed to load comments.</div>';
  }
}

function renderComment(comment, identityMap, currentSessionId) {
  const commentEl = document.createElement("article");
  commentEl.className = "comment-item";

  const personKey = comment.sessionId || comment.id;
  const identity = identityMap.get(personKey) || {
    isSelf: Boolean(comment.sessionId && comment.sessionId === currentSessionId),
    label: "Viewer",
    avatarUrl: "",
    fallbackInitial: "V",
  };

  const date = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();

  const header = document.createElement("div");
  header.className = "comment-item-header";

  const authorGroup = document.createElement("div");
  authorGroup.className = "comment-author-group";

  const avatarFrame = document.createElement("span");
  avatarFrame.className = identity.isSelf
    ? "comment-avatar-frame is-self"
    : "comment-avatar-frame";

  if (identity.avatarUrl) {
    const avatarImg = document.createElement("img");
    avatarImg.className = "comment-avatar-img";
    avatarImg.src = identity.avatarUrl;
    avatarImg.alt = `${identity.label} avatar`;
    avatarImg.loading = "lazy";
    avatarImg.addEventListener("error", () => {
      avatarFrame.innerHTML = "";
      const fallback = document.createElement("span");
      fallback.className = "comment-avatar-fallback";
      fallback.textContent = identity.fallbackInitial;
      avatarFrame.appendChild(fallback);
    });
    avatarFrame.appendChild(avatarImg);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "comment-avatar-fallback";
    fallback.textContent = identity.fallbackInitial;
    avatarFrame.appendChild(fallback);
  }

  const authorMeta = document.createElement("div");
  authorMeta.className = "comment-author-meta";

  const authorName = document.createElement("span");
  authorName.className = identity.isSelf
    ? "comment-author-name is-self"
    : "comment-author-name";
  authorName.textContent = identity.label;

  const timestamp = document.createElement("span");
  timestamp.className = "comment-timestamp";
  timestamp.textContent = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  authorMeta.append(authorName, timestamp);
  authorGroup.append(avatarFrame, authorMeta);

  const badges = document.createElement("div");
  badges.className = "comment-badges";

  if (comment.isSubmission) {
    const subBadge = document.createElement("span");
    subBadge.className = "meta-badge";
    subBadge.textContent = "Original Review";
    badges.appendChild(subBadge);
  }

  if (typeof comment.rating === "number" && comment.rating >= 1 && comment.rating <= 5) {
    const pill = document.createElement("span");
    pill.className = "rating-pill";
    const scoreText = document.createElement("span");
    scoreText.textContent = String(comment.rating);
    pill.append(createStarIcon(), scoreText);
    badges.appendChild(pill);
  }

  header.append(authorGroup, badges);

  const body = document.createElement("p");
  body.className = "comment-body";
  body.textContent = comment.text || "";

  commentEl.append(header, body);

  if (!identity.isSelf) {
    const actions = document.createElement("div");
    actions.className = "comment-actions";

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "btn btn-ghost";
    replyBtn.textContent = "Reply";
    actions.appendChild(replyBtn);

    const replyForm = document.createElement("form");
    replyForm.className = "reply-form";
    replyForm.hidden = true;
    replyForm.noValidate = true;

    const replyTextarea = document.createElement("textarea");
    replyTextarea.className = "textarea-control";
    replyTextarea.placeholder = "Write your reply...";
    replyTextarea.required = true;

    const replyNotice = document.createElement("div");
    replyNotice.className = "form-notice";

    const replyActions = document.createElement("div");
    replyActions.className = "reply-form-actions";

    const cancelReplyBtn = document.createElement("button");
    cancelReplyBtn.type = "button";
    cancelReplyBtn.className = "btn btn-secondary";
    cancelReplyBtn.textContent = "Cancel";

    const submitReplyBtn = document.createElement("button");
    submitReplyBtn.type = "submit";
    submitReplyBtn.className = "btn btn-primary";
    submitReplyBtn.textContent = "Post Reply";

    replyActions.append(cancelReplyBtn, submitReplyBtn);
    replyForm.append(replyTextarea, replyNotice, replyActions);

    replyBtn.addEventListener("click", () => {
      replyForm.hidden = !replyForm.hidden;
      if (!replyForm.hidden) {
        replyTextarea.focus();
      }
    });

    cancelReplyBtn.addEventListener("click", () => {
      replyForm.hidden = true;
      replyTextarea.value = "";
      replyNotice.className = "form-notice";
      replyNotice.textContent = "";
    });

    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const activeViewerId = getViewerSessionId();
      if (comment.sessionId && comment.sessionId === activeViewerId) {
        replyNotice.textContent = "You cannot reply to your own comment.";
        replyNotice.className = "form-notice error";
        return;
      }

      const replyText = replyTextarea.value.trim();

      if (!replyText) {
        replyNotice.textContent = "Please enter a reply before posting.";
        replyNotice.className = "form-notice error";
        return;
      }

      submitReplyBtn.disabled = true;
      submitReplyBtn.textContent = "Posting...";

      try {
        await addDoc(collection(db, "comments"), {
          movieId: comment.movieId || currentMovieId,
          parentId: comment.id,
          text: replyText,
          createdAt: serverTimestamp(),
          sessionId: activeViewerId,
          isReply: true,
          isSubmission: false,
        });

        await loadComments(
          comment.movieId || currentMovieId,
          document.getElementById("movieComments")
        );
      } catch (error) {
        console.error("Error adding reply:", error);
        replyNotice.textContent = "Failed to post reply. Please try again.";
        replyNotice.className = "form-notice error";
      } finally {
        submitReplyBtn.disabled = false;
        submitReplyBtn.textContent = "Post Reply";
      }
    });

    commentEl.append(actions, replyForm);
  }

  if (comment.replies.length > 0) {
    const repliesContainer = document.createElement("div");
    repliesContainer.className = "comment-replies";
    comment.replies.forEach((reply) => {
      repliesContainer.appendChild(renderComment(reply, identityMap, currentSessionId));
    });
    commentEl.appendChild(repliesContainer);
  }

  return commentEl;
}

function showCommentNotice(message, type) {
  if (!commentFormMessage) return;
  commentFormMessage.textContent = message;
  commentFormMessage.className = `form-notice ${type}`;
}

function clearCommentNotice() {
  if (!commentFormMessage) return;
  commentFormMessage.textContent = "";
  commentFormMessage.className = "form-notice";
}

function updateCommentStarDisplay(rating, isHover = false) {
  commentStars.forEach((star, index) => {
    if (isHover) {
      star.classList.toggle("is-hovered", index < rating);
    } else {
      star.classList.remove("is-hovered");
      star.classList.toggle("active", index < rating);
    }
  });
  if (!isHover && commentRatingHint) {
    commentRatingHint.textContent = rating > 0 ? `${rating} / 5` : "";
  }
}

commentStars.forEach((star) => {
  const value = parseInt(star.dataset.value, 10);

  star.addEventListener("mouseenter", () => updateCommentStarDisplay(value, true));
  star.addEventListener("mouseleave", () => updateCommentStarDisplay(0, true));
  star.addEventListener("click", () => {
    selectedCommentRating = selectedCommentRating === value ? 0 : value;
    updateCommentStarDisplay(selectedCommentRating, false);
  });
});

// Main comment form submission
commentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearCommentNotice();

  const movieId = commentForm.dataset.movieid;
  const text = commentTextarea.value.trim();

  if (!text) {
    showCommentNotice("Please enter a comment before posting.", "error");
    return;
  }

  postCommentBtn.disabled = true;
  postCommentBtn.textContent = "Posting...";

  const activeViewerId = getViewerSessionId();

  try {
    const writes = [
      addDoc(collection(db, "comments"), {
        movieId,
        text,
        rating: selectedCommentRating > 0 ? selectedCommentRating : null,
        createdAt: serverTimestamp(),
        sessionId: activeViewerId,
        isSubmission: false,
      }),
    ];

    if (selectedCommentRating > 0) {
      writes.push(
        addDoc(collection(db, "ratings"), {
          movieId,
          rating: selectedCommentRating,
          createdAt: serverTimestamp(),
          sessionId: activeViewerId,
          isSubmission: false,
        })
      );
    }

    await Promise.all(writes);

    const hadScore = selectedCommentRating > 0;

    commentTextarea.value = "";
    selectedCommentRating = 0;
    updateCommentStarDisplay(0, false);

    const headerRatingEl = document.getElementById("movieDetailRating");
    await Promise.all([
      loadRatingStats(movieId, document.getElementById("ratingStats"), headerRatingEl),
      loadComments(movieId, document.getElementById("movieComments")),
    ]);

    if (hadScore) {
      invalidateCatalogCache();
      const [rankingModule, searchModule] = await Promise.all([
        import("./movie-ranking.js"),
        import("./search-movies.js"),
      ]);
      await Promise.all([rankingModule.loadRankings(), searchModule.searchMovies()]);
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    showCommentNotice("Failed to post comment. Please try again.", "error");
  } finally {
    postCommentBtn.disabled = false;
    postCommentBtn.textContent = "Post Comment";
  }
});

closeBtn?.addEventListener("click", closeModal);

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }
});
