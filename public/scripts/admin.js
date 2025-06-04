import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    collection
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

const ADMIN_ID = 795024553;

if (!user) {
    document.getElementById('content').textContent = 'Ошибка: нет данных пользователя';
    throw new Error('No user data available');
}

if (user.id !== ADMIN_ID) {
    document.getElementById('content').innerHTML = '<div style="color:#f55;text-align:center;font-size:20px;padding:40px 0;">⛔ Доступ запрещён</div>';
    throw new Error('Access denied');
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

// Получить всех пользователей
async function getAllUsers() {
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    return usersSnap.docs.map(doc => doc.data());
}

// Обновить access пользователя
async function updateUserAccess(userId, newAccess) {
    const userRef = doc(db, 'users', userId.toString());
    await updateDoc(userRef, { access: newAccess });
}

// Показать сообщение об успехе
function showSuccess(msg) {
    let el = document.getElementById('successMsg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'successMsg';
        el.style = 'background:#2ecc40;color:#fff;padding:10px 20px;margin:10px 0 20px 0;border-radius:8px;text-align:center;font-size:16px;';
        document.querySelector('.container').insertBefore(el, document.getElementById('content'));
    }
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2000);
}

// Показать таблицу пользователей
function renderTable(users) {
    const content = document.getElementById('content');
    if (!users.length) {
        content.innerHTML = '<div style="color:#f55;text-align:center;">Нет пользователей</div>';
        return;
    }
    let html = `<div class="user-data"><table><thead><tr><th>ID</th><th>Username</th><th>Access</th><th>Points</th><th>Level</th></tr></thead><tbody>`;
    for (const u of users) {
        html += `<tr>
            <td>${u.id}</td>
            <td>${u.username || '-'}</td>
            <td>
                <select data-id="${u.id}" class="access-select">
                    <option value="free"${u.access==='free'?' selected':''}>free</option>
                    <option value="paid"${u.access==='paid'?' selected':''}>paid</option>
                </select>
            </td>
            <td>${u.points ?? 0}</td>
            <td>${u.level || '-'}</td>
        </tr>`;
    }
    html += '</tbody></table></div>';
    content.innerHTML = html;
    // Навесить обработчики на select
    document.querySelectorAll('.access-select').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const value = e.target.value;
            try {
                await updateUserAccess(id, value);
                showSuccess('✔️ Доступ успешно обновлён');
            } catch (err) {
                alert('Ошибка обновления доступа');
            }
        });
    });
}

// Main initialization
async function init() {
    try {
        const users = await getAllUsers();
        renderTable(users);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('content').textContent = 'Ошибка загрузки пользователей';
    }
}

// Start the app
init(); 