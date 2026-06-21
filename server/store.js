// In-memory сховище для демо: прийняті заявки + черга недоставлених (dead-letter).
// У проді тут була б БД (PostgreSQL) і реальна черга; для кейсу достатньо памʼяті —
// зате код простий і кожен рядок зрозумілий.

let seq = 0;
export function nextId() {
  return ++seq;
}

// --- Прийняті заявки -------------------------------------------------------
const leads = [];

export function addLead(record) {
  leads.unshift(record); // нові — зверху
  return record;
}

export function listLeads() {
  return leads;
}

export function updateLead(id, patch) {
  const lead = leads.find((l) => l.id === id);
  if (lead) Object.assign(lead, patch);
  return lead;
}

// --- Dead-letter (не доставлені в CRM, потребують ретраю) -------------------
const deadLetters = [];

export function addDeadLetter(entry) {
  deadLetters.unshift(entry);
  return entry;
}

export function listDeadLetters() {
  return deadLetters;
}

// Дістаємо запис із черги (і видаляємо його) — щоб спробувати доставити ще раз.
export function takeDeadLetter(id) {
  const i = deadLetters.findIndex((d) => d.id === id);
  return i >= 0 ? deadLetters.splice(i, 1)[0] : null;
}
