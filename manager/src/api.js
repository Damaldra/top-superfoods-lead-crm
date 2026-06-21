// Клієнт до REST API для панелі менеджера.
// Токен зберігаємо в localStorage; Authorization-заголовок додаємо централізовано тут.

const TOKEN_KEY = 'manager_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Помилка авторизації — щоб App міг розлогінити користувача при 401.
export class AuthError extends Error {
  constructor(message = 'Потрібна авторизація') {
    super(message);
    this.name = 'AuthError';
  }
}

// Обгортка над fetch: підставляє Bearer-токен і кидає AuthError на 401.
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new AuthError();
  }
  return res;
}

// --- Авторизація -----------------------------------------------------------

// Логін: повертає { ok, token, user } або кидає помилку з текстом для UI.
export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Помилка входу');
  return data;
}

export async function logout() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // навіть якщо запит не вдався — токен усе одно чистимо нижче
  }
  clearToken();
}

// --- Дані панелі -----------------------------------------------------------

// Повертає профіль користувача. Бекенд віддає { ok, user } — як і логін.
export async function fetchMe() {
  const res = await authFetch('/api/me');
  const data = await res.json();
  return data.user;
}

export async function fetchStats() {
  const res = await authFetch('/api/stats');
  return res.json();
}

export async function fetchLeads() {
  const res = await authFetch('/api/leads');
  return res.json();
}

export async function fetchDeadLetters() {
  const res = await authFetch('/api/leads/dead-letter');
  return res.json();
}

export async function retryDeadLetter(id) {
  const res = await authFetch(`/api/leads/dead-letter/${id}/retry`, { method: 'POST' });
  return res.json();
}
