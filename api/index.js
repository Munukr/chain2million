const express = require('express');
const path = require('path');
const adminRoutes = require('./admin');
const userRoutes = require('./user');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));

app.use((req, res) => res.status(404).send('Not found'));

module.exports = app; 