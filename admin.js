// Функция для отображения результата
function showResult(data) {
    const resultDiv = document.getElementById('result');
    if (typeof data === 'object') {
        resultDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } else {
        resultDiv.innerHTML = data;
    }
}

// Функция для получения userId из поля ввода
function getUserId() {
    const userId = document.getElementById('userId').value.trim();
    if (!userId) {
        showResult('Error: Please enter User ID');
        return null;
    }
    return userId;
}

// Функция для отображения сгенерированной ссылки
function showGeneratedLink(code) {
    const linkDisplay = document.getElementById('generatedLink');
    const linkText = document.getElementById('linkText');
    const fullLink = `/start free_${code}`;
    
    linkText.textContent = fullLink;
    linkDisplay.style.display = 'flex';
}

// Функция для копирования ссылки в буфер обмена
function copyLink() {
    const linkText = document.getElementById('linkText').textContent;
    navigator.clipboard.writeText(linkText).then(() => {
        showResult('Ссылка скопирована в буфер обмена!');
    }).catch(err => {
        showResult('Ошибка при копировании: ' + err);
    });
}

// --- Toastify уведомления ---
function showNotification(message, type = 'info') {
  Toastify({
    text: `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`,
    duration: 2500,
    gravity: 'top',
    position: 'right',
    className: type,
    stopOnFocus: true,
    escapeMarkup: false
  }).showToast();
}

// --- Одноразовые коды ---
async function fetchCodes() {
  const res = await fetch('/api/admin/codes');
  const data = await res.json();
  renderCodesTable(data.codes || []);
}

function renderCodesTable(codes) {
  const tbody = document.getElementById('codesTable');
  if (!codes.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="py-2 text-slate-400">Нет кодов</td></tr>';
    return;
  }
  tbody.innerHTML = codes.map(code => `
    <tr class="hover:bg-slate-700 transition">
      <td class="py-2 pr-4 font-mono">${code.value}</td>
      <td class="py-2 pr-4">
        <span class="inline-flex items-center gap-1 ${code.used ? 'text-emerald-400' : 'text-yellow-400'}">
          ${code.used ? '✔️ Использован' : '⏳ Не использован'}
        </span>
      </td>
      <td class="py-2 pr-4 text-slate-400">${code.createdAt ? new Date(code.createdAt).toLocaleString() : ''}</td>
    </tr>
  `).join('');
}

document.getElementById('createCodeBtn').onclick = async function() {
  const res = await fetch('/api/admin/create-code', { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    showNotification('Код создан!', 'success');
    fetchCodes();
  } else {
    showNotification('Ошибка создания кода', 'error');
  }
};

// --- Пользователи ---
let allUsers = [];

async function fetchUsers() {
  const res = await fetch('/api/admin/users');
  const data = await res.json();
  allUsers = data.users || [];
  renderUsersTable(allUsers);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTable');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-2 text-slate-400">Нет пользователей</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr class="hover:bg-slate-700 transition">
      <td class="py-2 pr-4 font-medium text-white">${u.username || `User ${u.telegramId}`}</td>
      <td class="py-2 pr-4"><span class="px-2 py-1 rounded ${u.access === 'paid' ? 'bg-emerald-500 text-white' : 'bg-yellow-400 text-slate-900'}">${u.access}</span></td>
      <td class="py-2 pr-4">${u.points || 0}</td>
      <td class="py-2 pr-4">${u.level || '—'}</td>
      <td class="py-2 pr-4 flex gap-2">
        <button onclick="showChain('${u.telegramId}')" class="px-2 py-1 rounded bg-slate-700 hover:bg-emerald-500 text-white text-xs transition">Цепочка</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('userSearch').oninput = function(e) {
  const q = e.target.value.trim().toLowerCase();
  renderUsersTable(q ? allUsers.filter(u => (u.username || '').toLowerCase().includes(q)) : allUsers);
};

// --- Цепочка рефералов ---
window.showChain = async function(userId) {
  const res = await fetch(`/api/admin/refchain/${userId}`);
  const data = await res.json();
  if (!data.success) {
    showNotification('Ошибка загрузки цепочки', 'error');
    return;
  }
  const chain = data.chain || [];
  document.getElementById('chainModalContent').innerHTML = chain.map((u, i) => `<span class="${i < chain.length-1 ? 'text-emerald-400' : 'text-white'}">${u.username || `User ${u.telegramId}`}</span>${i < chain.length-1 ? '<span class=\"mx-1\">→</span>' : ''}`).join('');
  document.getElementById('chainModal').classList.remove('hidden');
};

window.closeChainModal = function() {
  document.getElementById('chainModal').classList.add('hidden');
};

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
  fetchCodes();
  fetchUsers();
}); 