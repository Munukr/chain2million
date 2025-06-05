const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Можно заменить на .cert(...) если есть ключ
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // databaseURL: 'https://<your-project>.firebaseio.com' // если нужно
  });
}

module.exports = admin; 