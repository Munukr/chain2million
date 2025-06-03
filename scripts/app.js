import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc
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
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// Debug logs
console.log('tg:', tg);
console.log('tg.initDataUnsafe:', tg?.initDataUnsafe);
console.log('tg.initDataUnsafe.user:', tg?.initDataUnsafe?.user);

// Get user data from Telegram
const user = tg?.initDataUnsafe?.user;

if (!user) {
    document.getElementById('welcome').textContent = 'Откройте через Telegram';
    document.getElementById('userData').innerHTML = '<div style="color:#f55; text-align:center; padding:20px;">WebApp должен быть открыт из Telegram.<br>\nПожалуйста, нажмите кнопку в боте.</div>';
    throw new Error('No user data available. WebApp must be opened from Telegram.');
}

// Update welcome message
document.getElementById('welcome').textContent = `Добро пожаловать, ${user.first_name}`;

// Function to create or update user in Firestore
async function createOrUpdateUser(userData) {
    const userRef = doc(db, 'users', userData.id.toString());
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // Create new user
        const newUser = {
            id: userData.id,
            username: userData.username || '',
            first_name: userData.first_name,
            access: 'free',
            points: 0,
            level: 'bronze',
            joinedAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        return newUser;
    }

    return userDoc.data();
}

// Function to update UI with user data
function updateUI(userData) {
    document.getElementById('userId').textContent = userData.id;
    document.getElementById('username').textContent = userData.username || '-';
    document.getElementById('access').textContent = userData.access;
    document.getElementById('points').textContent = userData.points;
    document.getElementById('level').textContent = userData.level;
    document.getElementById('joinedAt').textContent = new Date(userData.joinedAt).toLocaleDateString();
}

// Main initialization
async function init() {
    try {
        const userData = await createOrUpdateUser(user);
        updateUI(userData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('welcome').textContent = 'Ошибка загрузки данных';
        document.getElementById('userData').innerHTML = '<div style="color:#f55; text-align:center; padding:20px;">Ошибка загрузки данных пользователя.<br>Попробуйте позже.</div>';
    }
}

// Start the app
init(); 