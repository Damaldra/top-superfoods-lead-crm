import { useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken, logout as apiLogout, fetchMe } from './api.js';
import Login from './Login.jsx';
import ManagerPanel from './ManagerPanel.jsx';

// Внутрішня панель менеджера (порт 5174). Доступ — лише після входу (admin/admin).
export default function App() {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);

  // Підтягуємо профіль при перезавантаженні з валідним токеном.
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    if (user) return; // профіль уже є (щойно увійшли)
    fetchMe()
      .then(setUser)
      .catch(() => handleLogout()); // токен невалідний — розлогінюємо
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleLogin(newToken, profile) {
    setToken(newToken);
    setTokenState(newToken);
    setUser(profile);
  }

  const handleLogout = useCallback(async () => {
    await apiLogout();
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  // Не залогінені — показуємо екран входу.
  if (!token) {
    return (
      <div className="page">
        <header className="hero">
          <h1>Панель менеджера 🗂️</h1>
          <p>TOP Superfoods · заявки та доставка в CRM</p>
        </header>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Панель менеджера 🗂️</h1>
        <p>TOP Superfoods · заявки та доставка в CRM</p>
      </header>

      <nav className="tabs">
        <div className="tabs-left">{user && <span className="muted">Вітаємо, {user.name}</span>}</div>
        <button className="tab logout" onClick={handleLogout}>
          Вийти
        </button>
      </nav>

      <main>
        <ManagerPanel />
      </main>

      <footer className="foot">Внутрішня панель (React) · дані з API :4000</footer>
    </div>
  );
}
