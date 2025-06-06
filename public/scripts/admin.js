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
    let html = `<div class="user-data"><table><thead><tr><th>ID</th><th>Username</th><th>Access</th><th>Points</th><th>Level</th><th>InvitedBy</th></tr></thead><tbody>`;
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
            <td>${u.invitedBy || '-'}</td>
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

// --- Проверка Telegram userId ---
let userId = null;
if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
  userId = Telegram.WebApp.initDataUnsafe.user.id;
}

// --- DOM Elements ---
const usersList = document.getElementById('usersList');
const codesList = document.getElementById('codesList');
const createCodeBtn = document.getElementById('createCodeBtn');
const notification = document.getElementById('notification');

// --- Проверка доступа ---
if (userId !== ADMIN_ID) {
  document.body.innerHTML = '<div style="color:#fff;text-align:center;margin-top:40vh;font-size:18px;">Нет доступа</div>';
  throw new Error('Not admin');
}

// --- Кэширование данных ---
let usersCache = null;
let codesCache = null;
let lastUsersUpdate = 0;
let lastCodesUpdate = 0;
const CACHE_DURATION = 30000; // 30 секунд
const AUTO_UPDATE_INTERVAL = 60000; // 1 минута

// --- Защита от повторных отправок ---
let isProcessing = false;

// --- Создаём элементы для анимаций ---
const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = `
  <div class="loading-spinner"></div>
  <div class="loading-text">Загрузка...</div>
`;
document.body.appendChild(loadingOverlay);

// --- Индикатор загрузки ---
function showLoading(show, text = 'Загрузка...') {
  isProcessing = show;
  document.body.style.cursor = show ? 'wait' : 'default';
  
  // Обновляем текст и показываем/скрываем оверлей
  const loadingText = loadingOverlay.querySelector('.loading-text');
  loadingText.textContent = text;
  loadingOverlay.style.display = show ? 'flex' : 'none';
  
  // Добавляем/убираем класс для анимации
  if (show) {
    loadingOverlay.classList.add('fade-in');
    loadingOverlay.classList.remove('fade-out');
  } else {
    loadingOverlay.classList.add('fade-out');
    loadingOverlay.classList.remove('fade-in');
  }
}

// --- Анимация обновления элемента ---
function animateUpdate(element, newValue) {
  if (element.textContent === newValue) return;
  
  element.classList.add('fade-out');
  setTimeout(() => {
    element.textContent = newValue;
    element.classList.remove('fade-out');
    element.classList.add('fade-in');
    setTimeout(() => element.classList.remove('fade-in'), 300);
  }, 150);
}

// --- Обработка сетевых ошибок ---
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа от сервера');
    }
    throw error;
  }
}

// --- Получение и отображение пользователей ---
async function fetchUsers(force = false) {
  console.log('загрузка данных началась');
  if (!isAdmin) {
    showNotification('Ошибка: нет доступа к админ-панели');
    return;
  }
  if (isProcessing) return;
  
  // Проверяем кэш
  const now = Date.now();
  if (!force && usersCache && (now - lastUsersUpdate) < CACHE_DURATION) {
    return;
  }
  
  showLoading(true, 'Обновление списка пользователей...');
  try {
    const res = await fetchWithTimeout('/api/admin/users');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка API');
    
    // Обновляем кэш
    usersCache = data.users;
    lastUsersUpdate = now;
    
    updateUsersTable(data.users);
  } catch (e) {
    console.error(e);
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка загрузки пользователей');
    }
  } finally {
    showLoading(false);
  }
}

// --- Отображение текущего пользователя в шапке ---
function setAdminUserInfo(user) {
  const el = document.getElementById('adminUserInfo');
  if (!el) return;
  if (!user) {
    el.textContent = '';
    return;
  }
  el.textContent = `Вы вошли как: ${user.username || 'id:' + user.id}`;
}

// --- Экранирование для XSS ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(tag) {
    const chars = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'};
    return chars[tag] || tag;
  });
}

// --- Копирование кода ---
window.copyCode = function(code) {
  if (!code) return;
  navigator.clipboard.writeText(code);
  showNotification('Код скопирован!');
};

// --- Обновление таблицы пользователей (XSS-safe) ---
function updateUsersTable(users) {
  const tbody = document.getElementById('usersList');
  if (!users || !users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;">Нет пользователей</td></tr>';
    return;
  }
  const html = users.map(user => `
    <tr>
      <td>${escapeHtml(user.id)}</td>
      <td>${escapeHtml(user.username) || '—'}</td>
      <td>${escapeHtml(user.telegramId) || '—'}</td>
      <td>${escapeHtml(user.access) || 'free'}</td>
      <td>${escapeHtml(user.points) || '0'}</td>
      <td>
        <button class="button blue" onclick="viewRefChain(${user.id})">Рефералы</button>
        <button class="button ${user.access === 'paid' ? 'red' : 'green'}" 
                onclick="toggleAccess(${user.id}, '${user.access === 'paid' ? 'free' : 'paid'}')">
          ${user.access === 'paid' ? 'Забрать доступ' : 'Дать доступ'}
        </button>
      </td>
    </tr>
  `).join('');
  tbody.classList.add('fade-out');
  setTimeout(() => {
    tbody.innerHTML = html;
    tbody.classList.remove('fade-out');
    tbody.classList.add('fade-in');
    setTimeout(() => tbody.classList.remove('fade-in'), 300);
  }, 150);
}

// --- Получение и отображение кодов ---
async function fetchCodes(force = false) {
  if (!isAdmin) {
    showNotification('Ошибка: нет доступа к админ-панели');
    return;
  }
  if (isProcessing) return;
  
  // Проверяем кэш
  const now = Date.now();
  if (!force && codesCache && (now - lastCodesUpdate) < CACHE_DURATION) {
    return;
  }
  
  showLoading(true, 'Обновление списка кодов...');
  try {
    const res = await fetchWithTimeout('/api/admin/codes');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка API');
    
    // Обновляем кэш
    codesCache = data.codes;
    lastCodesUpdate = now;
    
    updateCodesTable(data.codes);
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка загрузки кодов');
    }
  } finally {
    showLoading(false);
  }
}

// --- Обновление таблицы кодов (XSS-safe) ---
function updateCodesTable(codes) {
  const tbody = document.getElementById('codesList');
  if (!codes || !codes.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#64748b;">Нет кодов</td></tr>';
    return;
  }
  const html = codes.map(code => `
    <tr>
      <td>${escapeHtml(code.code)}</td>
      <td>${code.used ? 'Да' : 'Нет'}</td>
      <td>
        <button class="button blue" onclick="copyCode('${escapeHtml(code.code)}')">Скопировать</button>
        <button class="button red" onclick="deleteCode('${escapeHtml(code.code)}')">Удалить</button>
      </td>
    </tr>
  `).join('');
  tbody.classList.add('fade-out');
  setTimeout(() => {
    tbody.innerHTML = html;
    tbody.classList.remove('fade-out');
    tbody.classList.add('fade-in');
    setTimeout(() => tbody.classList.remove('fade-in'), 300);
  }, 150);
}

// --- Создание кода ---
async function createCode() {
  if (!isAdmin) {
    showNotification('Ошибка: нет доступа к админ-панели');
    return;
  }
  if (isProcessing) return;
  
  const codeInput = document.getElementById('codeInput');
  const code = codeInput.value.trim();
  
  if (!code) {
    showNotification('Введите код');
    return;
  }
  
  if (!confirm(`Создать код "${code}"?`)) return;
  
  showLoading(true, 'Создание кода...');
  try {
    const res = await fetchWithTimeout('/api/admin/create-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка создания кода');
    
    showNotification('Код создан!');
    codeInput.value = '';
    await fetchCodes(true); // Принудительное обновление
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка создания кода');
    }
  } finally {
    showLoading(false);
  }
}

// --- Удаление кода ---
async function deleteCode(code) {
  if (!isAdmin) {
    showNotification('Ошибка: нет доступа к админ-панели');
    return;
  }
  if (isProcessing) return;
  
  if (!confirm(`Удалить код "${code}"?`)) return;
  
  showLoading(true, 'Удаление кода...');
  try {
    const res = await fetchWithTimeout('/api/admin/delete-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка удаления кода');
    
    showNotification('Код удалён!');
    await fetchCodes(true); // Принудительное обновление
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка удаления кода');
    }
  } finally {
    showLoading(false);
  }
}

// --- Переключение доступа ---
async function toggleAccess(userId, newAccess) {
  if (!isAdmin) {
    showNotification('Ошибка: нет доступа к админ-панели');
    return;
  }
  if (isProcessing) return;
  
  if (!confirm(`Изменить доступ пользователя ${userId} на "${newAccess}"?`)) return;
  
  showLoading(true, 'Изменение доступа...');
  try {
    const res = await fetchWithTimeout('/api/admin/set-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, access: newAccess })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка изменения доступа');
    
    showNotification('Доступ изменён!');
    await fetchUsers(true); // Принудительное обновление
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка изменения доступа');
    }
  } finally {
    showLoading(false);
  }
}

// --- Просмотр реферальной цепочки ---
async function viewRefChain(userId) {
  if (!isAdmin) {
    showNotification('Ошибка: нет доступа к админ-панели');
    return;
  }
  if (isProcessing) return;
  
  showLoading(true, 'Загрузка реферальной цепочки...');
  try {
    const res = await fetchWithTimeout(`/api/admin/ref-chain/${userId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка загрузки цепочки');
    
    const chain = data.chain || [];
    const message = chain.length 
      ? `Реферальная цепочка:\n${chain.map(u => `- ${u.username || u.telegramId || u.id}`).join('\n')}`
      : 'Нет рефералов';
    
    alert(message);
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка загрузки цепочки');
    }
  } finally {
    showLoading(false);
  }
}

// --- Уведомления ---
function showNotification(msg) {
  if (!msg) return;
  const notification = document.getElementById('notification');
  notification.textContent = msg;
  notification.classList.add('show', 'fade-in');
  notification.classList.remove('fade-out');
  setTimeout(() => {
    notification.classList.add('fade-out');
    notification.classList.remove('fade-in');
    setTimeout(() => notification.classList.remove('show', 'fade-out'), 300);
  }, 1900);
}

// --- Обновление данных ---
window.refreshUsers = () => fetchUsers(true);
window.refreshCodes = () => fetchCodes(true);

// --- Автоматическое обновление ---
setInterval(() => {
  fetchUsers();
  fetchCodes();
}, AUTO_UPDATE_INTERVAL);

// --- Инициализация ---
async function init() {
  // Проверяем админ-доступ
  try {
    const res = await fetchWithTimeout('/api/admin/check-access');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    isAdmin = data.isAdmin;
    setAdminUserInfo(data.user);
    if (isAdmin) {
      await Promise.all([fetchUsers(), fetchCodes()]);
    } else {
      showNotification('Ошибка: нет доступа к админ-панели');
    }
  } catch (e) {
    showNotification(e.message || 'Ошибка инициализации');
  }
}

init(); 