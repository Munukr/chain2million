const express = require('express');
const path = require('path');
const adminRoutes = require('./admin');
const userRoutes = require('./user');
const bot = require('../bot');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Webhook endpoint for Telegram
app.post('/api/bot', async (req, res) => {
  try {
    console.log('[Webhook] update received');
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    console.error('Ошибка в обработке /api/bot:', e);
    res.sendStatus(500);
  }
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));

app.get('/api/user/:id', async (req, res) => {
  console.log('GET /api/user/:id - запрос получен, id:', req.params.id);
  // ... existing code ...
});

app.get('/api/admin/users', async (req, res) => {
  console.log('GET /api/admin/users - запрос получен');
  // ... existing code ...
});

app.use((req, res) => res.status(404).send('Not found'));

module.exports = app; 