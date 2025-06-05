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

// Функция для обновления таблицы кодов
async function updateCodesTable() {
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getCodes'
            })
        });

        const data = await response.json();
        if (data.success) {
            const tbody = document.getElementById('codesTableBody');
            tbody.innerHTML = '';

            data.codes.forEach(code => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${code.code}</td>
                    <td class="${code.used ? 'status-used' : 'status-unused'}">
                        ${code.used ? '✅ Использован' : '⏳ Не использован'}
                    </td>
                    <td>${new Date(code.createdAt).toLocaleString()}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error updating codes table:', error);
    }
}

// Функция для установки статуса paid
async function setUserPaid() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'setPaid',
                userId: userId
            })
        });

        const data = await response.json();
        showResult(data);
    } catch (error) {
        showResult(`Error: ${error.message}`);
    }
}

// Функция для получения информации о пользователе
async function getUserInfo() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getUser',
                userId: userId
            })
        });

        const data = await response.json();
        showResult(data);
    } catch (error) {
        showResult(`Error: ${error.message}`);
    }
}

// Функция для генерации бесплатной ссылки
async function generateFreeLink() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'genFreeLink',
                userId: userId
            })
        });

        const data = await response.json();
        showResult(data);
    } catch (error) {
        showResult(`Error: ${error.message}`);
    }
}

// Функция для генерации одноразового кода
async function generateOneTimeCode() {
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'genOneTimeCode'
            })
        });

        const data = await response.json();
        if (data.success) {
            showGeneratedLink(data.code);
            await updateCodesTable(); // Обновляем таблицу после генерации
        } else {
            showResult(`Error: ${data.error}`);
        }
    } catch (error) {
        showResult(`Error: ${error.message}`);
    }
}

// Функция для получения списка пользователей
async function getUsers() {
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getUsers'
            })
        });

        const data = await response.json();
        if (data.success) {
            updateUsersTable(data.users);
        }
    } catch (error) {
        console.error('Error getting users:', error);
    }
}

// Функция для обновления таблицы пользователей
function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(user.createdAt).toLocaleString()}</td>
            <td>${user.userId}</td>
            <td>${user.username || '-'}</td>
            <td>${user.access}</td>
            <td>${user.points}</td>
            <td>${user.invitedByUsername || user.invitedBy}</td>
        `;
        tbody.appendChild(row);
    });
}

// Функция для сортировки пользователей
let sortDirection = 'desc';
async function sortUsers(field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getUsers',
                sortBy: field,
                sortDirection: sortDirection
            })
        });

        const data = await response.json();
        if (data.success) {
            updateUsersTable(data.users);
        }
    } catch (error) {
        console.error('Error sorting users:', error);
    }
}

// Функция для поиска пользователей
let searchTimeout;
function searchUsers() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const searchTerm = document.getElementById('userSearch').value.trim();
        if (searchTerm.length < 2) {
            await getUsers();
            return;
        }

        try {
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'searchUsers',
                    searchTerm: searchTerm
                })
            });

            const data = await response.json();
            if (data.success) {
                updateUsersTable(data.users);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }, 300);
}

// Функция для отображения реферальной цепочки
async function showReferralChain() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getReferralChain',
                userId: userId
            })
        });

        const data = await response.json();
        if (data.success) {
            const chain = data.chain.map(user => 
                `<span>${user.username || user.userId}</span>`
            ).join('<span class="arrow">←</span>');

            showResult(`
                <div class="referral-chain">
                    <strong>Реферальная цепочка:</strong><br>
                    ${chain}
                </div>
            `);
        } else {
            showResult(`Error: ${data.error}`);
        }
    } catch (error) {
        showResult(`Error: ${error.message}`);
    }
}

// Загружаем данные при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateCodesTable();
    getUsers();
}); 