import {
  db,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "./firebase-config.js";

// DOM Elements
const quoteImage = document.querySelector(".cyber-quote-image");
const quoteText = document.querySelector(".cyber-quote-text");
const quotePerson = document.querySelector(".cyber-quote-person");
const quoteMovie = document.querySelector(".cyber-quote-movie");
const newQuoteBtn = document.getElementById("newQuoteBtn");
const quoteImageContainer = document.querySelector(
  ".cyber-quote-image-container"
);
const toggleFormBtn = document.getElementById("toggleFormBtn");
const quoteForm = document.getElementById("quoteForm");
const formMessage = document.getElementById("quoteFormMessage");
const imageUpload = document.getElementById("quoteImageUpload");
const imagePreview = document.getElementById("quoteImagePreview");

// Get random quote from Firestore
async function getRandomQuote() {
  try {
    quoteText.textContent = "Loading...";
    quotePerson.textContent = "";
    quoteMovie.textContent = "";
    quoteImageContainer.style.display = "none";

    const quotesCol = collection(db, "quotes");
    const snapshot = await getDocs(quotesCol);
    const quotes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (!quotes.length) {
      quoteText.textContent = "No quotes found in database";
      return;
    }

    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];

    quoteText.textContent = `"${quote.quote}"`;
    quotePerson.textContent = `— ${quote.person}`;
    quoteMovie.textContent = `${quote.movie} (${quote.minute} min)`;

    if (quote.imageUrl) {
      quoteImage.src = quote.imageUrl;
      quoteImageContainer.style.display = "block";

      // Preload image for smooth transition
      const img = new Image();
      img.src = quote.imageUrl;
    } else {
      quoteImageContainer.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading quotes:", err);
    quoteText.textContent = "Failed to load quotes. Please try again.";
    quotePerson.textContent = "";
    quoteMovie.textContent = "";
    quoteImageContainer.style.display = "none";
  }
}

// Toggle form visibility
toggleFormBtn.addEventListener("click", () => {
  quoteForm.style.display =
    quoteForm.style.display === "none" ? "block" : "none";
});

// Image upload preview
imageUpload.addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.style.display = "none";
  }
});

// Handle form submission
quoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = document.getElementById("quoteText").value.trim();
  const person = document.getElementById("quotePerson").value.trim();
  const movie = document.getElementById("quoteMovie").value.trim();
  const minute = document.getElementById("quoteMinute").value.trim();
  const imageFile = imageUpload.files[0];

  if (!text || !person || !movie || !minute || !imageFile) {
    showMessage("Please fill all required fields including image", "error");
    return;
  }

  try {
    const imageUrl = await uploadToCloudinary(imageFile);

    await addDoc(collection(db, "quotes"), {
      quote: text,
      person,
      movie,
      minute,
      imageUrl,
      createdAt: serverTimestamp(),
    });

    showMessage("Quote added successfully!", "success");
    quoteForm.reset();
    imagePreview.style.display = "none";
    quoteForm.style.display = "none";
    getRandomQuote(); // Refresh the displayed quote
  } catch (error) {
    console.error("Error adding quote:", error);
    showMessage("Failed to add quote. Please try again.", "error");
  }
});

// Upload image to Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "cloudinary"); // Replace with your Cloudinary upload preset

  try {
    const response = await fetch(
      "https://api.cloudinary.com/v1_1/da7hlicdz/image/upload", // Replace with your Cloudinary cloud name
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

// Show form messages
function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `cyber-message ${type}`;
  setTimeout(() => {
    formMessage.textContent = "";
    formMessage.className = "cyber-message";
  }, 3000);
}

// New quote button
newQuoteBtn.addEventListener("click", () => {
  newQuoteBtn.disabled = true;
  setTimeout(() => {
    newQuoteBtn.disabled = false;
  }, 1000);
  getRandomQuote();
});

// Load a quote on startup
document.addEventListener("DOMContentLoaded", getRandomQuote);
