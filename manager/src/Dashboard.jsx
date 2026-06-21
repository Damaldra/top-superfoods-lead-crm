import { useEffect, useState, useCallback } from 'react';
import { fetchStats } from './api.js';

// Дашборд: ряд KPI-карток + розбивка по продуктах (CSS бар-чарт).
export default function Dashboard({ onAuthError }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await fetchStats());
    } catch (err) {
      if (err.name === 'AuthError') onAuthError?.();
      else setError('Не вдалося завантажити дані');
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  // Помилка сервера — показуємо повідомлення з можливістю повторити.
  if (error) {
    return (
      <div className="card">
        <p className="form-error">{error}</p>
        <button className="ghost" onClick={load}>↻ Спробувати ще раз</button>
      </div>
    );
  }

  // Спінер — лише поки реально вантажимо і ще немає даних.
  if (loading || !stats) {
    return (
      <div className="card">
        <p className="muted">Завантаження…</p>
      </div>
    );
  }

  const kpis = [
    { label: 'Всього заявок', value: stats.total ?? 0 },
    { label: 'У CRM', value: stats.sent ?? 0 },
    { label: 'У черзі', value: stats.queued ?? 0 },
    { label: 'Конверсія', value: `${stats.conversion ?? 0}%` },
    { label: 'Сьогодні', value: stats.today ?? 0 },
  ];

  const byProduct = stats.byProduct ?? [];
  const maxCount = Math.max(1, ...byProduct.map((p) => p.count));

  return (
    <div className="manager">
      <div className="kpi-row">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Розбивка по продуктах</h2>
          <button className="ghost" onClick={load}>↻ Оновити</button>
        </div>

        {byProduct.length === 0 ? (
          <p className="muted">Поки що немає даних.</p>
        ) : (
          <ul className="bar-list">
            {byProduct.map((p) => (
              <li key={p.product} className="bar-row">
                <span className="bar-label">{p.product}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${(p.count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="bar-count">{p.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
