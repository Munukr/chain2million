import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import adminRoutes from './api/admin.js';
import userRoutes from './api/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

app.use((req, res) => res.status(404).send('Not found'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); 