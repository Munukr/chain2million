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
            showNotification('Error loading user data', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error loading user data', 'error');
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
    profileStatus.className = `profile-status ${userData.access === 'paid' ? 'status-paid' : 'status-free'}`;
    profileStatus.innerHTML = userData.access === 'paid' ? '🟢 Paid' : '🔴 Free';
    
    // Points
    userPoints.textContent = userData.points || 0;
    
    // Referral link
    const refLink = `https://t.me/${tg.initDataUnsafe?.bot?.username}?start=ref_${userData.telegramId}`;
    referralLink.value = refLink;
    
    // Referral chain
    updateReferralChain(userData);
    
    // Invited users
    updateInvitedUsers(userData.invitedUsers || []);
    
    // Buttons
    upgradeButton.style.display = userData.access === 'free' ? 'inline-flex' : 'none';
    withdrawButton.style.display = (userData.points >= 200) ? 'inline-flex' : 'none';
    
    // Debug logging for button visibility
    console.log('Withdraw button display:', withdrawButton.style.display);
}

// Update referral chain visualization
function updateReferralChain(userData) {
    if (!userData.invitedBy) return;
    
    const chain = [];
    let currentUser = userData;
    
    while (currentUser.invitedBy) {
        chain.unshift({
            id: currentUser.telegramId,
            username: currentUser.username
        });
        // In a real app, you would fetch the inviter's data here
        currentUser = { telegramId: currentUser.invitedBy };
    }
    
    // Add the current user
    chain.push({
        id: userData.telegramId,
        username: userData.username
    });
    
    // Render chain
    referralChain.innerHTML = chain.map((user, index) => `
        <div class="chain-item">
            ${user.username || `User ${user.id}`}
            ${index < chain.length - 1 ? '<span class="chain-arrow">←</span>' : ''}
        </div>
    `).join('');
}

// Update invited users list
function updateInvitedUsers(users) {
    if (!users.length) {
        invitedUsers.innerHTML = '<li class="user-item">No invited users yet</li>';
        return;
    }
    
    invitedUsers.innerHTML = users.map(user => `
        <li class="user-item">
            <div>
                <strong>${user.username || `User ${user.telegramId}`}</strong>
                <div class="profile-status ${user.access === 'paid' ? 'status-paid' : 'status-free'}">
                    ${user.access === 'paid' ? '🟢 Paid' : '🔴 Free'}
                </div>
            </div>
            <div>
                ${new Date(user.registeredAt).toLocaleDateString()}
            </div>
        </li>
    `).join('');
}

// Copy referral link
async function copyReferralLink() {
    try {
        // Try using modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(referralLink.value);
        } else {
            // Fallback for older browsers
            referralLink.select();
            document.execCommand('copy');
        }
        showNotification('Скопировано!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showNotification('Ошибка при копировании', 'error');
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
            showNotification('Successfully upgraded to paid access!', 'success');
        } else {
            showNotification(data.error || 'Error upgrading access', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error upgrading access', 'error');
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
        text: message,
        duration: 3000,
        gravity: "bottom",
        position: "right",
        className: type,
        stopOnFocus: true
    }).showToast();
}

// Initialize app
initializeUser(); 