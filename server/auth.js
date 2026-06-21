// Проста авторизація для панелі менеджера (демо).
// Логін/пароль захардкоджені (admin/admin), токен — випадкова рядкова стрічка
// у памʼяті. У проді тут був би JWT + БД користувачів; для кейсу достатньо Set.

import { randomUUID } from 'crypto';
import { Router } from 'express';

// Захардкоджені облікові дані (демо)
const ADMIN = { username: 'admin', password: 'admin' };

// Профіль "користувача" — повертаємо на /api/me
const ADMIN_PROFILE = { username: 'admin', role: 'Менеджер', name: 'Адміністратор' };

// Активні токени тримаємо у памʼяті. Logout / рестарт сервера їх скидає.
const validTokens = new Set();

export const authRouter = Router();

// POST /api/auth/login — видаємо токен, якщо admin/admin
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (username === ADMIN.username && password === ADMIN.password) {
    const token = randomUUID();
    validTokens.add(token);
    return res.json({ ok: true, token, user: ADMIN_PROFILE });
  }
  return res.status(401).json({ ok: false, error: 'Невірний логін або пароль' });
});

// POST /api/auth/logout — інвалідовуємо поточний токен
authRouter.post('/logout', (req, res) => {
  const token = extractToken(req);
  if (token) validTokens.delete(token);
  res.json({ ok: true });
});

// Дістаємо токен із заголовка "Authorization: Bearer <token>".
// Стійко до зайвих пробілів і регістру схеми (Bearer / bearer / BEARER).
function extractToken(req) {
  const header = (req.headers.authorization || '').trim();
  const [scheme, token] = header.split(/\s+/);
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

// Middleware: пускає далі лише з валідним токеном, інакше 401.
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (token && validTokens.has(token)) return next();
  return res.status(401).json({ ok: false, error: 'Потрібна авторизація' });
}

// Профіль поточного користувача (для /api/me)
export function currentUser() {
  return ADMIN_PROFILE;
}
