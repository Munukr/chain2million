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
const notification = document.getElementById('notification');

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
    profileUsername.textContent = userData.username || 'User';
    
    // Status
    profileStatus.textContent = userData.access;
    
    // Points
    const points = parseInt(userData.points) || 0;
    userPoints.textContent = points;
    
    // Level
    userLevel.textContent = userData.level || '—';
    
    // Referral link
    const refLink = `https://t.me/chain2million_bot?start=ref_${userData.username}`;
    referralLink.value = refLink;
    
    // Referral chain
    renderReferralChain(userData);
    
    // Invited users
    renderInvitedUsers(userData.invitedUsers || []);
    
    // Buttons
    withdrawButton.style.display = points >= 200 ? 'inline-flex' : 'none';
    upgradeButton.style.display = userData.access === 'free' ? 'inline-flex' : 'none';
    
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
        invitedUsers.innerHTML = '<li class="invited-item" style="color:#64748b;">Пока никого</li>';
        return;
    }
    
    invitedUsers.innerHTML = users.map(u => `<li class="invited-item">${u.username || `User ${u.telegramId}`}</li>`).join('');
}

// Copy referral link
window.copyReferralLink = function() {
    referralLink.select();
    document.execCommand('copy');
    showNotification('Ссылка скопирована!');
};

// Withdraw points
function withdrawPoints() {
    showNotification('Запрос на вывод отправлен!');
    // TODO: Implement actual withdrawal logic
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

// Show notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 2200);
}

// Initialize app
initializeUser(); 