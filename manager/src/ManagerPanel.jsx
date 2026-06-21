import { useEffect, useState, useCallback } from 'react';
import { fetchLeads, fetchDeadLetters, retryDeadLetter } from './api.js';

export default function ManagerPanel() {
  const [leads, setLeads] = useState([]);
  const [dead, setDead] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null); // id заявки, яку зараз повторюємо

  // Тягнемо обидва списки паралельно
  const load = useCallback(async () => {
    setLoading(true);
    const [l, d] = await Promise.all([fetchLeads(), fetchDeadLetters()]);
    setLeads(l);
    setDead(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRetry(id) {
    setRetrying(id);
    await retryDeadLetter(id);
    await load(); // перечитуємо стан після спроби
    setRetrying(null);
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
            Заявки <span className="badge">{leads.length}</span>
          </h2>
          <button className="ghost" onClick={load}>
            ↻ Оновити
          </button>
        </div>

        {leads.length === 0 ? (
          <p className="muted">Поки що порожньо. Залиште заявку на лендінгу (порт 5173).</p>
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
              {leads.map((l) => (
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
                      <span className="pill ok">CRM ✓ {l.crmId}</span>
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
