import { useState } from 'react';
import { login } from './api.js';

// Екран входу. Після успіху віддаємо токен і профіль наверх (App).
export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await login(username.trim(), password);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Помилка входу');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h2>Вхід до панелі</h2>
        <p className="muted">Внутрішня панель менеджера TOP Superfoods.</p>

        <label className="field">
          <span>Логін</span>
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="admin"
          />
        </label>

        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="admin"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Вхід…' : 'Увійти'}
        </button>

        <p className="muted login-hint">Підказка для демо: <strong>admin</strong> / <strong>admin</strong></p>
      </form>
    </div>
  );
}
