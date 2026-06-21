import { useState } from 'react';
import { submitLead } from './api.js';

const PRODUCTS = ['Спіруліна', 'Ягоди годжі', 'Насіння чіа', 'Какао-боби', 'Мікс суперфудів'];
const EMPTY = { name: '', email: '', phone: '', product: '', comment: '' };

export default function LeadForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});          // помилки валідації з бекенду (по полях)
  const [status, setStatus] = useState('idle');      // idle | sending | success | error
  const [message, setMessage] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // як тільки користувач редагує поле — прибираємо його помилку
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const res = await submitLead(form);

      if (res.status === 422) {
        // бекенд повернув помилки валідації — показуємо їх під полями
        setErrors(res.errors || {});
        setStatus('idle');
        return;
      }

      setStatus('success');
      setMessage(res.queued ? res.message : `Дякуємо! Заявку прийнято (№ ${res.crmId}).`);
      setForm(EMPTY);
    } catch {
      setStatus('error');
      setMessage('Не вдалося надіслати заявку. Перевірте зʼєднання і спробуйте ще раз.');
    }
  }

  if (status === 'success') {
    return (
      <div className="card success">
        <h2>✅ Готово</h2>
        <p>{message}</p>
        <button onClick={() => setStatus('idle')}>Надіслати ще одну</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Замовити продукт</h2>

      <Field label="Імʼя" error={errors.name}>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Ваше імʼя" />
      </Field>

      <Field label="Email" error={errors.email}>
        <input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@email.com" />
      </Field>

      <Field label="Телефон" error={errors.phone}>
        <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+380..." />
      </Field>

      <Field label="Продукт" error={errors.product}>
        <select value={form.product} onChange={(e) => update('product', e.target.value)}>
          <option value="">— оберіть —</option>
          {PRODUCTS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Field>

      <Field label="Коментар (необовʼязково)">
        <textarea value={form.comment} onChange={(e) => update('comment', e.target.value)} rows={3} />
      </Field>

      {status === 'error' && <p className="error-banner">{message}</p>}

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Надсилаємо…' : 'Надіслати заявку'}
      </button>
    </form>
  );
}

// Маленький презентаційний компонент: підпис + поле + помилка під ним.
function Field({ label, error, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}
