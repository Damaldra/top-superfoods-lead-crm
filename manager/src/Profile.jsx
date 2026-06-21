// Особистий кабінет: картка з аватаром-ініціалами, дані користувача та вихід.

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function Profile({ user, loginAt, onLogout }) {
  const u = user || { name: 'Адміністратор', role: 'Менеджер', username: 'admin' };
  const loginLabel = loginAt ? new Date(loginAt).toLocaleString('uk-UA') : '—';

  return (
    <div className="manager">
      <section className="card profile-card">
        <div className="profile-head">
          <div className="avatar">{initials(u.name)}</div>
          <div>
            <h2>{u.name}</h2>
            <p className="muted">{u.role}</p>
          </div>
        </div>

        <dl className="profile-info">
          <div>
            <dt>Логін</dt>
            <dd>{u.username}</dd>
          </div>
          <div>
            <dt>Роль</dt>
            <dd>{u.role}</dd>
          </div>
          <div>
            <dt>Вхід у сесію</dt>
            <dd>{loginLabel}</dd>
          </div>
        </dl>

        <button className="danger" onClick={onLogout}>Вийти</button>
      </section>
    </div>
  );
}
