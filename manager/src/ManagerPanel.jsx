import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLeads, fetchDeadLetters, retryDeadLetter } from './api.js';

// Вкладка «Заявки»: таблиця з пошуком, фільтром за статусом, сортуванням,
// експортом CSV + блок dead-letter з ретраєм.
export default function ManagerPanel({ onAuthError }) {
  const [leads, setLeads] = useState([]);
  const [dead, setDead] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(null); // id заявки, яку зараз повторюємо

  // Керування таблицею
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | sent | queued
  const [sort, setSort] = useState('date-desc'); // date-desc | date-asc | id-asc | id-desc

  // Тягнемо обидва списки паралельно
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, d] = await Promise.all([fetchLeads(), fetchDeadLetters()]);
      setLeads(l);
      setDead(d);
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

  async function handleRetry(id) {
    setRetrying(id);
    try {
      await retryDeadLetter(id);
      await load(); // перечитуємо стан після спроби
    } catch (err) {
      if (err.name === 'AuthError') onAuthError?.();
      else setError('Не вдалося завантажити дані');
    } finally {
      setRetrying(null);
    }
  }

  // Пошук + фільтр + сортування на клієнті
  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.name || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'id-asc':
          return a.id - b.id;
        case 'id-desc':
          return b.id - a.id;
        case 'date-desc':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    return rows;
  }, [leads, query, statusFilter, sort]);

  // Експорт поточного відфільтрованого списку у CSV (на клієнті)
  function exportCsv() {
    const headers = ['ID', "Імʼя", 'Email', 'Телефон', 'Продукт', 'Коментар', 'Статус', 'CRM ID', 'Створено'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...visibleLeads.map((l) =>
        [l.id, l.name, l.email, l.phone, l.product, l.comment, l.status, l.crmId || '', l.createdAt]
          .map(esc)
          .join(',')
      ),
    ];
    // BOM, щоб Excel коректно показав кирилицю
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Помилка сервера — окреме повідомлення, щоб не плутати «порожньо» і «помилка».
  if (error) {
    return (
      <div className="card">
        <p className="form-error">{error}</p>
        <button className="ghost" onClick={load}>↻ Спробувати ще раз</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Завантаження…</p>
      </div>
    );
  }

  return (
    <div className="manager">
      <section className="card">
        <div className="card-head">
          <h2>
            Заявки <span className="badge">{visibleLeads.length}</span>
          </h2>
          <div className="toolbar-actions">
            <button className="ghost" onClick={exportCsv} disabled={visibleLeads.length === 0}>
              ⤓ Експорт CSV
            </button>
            <button className="ghost" onClick={load}>
              ↻ Оновити
            </button>
          </div>
        </div>

        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Пошук: імʼя, email, телефон…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Фільтр за статусом"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Всі статуси</option>
            <option value="sent">У CRM</option>
            <option value="queued">У черзі</option>
          </select>
          <select aria-label="Сортування" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date-desc">Дата ↓ (нові)</option>
            <option value="date-asc">Дата ↑ (старі)</option>
            <option value="id-asc">ID ↑</option>
            <option value="id-desc">ID ↓</option>
          </select>
        </div>

        {visibleLeads.length === 0 ? (
          <p className="muted">Нічого не знайдено за вибраними умовами.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Імʼя</th>
                <th>Контакт</th>
                <th>Продукт</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{l.name}</td>
                  <td>
                    {l.email}
                    <br />
                    <span className="muted">{l.phone}</span>
                  </td>
                  <td>{l.product}</td>
                  <td>
                    {l.status === 'sent' ? (
                      <span className="pill ok">CRM ✓ {l.crmId || '—'}</span>
                    ) : (
                      <span className="pill warn">у черзі</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {dead.length > 0 && (
        <section className="card">
          <h2>
            Недоставлені (dead-letter) <span className="badge warn">{dead.length}</span>
          </h2>
          <p className="muted">CRM була недоступна. Можна повторити доставку вручну.</p>
          <ul className="dl-list">
            {dead.map((d) => (
              <li key={d.id}>
                <div>
                  <strong>
                    #{d.id} {d.lead.name}
                  </strong>{' '}
                  — {d.lead.product}
                  <br />
                  <span className="muted">{d.error}</span>
                </div>
                <button onClick={() => handleRetry(d.id)} disabled={retrying === d.id}>
                  {retrying === d.id ? 'Повтор…' : '↻ Повторити'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
