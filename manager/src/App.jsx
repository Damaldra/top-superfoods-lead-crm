import { useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken, logout as apiLogout, fetchMe } from './api.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import ManagerPanel from './ManagerPanel.jsx';
import Profile from './Profile.jsx';

const LOGIN_AT_KEY = 'manager_login_at';

// Внутрішня панель менеджера — окремий застосунок (порт 5174),
// дані тягне з того самого API (:4000), що й лендінг.
export default function App() {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const [loginAt, setLoginAt] = useState(localStorage.getItem(LOGIN_AT_KEY));
  const [tab, setTab] = useState('dashboard'); // dashboard | leads | profile

  // Підтягуємо профіль лише при перезавантаженні сторінки з валідним токеном.
  // Після логіну профіль уже покладено в стан у handleLogin — повторно не смикаємо.
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    if (user) return; // профіль уже є (щойно увійшли) — другий запит не потрібен
    fetchMe()
      .then(setUser)
      .catch(() => handleLogout()); // токен протух / невалідний — розлогінюємо
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleLogin(newToken, profile) {
    const at = new Date().toISOString();
    setToken(newToken);
    localStorage.setItem(LOGIN_AT_KEY, at);
    setTokenState(newToken);
    setLoginAt(at);
    setUser(profile);
    setTab('dashboard');
  }

  const handleLogout = useCallback(async () => {
    await apiLogout();
    clearToken();
    localStorage.removeItem(LOGIN_AT_KEY);
    setTokenState(null);
    setUser(null);
    setLoginAt(null);
  }, []);

  // Викликається з дочірніх компонентів, якщо API повернув 401.
  const handleAuthError = useCallback(() => {
    clearToken();
    localStorage.removeItem(LOGIN_AT_KEY);
    setTokenState(null);
    setUser(null);
    setLoginAt(null);
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

  const tabs = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'leads', label: 'Заявки' },
    { id: 'profile', label: 'Профіль' },
  ];

  return (
    <div className="page">
      <header className="hero">
        <h1>Панель менеджера 🗂️</h1>
        <p>TOP Superfoods · заявки та доставка в CRM</p>
      </header>

      <nav className="tabs">
        <div className="tabs-left">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="tab logout" onClick={handleLogout}>Вийти</button>
      </nav>

      <main>
        {tab === 'dashboard' && <Dashboard onAuthError={handleAuthError} />}
        {tab === 'leads' && <ManagerPanel onAuthError={handleAuthError} />}
        {tab === 'profile' && (
          <Profile user={user} loginAt={loginAt} onLogout={handleLogout} />
        )}
      </main>

      <footer className="foot">
        Внутрішня панель (React) · дані з API :4000
      </footer>
    </div>
  );
}
