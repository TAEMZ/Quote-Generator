import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// DOM
const quoteEl = document.querySelector(".cyber-quote-text");
const personEl = document.querySelector(".cyber-quote-person");
const imageEl = document.querySelector(".cyber-quote-image");
const imageContainer = document.querySelector(".cyber-quote-image-container");
const movieInfoEl = document.querySelector(".cyber-quote-movie");
const newBtn = document.querySelector("#newQuoteBtn");

const toggleFormBtn = document.querySelector("#toggleFormBtn");
const quoteForm = document.querySelector("#quoteForm");
const submitBtn = document.querySelector("#submitQuote");
const formError = document.querySelector("#formError");

const quotesCol = collection(db, "quotes");

// Get Random Quote
async function getRandomQuote() {
  try {
    quoteEl.textContent = "Loading...";
    personEl.textContent = "";
    movieInfoEl.textContent = "";
    imageContainer.style.display = "none";

    const snapshot = await getDocs(quotesCol);
    const quotes = snapshot.docs.map((doc) => doc.data());
    if (!quotes.length) {
      quoteEl.textContent = "No quotes found.";
      return;
    }

    const random = Math.floor(Math.random() * quotes.length);
    const q = quotes[random];

    quoteEl.innerText = `"${q.quote}"`;
    personEl.innerText = `— ${q.person}`;
    movieInfoEl.innerText = `${q.movie} (${q.minute} min)`;
    if (q.imageUrl) {
      imageEl.src = q.imageUrl;
      imageContainer.style.display = "block";
    }
  } catch (err) {
    quoteEl.innerText = "Failed to load quote.";
    console.error(err);
  }
}

newBtn.addEventListener("click", getRandomQuote);

// Toggle Form
toggleFormBtn.addEventListener("click", () => {
  quoteForm.style.display =
    quoteForm.style.display === "none" ? "block" : "none";
});

// Upload Image to Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "cloudinary"); // replace with your actual preset
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/da7hlicdz/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );
  const data = await res.json();
  return data.secure_url;
}

// Submit Form
submitBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const quote = document.querySelector("#quoteInput").value.trim();
  const person = document.querySelector("#personInput").value.trim();
  const movie = document.querySelector("#movieInput").value.trim();
  const minute = document.querySelector("#minuteInput").value.trim();
  const imageFile = document.querySelector("#imageInput").files[0];

  if (!quote || !person || !movie || !minute || !imageFile) {
    formError.textContent = "❌ Please fill all fields and upload an image.";
    return;
  }

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
    formError.textContent = "✅ Quote added successfully!";
    quoteForm.reset();
    quoteForm.style.display = "none";
    getRandomQuote();
  } catch (err) {
    formError.textContent = "❌ Upload failed.";
    console.error(err);
  }
});

// On Load
getRandomQuote();
