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
            showResult({
                message: 'Одноразовый код успешно создан',
                code: data.code,
                link: `/start free_${data.code}`
            });
        } else {
            showResult(`Error: ${data.error}`);
        }
    } catch (error) {
        showResult(`Error: ${error.message}`);
    }
} 