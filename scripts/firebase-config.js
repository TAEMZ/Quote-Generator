import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALjjiW9_Sp4M7tQ2U7miaUPXy9-cJjd1c",
  authDomain: "quote-824b3.firebaseapp.com",
  projectId: "quote-824b3",
  storageBucket: "quote-824b3.appspot.com",
  messagingSenderId: "405350582206",
  appId: "1:405350582206:web:871303f874a5cbbe761bef",
  measurementId: "G-K86E85D2H3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
};
