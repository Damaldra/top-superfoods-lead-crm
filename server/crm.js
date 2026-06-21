// Доставка ліда у зовнішню CRM через webhook.
// Зовнішній сервіс може бути недоступним, тому повторюємо запит з
// експоненційною затримкою (retry/backoff). Рішення, що робити при остаточному
// збої (dead-letter), приймає викликач (leads.js) — тут лише транспорт.

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function forwardToCrm(lead) {
  const url = process.env.CRM_WEBHOOK_URL || 'http://localhost:4000/mock/crm';
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });

      if (!res.ok) throw new Error(`CRM responded ${res.status}`);

      const data = await res.json();
      return { ok: true, attempts: attempt, crmId: data.crmId };
    } catch (err) {
      lastError = err;
      // backoff: 300мс, 600мс — даємо CRM шанс відновитись
      if (attempt < MAX_ATTEMPTS) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  return { ok: false, attempts: MAX_ATTEMPTS, error: String(lastError?.message ?? lastError) };
}
