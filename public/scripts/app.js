const adminRoutes = require('./api/admin');
app.use('/api/admin', adminRoutes); 

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// --- Получение userId из Telegram WebApp ---
let userId = null;
if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
  userId = Telegram.WebApp.initDataUnsafe.user.id;
}
console.log('userId из Telegram:', userId);
renderDebugPanel();
if (!userId) {
  showNotification('Ошибка: не удалось получить userId из Telegram. Проверьте, что WebApp открыт через Telegram-кнопку.');
  document.getElementById('content').innerHTML = '<div style="color:#f55;text-align:center;font-size:18px;padding:40px 0;">Ошибка: не удалось получить userId из Telegram.<br>initDataUnsafe: <pre style=\'white-space:pre-wrap;background:#111;color:#0ff;padding:4px 6px;border-radius:4px;\'>' + (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe ? JSON.stringify(Telegram.WebApp.initDataUnsafe, null, 2) : 'нет данных') + '</pre></div>';
}

// DOM Elements
const profileAvatar = document.getElementById('profileAvatar');
const profileUsername = document.getElementById('profileUsername');
const profileStatus = document.getElementById('profileStatus');
const userPoints = document.getElementById('userPoints');
const userLevel = document.getElementById('userLevel');
const referralLink = document.getElementById('referralLink');
const invitedUsers = document.getElementById('invitedUsers');
const referralChain = document.getElementById('referralChain');
const upgradeButton = document.getElementById('upgradeButton');
const withdrawButton = document.getElementById('withdrawButton');
const notification = document.getElementById('notification');

// --- Создаём элементы для анимаций ---
const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = `
  <div class="loading-spinner"></div>
  <div class="loading-text">Загрузка...</div>
`;
document.body.appendChild(loadingOverlay);

// --- Кэширование данных ---
let userCache = null;
let lastUpdateTime = 0;
const CACHE_DURATION = 30000; // 30 секунд
const AUTO_UPDATE_INTERVAL = 60000; // 1 минута

// --- Защита от повторных отправок ---
let isProcessing = false;

// --- Индикатор загрузки ---
function showLoading(show, text = 'Загрузка...') {
  isProcessing = show;
  document.body.style.cursor = show ? 'wait' : 'default';
  [withdrawButton, upgradeButton].forEach(btn => {
    if (btn) btn.disabled = show;
  });
  
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

// --- Получение и отображение данных пользователя ---
async function fetchUser(force = false) {
  console.log('загрузка данных началась');
  if (!userId) {
    showNotification('Ошибка: не удалось получить userId из Telegram');
    return;
  }
  if (isProcessing) return;
  
  // Проверяем кэш
  const now = Date.now();
  if (!force && userCache && (now - lastUpdateTime) < CACHE_DURATION) {
    return;
  }
  
  showLoading(true, 'Обновление данных...');
  try {
    console.log('fetch /api/user/' + userId);
    const res = await fetchWithTimeout(`/api/user/${userId}`);
    console.log('fetch response:', res);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log('fetch data:', data);
    if (!data.success) throw new Error(data.error || 'Ошибка API');
    
    // Обновляем кэш
    userCache = data.user;
    lastUpdateTime = now;
    
    updateUI(data.user);
  } catch (e) {
    console.error(e);
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка загрузки данных пользователя');
    }
  } finally {
    showLoading(false);
  }
}

// --- Экранирование для XSS ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(tag) {
    const chars = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'};
    return chars[tag] || tag;
  });
}

// --- Оптимизированное обновление UI ---
function updateUI(user) {
  if (!user) return;
  
  // Обновляем только изменившиеся элементы с анимацией
  const updates = {
    avatar: escapeHtml(user.username?.[0]?.toUpperCase() || 'U'),
    username: escapeHtml(user.username || 'User'),
    status: escapeHtml(user.access),
    points: escapeHtml(user.points || '0'),
    level: escapeHtml(user.level || '—'),
    referral: `https://t.me/chain2million_bot?start=ref_${user.telegramId || user.id}`,
    withdrawVisible: (user.points || 0) >= 200,
    upgradeVisible: user.access === 'free'
  };
  
  animateUpdate(profileAvatar, updates.avatar);
  animateUpdate(profileUsername, updates.username);
  animateUpdate(profileStatus, updates.status);
  animateUpdate(userPoints, updates.points);
  animateUpdate(userLevel, updates.level);
  
  if (referralLink.value !== updates.referral) {
    referralLink.value = updates.referral;
  }
  
  // Анимируем появление/исчезновение кнопок
  if (withdrawButton.style.display !== (updates.withdrawVisible ? 'inline-flex' : 'none')) {
    withdrawButton.style.display = updates.withdrawVisible ? 'inline-flex' : 'none';
    withdrawButton.classList.add(updates.withdrawVisible ? 'fade-in' : 'fade-out');
    setTimeout(() => withdrawButton.classList.remove('fade-in', 'fade-out'), 300);
  }
  
  if (upgradeButton.style.display !== (updates.upgradeVisible ? 'inline-flex' : 'none')) {
    upgradeButton.style.display = updates.upgradeVisible ? 'inline-flex' : 'none';
    upgradeButton.classList.add(updates.upgradeVisible ? 'fade-in' : 'fade-out');
    setTimeout(() => upgradeButton.classList.remove('fade-in', 'fade-out'), 300);
  }
  
  // Приглашённые с анимацией
  const invitedHtml = !user.invitedUsers || !user.invitedUsers.length
    ? '<li class="invited-item" style="color:#64748b;">Пока никого</li>'
    : user.invitedUsers.map(u => 
        `<li class="invited-item">${u.username || u.telegramId || 'Unknown'}</li>`
      ).join('');
  
  if (invitedUsers.innerHTML !== invitedHtml) {
    invitedUsers.classList.add('fade-out');
    setTimeout(() => {
      invitedUsers.innerHTML = invitedHtml;
      invitedUsers.classList.remove('fade-out');
      invitedUsers.classList.add('fade-in');
      setTimeout(() => invitedUsers.classList.remove('fade-in'), 300);
    }, 150);
  }
}

// --- Копирование ссылки ---
window.copyReferralLink = function() {
  if (!referralLink.value) {
    showNotification('Ошибка: реферальная ссылка недоступна');
    return;
  }
  referralLink.select();
  document.execCommand('copy');
  showNotification('Ссылка скопирована!');
};

// --- Кнопка "Оплатить доступ" ---
upgradeButton.onclick = async function() {
  if (isProcessing) return;
  if (!confirm('Вы уверены, что хотите оплатить доступ?')) return;
  
  showLoading(true, 'Обработка оплаты...');
  try {
    const res = await fetchWithTimeout('/api/user/upgradeToPaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка оплаты');
    showNotification('Доступ оплачен!');
    await fetchUser(true); // Принудительное обновление
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка оплаты');
    }
  } finally {
    showLoading(false);
  }
};

// --- Кнопка "Вывести деньги" ---
withdrawButton.onclick = async function() {
  if (isProcessing) return;
  if (!confirm('Вы уверены, что хотите вывести деньги?')) return;
  
  showLoading(true, 'Обработка вывода...');
  try {
    const res = await fetchWithTimeout('/api/user/requestWithdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ошибка');
    showNotification('Запрос на вывод отправлен!');
    await fetchUser(true); // Принудительное обновление
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showNotification('Ошибка сети. Проверьте подключение к интернету');
    } else {
      showNotification(e.message || 'Ошибка при выводе');
    }
  } finally {
    showLoading(false);
  }
};

// --- Уведомления ---
function showNotification(msg) {
  if (!msg) return;
  notification.textContent = msg;
  notification.classList.add('show', 'fade-in');
  notification.classList.remove('fade-out');
  setTimeout(() => {
    notification.classList.add('fade-out');
    notification.classList.remove('fade-in');
    setTimeout(() => notification.classList.remove('show', 'fade-out'), 300);
  }, 1900);
}

// --- Автоматическое обновление ---
setInterval(() => fetchUser(), AUTO_UPDATE_INTERVAL);

// --- Инициализация ---
fetchUser();

// --- DEBUG PANEL ---
function renderDebugPanel() {
  let panel = document.getElementById('debugPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style = 'position:fixed;bottom:0;left:0;right:0;background:#222;color:#fff;font-size:12px;padding:8px 12px;z-index:2000;opacity:0.95;max-height:120px;overflow:auto;border-top:1px solid #444;';
    document.body.appendChild(panel);
  }
  const initData = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) ? JSON.stringify(Telegram.WebApp.initDataUnsafe, null, 2) : 'нет данных';
  panel.innerHTML = `<b>Debug info:</b><br>
    userId: <code>${userId ?? 'нет'}</code><br>
    initDataUnsafe: <pre style='white-space:pre-wrap;background:#111;color:#0ff;padding:4px 6px;border-radius:4px;'>${initData}</pre>
    <span id='debugError'></span>`;
}

// --- Глобальный обработчик ошибок ---
window.onerror = function(msg, url, line, col, error) {
  const text = `JS error: ${msg} at ${url}:${line}:${col}`;
  showNotification(text);
  const debugErr = document.getElementById('debugError');
  if (debugErr) debugErr.innerHTML = `<span style='color:#f55;'>${text}</span>`;
  return false;
};

setInterval(renderDebugPanel, 2000); 