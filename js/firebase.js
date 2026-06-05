// js/firebase.js

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdWBhNdJCjmleSj0UFdNR13HiV0xjArJY",
  authDomain: "akademiarw-40450.firebaseapp.com",
  databaseURL: "https://akademiarw-40450-default-rtdb.firebaseio.com",
  projectId: "akademiarw-40450",
  storageBucket: "akademiarw-40450.firebasestorage.app",
  messagingSenderId: "242022542222",
  appId: "1:242022542222:web:d32035522b4f6782dbd2df",
  measurementId: "G-RE3YZZJ2D8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const storage = getStorage(app);

// Export for use in other files
export { app, analytics, auth, db, realtimeDb, storage };
