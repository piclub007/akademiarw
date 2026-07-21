// src/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

// Your Firebase configuration
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('Browser doesn\'t support persistence');
    }
});

// Setup Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export { app, auth, db, storage, googleProvider };
