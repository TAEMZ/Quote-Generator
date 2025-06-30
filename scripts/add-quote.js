import { db, collection, addDoc, serverTimestamp } from "./firebase-config.js";
import { uploadImage } from "./image-upload.js";

const quoteForm = document.getElementById("quoteForm");
const quoteText = document.getElementById("quoteText");
const quotePerson = document.getElementById("quotePerson");
const quoteMovie = document.getElementById("quoteMovie");
const quoteMinute = document.getElementById("quoteMinute");
const imageUpload = document.getElementById("quoteImageUpload");
const imagePreview = document.getElementById("quoteImagePreview");
const formMessage = document.getElementById("quoteFormMessage");

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

quoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = quoteText.value.trim();
  const person = quotePerson.value.trim();
  const movie = quoteMovie.value.trim();
  const minute = quoteMinute.value.trim();
  const imageFile = imageUpload.files[0];

  if (!text || !person || !movie || !minute) {
    showMessage("Please fill all required fields", "error");
    return;
  }

  try {
    let imageUrl = "";

    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

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

    // Refresh the quote display
    setTimeout(() => {
      document
        .querySelector('[data-tab="add-quote"]')
        .classList.remove("active");
      document.getElementById("add-quote").classList.remove("active");
      document.querySelector('[data-tab="add-movie"]').classList.add("active");
      document.getElementById("add-movie").classList.add("active");
    }, 1500);
  } catch (error) {
    console.error("Error adding quote:", error);
    showMessage("Failed to add quote. Please try again.", "error");
  }
});

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `cyber-message ${type}`;
  setTimeout(() => {
    formMessage.textContent = "";
    formMessage.className = "cyber-message";
  }, 3000);
}
