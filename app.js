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
    const points = parseInt(userData.points) || 0;
    userPoints.textContent = points;
    
    // Referral link
    const refLink = `https://t.me/${tg.initDataUnsafe?.bot?.username}?start=ref_${userData.telegramId}`;
    referralLink.value = refLink;
    
    // Referral chain
    updateReferralChain(userData);
    
    // Invited users
    updateInvitedUsers(userData.invitedUsers || []);
    
    // Buttons
    upgradeButton.style.display = userData.access === 'free' ? 'inline-flex' : 'none';
    
    // Withdraw button visibility with animation
    if (points >= 200) {
        withdrawButton.style.display = 'inline-flex';
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
async function updateReferralChain(userData) {
    if (!userData.invitedBy) return;
    
    try {
        const chain = [];
        let currentUser = userData;
        
        // Fetch inviter's data
        while (currentUser.invitedBy) {
            const inviterResponse = await fetch(`/api/user/${currentUser.invitedBy}`);
            const inviterData = await inviterResponse.json();
            
            if (inviterData.success) {
                chain.unshift({
                    id: inviterData.user.telegramId,
                    username: inviterData.user.username || `User ${inviterData.user.telegramId}`
                });
                currentUser = inviterData.user;
            } else {
                console.error('Error fetching inviter data:', inviterData.error);
                break;
            }
        }
        
        // Add the current user
        chain.push({
            id: userData.telegramId,
            username: userData.username || `User ${userData.telegramId}`
        });
        
        // Render chain with loading state
        referralChain.innerHTML = chain.map((user, index) => `
            <div class="chain-item" style="opacity: 0; animation: fadeIn 0.3s ease-out forwards ${index * 0.1}s">
                <span class="username">${user.username}</span>
                ${index < chain.length - 1 ? '<span class="chain-arrow">←</span>' : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error updating referral chain:', error);
        referralChain.innerHTML = '<div class="chain-item">Error loading referral chain</div>';
    }
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