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
        showReferralButton(user.id);
        await showInvitedUsers(userData);
        showInvitedBy(userData);
        showWithdrawButton(userData);
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
function showReferralButton(userId) {
    const container = document.querySelector('.container');
    let btn = document.getElementById('showRefModalBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'showRefModalBtn';
        btn.textContent = 'Реферальная ссылка';
        btn.style = 'margin:24px auto 0 auto;display:block;padding:12px 28px;font-size:17px;background:#2ecc40;color:#fff;border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px #0002;';
        btn.onclick = () => openReferralModal(userId);
        container.appendChild(btn);
    }
}

function openReferralModal(userId) {
    const botName = 'chain2million_bot';
    const link = `https://t.me/${botName}?start=ref_${userId}`;
    let modal = document.getElementById('refModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'refModal';
        modal.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:1000;';
        modal.innerHTML = `<div style="background:#222;padding:32px 24px 24px 24px;border-radius:16px;box-shadow:0 4px 32px #0008;min-width:280px;max-width:90vw;text-align:center;">
            <div style='font-size:18px;margin-bottom:16px;color:#fff;'>Ваша реферальная ссылка</div>
            <input id="refLinkModal" type="text" readonly style="width:90%;padding:10px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;text-align:center;font-size:16px;" value="${link}"><br>
            <button id="copyRefModal" style="margin-top:18px;padding:10px 24px;border:none;border-radius:8px;background:#2ecc40;color:#fff;font-size:16px;cursor:pointer;">Скопировать</button>
            <button id="closeRefModal" style="margin-top:18px;margin-left:12px;padding:10px 24px;border:none;border-radius:8px;background:#555;color:#fff;font-size:16px;cursor:pointer;">Закрыть</button>
        </div>`;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
        document.getElementById('refLinkModal').value = link;
    }
    document.getElementById('copyRefModal').onclick = function() {
        navigator.clipboard.writeText(link).then(() => {
            closeReferralModal();
            showRefCopiedMsg();
        });
    };
    document.getElementById('closeRefModal').onclick = closeReferralModal;
}

function closeReferralModal() {
    let modal = document.getElementById('refModal');
    if (modal) modal.style.display = 'none';
}

function showRefCopiedMsg() {
    let el = document.getElementById('refCopiedMsg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'refCopiedMsg';
        el.style = 'position:fixed;left:50%;top:18%;transform:translate(-50%,0);background:#2ecc40;color:#fff;padding:14px 32px;border-radius:10px;font-size:18px;z-index:2000;box-shadow:0 2px 12px #0005;';
        el.textContent = 'Ссылка скопирована!';
        document.body.appendChild(el);
    }
    el.style.display = 'block';
    setTimeout(()=>{el.style.display='none';}, 1400);
}

async function showInvitedUsers(userData) {
    const invitedListDiv = document.getElementById('invitedList');
    invitedListDiv.innerHTML = '<b>Кого вы пригласили:</b><br>Загрузка...';
    if (!userData.invitedUsers || userData.invitedUsers.length === 0) {
        invitedListDiv.innerHTML = '<b>Кого вы пригласили:</b><br><i>Пока никого</i>';
        return;
    }
    let html = '<b>Кого вы пригласили:</b><ul style="margin:8px 0 0 0;padding-left:18px;">';
    for (const uid of userData.invitedUsers) {
        const ref = doc(db, 'users', uid);
        const docSnap = await getDoc(ref);
        if (docSnap.exists()) {
            const u = docSnap.data();
            html += `<li>${u.first_name || u.username || uid} — <span style="color:#2ecc40">${u.access}</span></li>`;
        } else {
            html += `<li>${uid} — <span style="color:#888">не найден</span></li>`;
        }
    }
    html += '</ul>';
    invitedListDiv.innerHTML = html;
}

function showInvitedBy(userData) {
    if (!userData.invitedBy) return;
    const refBlock = document.getElementById('refBlock');
    refBlock.innerHTML = `<div style="margin:10px 0 0 0;font-size:15px;">Вас пригласил: <b>${userData.invitedBy}</b></div>`;
}

function showWithdrawButton(userData) {
    const withdrawBlock = document.getElementById('withdrawBlock');
    if (userData.points >= 200) {
        withdrawBlock.innerHTML = '<button id="withdrawBtn" style="margin-top:18px;padding:12px 32px;font-size:18px;background:#2ecc40;color:#fff;border:none;border-radius:8px;cursor:pointer;">Вывести деньги</button>';
        document.getElementById('withdrawBtn').onclick = () => {
            alert('Заявка на вывод отправлена!');
        };
    } else {
        withdrawBlock.innerHTML = '';
    }
} 