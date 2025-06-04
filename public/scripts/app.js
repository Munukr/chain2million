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
async function createOrUpdateUser(userData, invitedBy) {
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
            joinedAt: new Date().toISOString(),
            invitedBy: invitedBy || null
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
    document.getElementById('joinedAt').textContent = isValidDate(userData.joinedAt)
        ? new Date(userData.joinedAt).toLocaleDateString()
        : '—';
}

// Функция для проверки корректности даты
function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

// Функция для обновления joinedAt, если дата некорректна
async function fixJoinedAtIfNeeded(userData) {
    if (!isValidDate(userData.joinedAt)) {
        const userRef = doc(db, 'users', userData.id.toString());
        const fixed = { ...userData, joinedAt: new Date().toISOString() };
        await setDoc(userRef, fixed, { merge: true });
        return fixed;
    }
    return userData;
}

// Main initialization
async function init() {
    try {
        // Получаем invitedBy из query-параметра, если есть
        let invitedBy = null;
        const params = new URLSearchParams(window.location.search);
        if (params.has('ref')) {
            invitedBy = params.get('ref');
        }
        let userData = await createOrUpdateUser(user, invitedBy);
        userData = await fixJoinedAtIfNeeded(userData);
        updateUI(userData);
        showReferralLink(user.id);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('welcome').textContent = 'Ошибка загрузки данных';
        document.getElementById('userData').innerHTML = '<div style="color:#f55; text-align:center; padding:20px;">Ошибка загрузки данных пользователя.<br>Попробуйте позже.</div>';
    }
}

// Start the app
init();

// Добавим функцию для вывода логов и ошибок на страницу
function showDebugInfo(info) {
    // Фильтруем события Telegram.WebView, чтобы не засорять экран
    if (typeof info === 'string' && info.startsWith('[Telegram.WebView]')) return;
    if (typeof info === 'string' && info.includes('viewport_changed')) return;
    if (typeof info === 'string' && info.includes('safe_area_changed')) return;
    if (typeof info === 'string' && info.includes('content_safe_area_changed')) return;
    if (typeof info === 'string' && info.includes('theme_changed')) return;

    let el = document.getElementById('debugInfo');
    if (!el) {
        el = document.createElement('pre');
        el.id = 'debugInfo';
        el.style = 'background:#222;color:#f55;padding:10px;margin-top:20px;overflow:auto;max-width:100%;font-size:12px;border-radius:8px;';
        document.querySelector('.container').appendChild(el);
    }
    el.textContent += (typeof info === 'string' ? info : JSON.stringify(info, null, 2)) + '\n';
}

// Переопределим console.log/error/warn для вывода на страницу
['log','error','warn'].forEach(fn => {
    const orig = console[fn];
    console[fn] = function(...args) {
        orig.apply(console, args);
        showDebugInfo(args.map(a => (typeof a==='object'?JSON.stringify(a):a)).join(' '));
    };
});

// Показываем реферальную ссылку
function showReferralLink(userId) {
    const botName = 'chain2million_bot';
    const link = `https://t.me/${botName}?start=ref_${userId}`;
    let refBlock = document.getElementById('refBlock');
    if (!refBlock) {
        refBlock = document.createElement('div');
        refBlock.id = 'refBlock';
        refBlock.style = 'margin:20px 0;text-align:center;';
        refBlock.innerHTML = `<div style="margin-bottom:10px;">Ваша реферальная ссылка:</div><input id="refLink" type="text" readonly style="width:90%;padding:8px;border-radius:6px;border:1px solid #444;background:#222;color:#fff;text-align:center;font-size:15px;" value="${link}"><br><button id="copyRef" style="margin-top:10px;padding:8px 18px;border:none;border-radius:6px;background:#2ecc40;color:#fff;font-size:15px;cursor:pointer;">Скопировать ссылку</button><div id="copyMsg" style="color:#2ecc40;margin-top:8px;display:none;">Скопировано!</div>`;
        document.querySelector('.container').appendChild(refBlock);
        document.getElementById('copyRef').onclick = function() {
            navigator.clipboard.writeText(link).then(() => {
                const msg = document.getElementById('copyMsg');
                msg.style.display = 'block';
                setTimeout(()=>{msg.style.display='none';}, 1200);
            });
        };
    }
} 