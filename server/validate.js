// Валідація заявки без зовнішніх залежностей — щоб розуміти кожен рядок коду.
// Повертаємо і помилки (для відповіді клієнту), і "очищений" lead (trim).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s()-]{7,}$/;

export function validateLead(body = {}) {
  const errors = {};

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const product = String(body.product ?? '').trim();
  const comment = String(body.comment ?? '').trim();

  if (name.length < 2) errors.name = 'Вкажіть імʼя (мін. 2 символи)';
  if (!EMAIL_RE.test(email)) errors.email = 'Невірний формат email';
  if (!PHONE_RE.test(phone)) errors.phone = 'Невірний номер телефону';
  if (!product) errors.product = 'Оберіть продукт';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    lead: { name, email, phone, product, comment },
  };
}
