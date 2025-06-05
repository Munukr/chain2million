const adminRoutes = require('./api/admin');
app.use('/api/admin', adminRoutes); 

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user data from Telegram
const user = tg.initDataUnsafe?.user || {};
const userId = user.id;

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

// Initialize user data
async function initializeUser() {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            updateUI(data.user);
        } else {
            showNotification('Ошибка загрузки данных пользователя', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Update UI with user data
function updateUI(userData) {
    // Debug logging
    console.log('User points:', userData.points);
    console.log('Should show withdraw button:', userData.points >= 200);
    
    // Profile section
    profileAvatar.textContent = userData.username?.[0]?.toUpperCase() || 'U';
    profileUsername.textContent = userData.username || `User ${userData.telegramId}`;
    
    // Status
    profileStatus.innerHTML = `<span class="w-2 h-2 rounded-full ${userData.access === 'paid' ? 'bg-emerald-400' : 'bg-red-400'} inline-block"></span> <span class="text-white">${userData.access}</span>`;
    
    // Points
    const points = parseInt(userData.points) || 0;
    userPoints.textContent = points;
    
    // Level
    userLevel.textContent = userData.level || '—';
    
    // Referral link
    const refLink = `https://t.me/${tg.initDataUnsafe?.bot?.username}?start=ref_${userData.telegramId}`;
    referralLink.value = refLink;
    
    // Referral chain
    renderReferralChain(userData);
    
    // Invited users
    renderInvitedUsers(userData.invitedUsers || []);
    
    // Buttons
    upgradeButton.style.display = userData.access === 'free' ? 'flex' : 'none';
    
    // Withdraw button visibility with animation
    if (points >= 200) {
        withdrawButton.style.display = 'flex';
        withdrawButton.style.animation = 'fadeIn 0.3s ease-out';
    } else {
        withdrawButton.style.display = 'none';
    }
    
    // Debug logging for button visibility
    console.log('Withdraw button display:', withdrawButton.style.display);
    console.log('Points value:', points);
    console.log('Points type:', typeof points);
}

// Update referral chain visualization
async function renderReferralChain(userData) {
    let chain = [];
    let current = userData;
    while (current.invitedBy) {
        const res = await fetch(`/api/user/${current.invitedBy}`);
        const inviter = await res.json();
        if (inviter.success) {
            chain.unshift(inviter.user.username || `User ${inviter.user.telegramId}`);
            current = inviter.user;
        } else {
            console.error('Error fetching inviter data:', inviter.error);
            break;
        }
    }
    chain.push(userData.username || `User ${userData.telegramId}`);
    referralChain.innerHTML = chain.map((u, i) => `<span class="${i < chain.length-1 ? 'text-emerald-400' : 'text-white'}">${u}</span>${i < chain.length-1 ? '<span class="mx-1">→</span>' : ''}`).join('');
}

// Update invited users list
function renderInvitedUsers(users) {
    if (!users.length) {
        invitedUsers.innerHTML = '<li class="py-2 text-slate-400">Нет приглашённых</li>';
        return;
    }
    
    invitedUsers.innerHTML = users.map(u => `
        <li class="flex justify-between items-center py-2 hover:bg-slate-700 transition rounded-lg px-2">
            <span class="font-medium text-white">${u.username || `User ${u.telegramId}`}</span>
            <span class="text-xs ${u.access === 'paid' ? 'text-emerald-400' : 'text-red-400'}">${u.access}</span>
            <span class="text-xs text-slate-400">${u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : ''}</span>
        </li>
    `).join('');
}

// Copy referral link
async function copyReferralLink() {
    try {
        await navigator.clipboard.writeText(referralLink.value);
        showNotification('Ссылка скопирована!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showNotification('Ошибка копирования', 'error');
    }
}

// Upgrade to paid access
async function upgradeToPaid() {
    try {
        const response = await fetch('/api/user/upgradeToPaid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateUI(data.user);
            showNotification('Доступ оплачен!', 'success');
        } else {
            showNotification(data.error || 'Ошибка оплаты', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Ошибка оплаты', 'error');
    }
}

// Withdraw points
function withdrawPoints() {
    showNotification('Запрос на вывод отправлен!', 'success');
    // TODO: Implement actual withdrawal logic
}

// Show notification
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

// Initialize app
initializeUser(); 