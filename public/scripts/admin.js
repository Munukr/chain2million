import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAEypVEjcY06jvOPJ7n_mokFzGaLfQK5As",
    authDomain: "chain2million.firebaseapp.com",
    projectId: "chain2million",
    storageBucket: "chain2million.firebasestorage.app",
    messagingSenderId: "973965190962",
    appId: "1:973965190962:web:9bc658c2131273445ad92b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user data from Telegram
const user = tg.initDataUnsafe?.user;

if (!user) {
    document.getElementById('content').textContent = 'Error: No user data';
    throw new Error('No user data available');
}

// Function to get user data from Firestore
async function getUserData(userId) {
    const userRef = doc(db, 'users', userId.toString());
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        return null;
    }
    
    return userDoc.data();
}

// Function to update UI with user data
function updateUI(userData) {
    if (!userData) {
        document.getElementById('content').textContent = 'User not found';
        return;
    }

    const content = document.getElementById('content');
    content.innerHTML = `
        <p><strong>User ID:</strong> ${userData.id}</p>
        <p><strong>Access Level:</strong> ${userData.access}</p>
    `;
}

// Main initialization
async function init() {
    try {
        const userData = await getUserData(user.id);
        updateUI(userData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('content').textContent = 'Error loading user data';
    }
}

// Start the app
init(); 