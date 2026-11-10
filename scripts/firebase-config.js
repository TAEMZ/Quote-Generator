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
  apiKey: "AIzaSyCqIR8qdcUJyjcL7HVQUu61OKF-KkIPmCM",
  authDomain: "quotegenerator-71058.firebaseapp.com",
  projectId: "quotegenerator-71058",
  storageBucket: "quotegenerator-71058.firebasestorage.app",
  messagingSenderId: "705956428522",
  appId: "1:705956428522:web:b0918fff7cc7f6ccc83593",
  measurementId: "G-WBE6CNNMYS",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const VIEWER_SESSION_KEY = "movieTruth_viewerSessionId";

function getViewerSessionId() {
  try {
    let sessionId = localStorage.getItem(VIEWER_SESSION_KEY);
    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `viewer_${crypto.randomUUID()}`
          : `viewer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VIEWER_SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    if (!window.__movieTruthSessionId) {
      window.__movieTruthSessionId = `viewer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
    return window.__movieTruthSessionId;
  }
}

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
  getViewerSessionId,
};
