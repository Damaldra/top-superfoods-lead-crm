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

// --- Статистика для дашборду ----------------------------------------------
// Рахуємо KPI по всіх заявках: всього, у CRM / у черзі, конверсія, сьогодні,
// розбивка по продуктах, кількість недоставлених.
export function getStats() {
  const total = leads.length;
  const sent = leads.filter((l) => l.status === 'sent').length;
  const queued = leads.filter((l) => l.status === 'queued').length;
  const conversion = total ? Math.round((sent / total) * 100) : 0;

  const todayStr = new Date().toDateString();
  const today = leads.filter((l) => new Date(l.createdAt).toDateString() === todayStr).length;

  // Групуємо по продукту → масив { product, count }, відсортований за спаданням
  const counts = new Map();
  for (const l of leads) {
    counts.set(l.product, (counts.get(l.product) || 0) + 1);
  }
  const byProduct = [...counts.entries()]
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count);

  return { total, sent, queued, conversion, today, byProduct, deadLetterCount: deadLetters.length };
}

// --- Демо-дані -------------------------------------------------------------
// Сервер тримає все у памʼяті й чистить стан при рестарті. Щоб панель/KPI були
// наповнені, засіваємо ~12 різноманітних заявок (різні продукти, статуси, дати).
// Частина потрапляє і в dead-letter, щоб блок ретраю був не порожній.
export function seedDemoData() {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // dOffset — скільки днів тому створено заявку (0 = сьогодні)
  const demo = [
    { name: 'Олена Коваль', email: 'olena.koval@gmail.com', phone: '+380501234567', product: 'Спіруліна', comment: 'Цікавить опт', status: 'sent', dOffset: 0 },
    { name: 'Андрій Мельник', email: 'a.melnyk@ukr.net', phone: '+380671112233', product: 'Ягоди годжі', comment: '', status: 'sent', dOffset: 0 },
    { name: 'Ірина Шевченко', email: 'iryna.sh@gmail.com', phone: '+380931002030', product: 'Насіння чіа', comment: 'Подарунок', status: 'queued', dOffset: 0 },
    { name: 'Дмитро Бондар', email: 'dmytro.bondar@gmail.com', phone: '+380442345678', product: 'Спіруліна', comment: '', status: 'sent', dOffset: 1 },
    { name: 'Марія Ткаченко', email: 'maria.tk@i.ua', phone: '+380505556677', product: 'Какао боби', comment: 'Передзвоніть зранку', status: 'sent', dOffset: 1 },
    { name: 'Сергій Левченко', email: 's.levchenko@gmail.com', phone: '+380638889900', product: 'Ягоди годжі', comment: '', status: 'queued', dOffset: 2 },
    { name: 'Наталія Гриценко', email: 'natali.g@ukr.net', phone: '+380974443322', product: 'Насіння чіа', comment: '', status: 'sent', dOffset: 3 },
    { name: 'Віктор Поліщук', email: 'viktor.p@gmail.com', phone: '+380501119988', product: 'Какао боби', comment: 'Знижка?', status: 'sent', dOffset: 4 },
    { name: 'Тетяна Савченко', email: 'tetiana.s@i.ua', phone: '+380672223344', product: 'Спіруліна', comment: '', status: 'queued', dOffset: 5 },
    { name: 'Олександр Руденко', email: 'o.rudenko@gmail.com', phone: '+380935557788', product: 'Ягоди годжі', comment: 'Для магазину', status: 'sent', dOffset: 6 },
    { name: 'Юлія Лисенко', email: 'yulia.l@ukr.net', phone: '+380506664455', product: 'Насіння чіа', comment: '', status: 'sent', dOffset: 7 },
    { name: 'Богдан Кравець', email: 'bohdan.k@gmail.com', phone: '+380631230099', product: 'Какао боби', comment: 'Оптова ціна', status: 'queued', dOffset: 7 },
  ];

  let crmSeq = 1000;
  for (const d of demo) {
    const id = nextId();
    const createdAt = new Date(now - d.dOffset * day).toISOString();
    const lead = { name: d.name, email: d.email, phone: d.phone, product: d.product, comment: d.comment };
    if (d.status === 'sent') {
      addLead({ id, ...lead, createdAt, status: 'sent', crmId: `CRM-${String(crmSeq++).padStart(5, '0')}`, attempts: 1 });
    } else {
      // 'queued' — заявка не доставлена в CRM, тому дублюємо її у dead-letter
      addLead({ id, ...lead, createdAt, status: 'queued', crmId: null, attempts: 3 });
      addDeadLetter({
        id,
        lead: { id, ...lead, createdAt },
        error: 'CRM responded 503',
        failedAt: createdAt,
      });
    }
  }
}
