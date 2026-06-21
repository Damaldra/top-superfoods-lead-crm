# Lead → CRM · Full-Stack демо-кейс

Невеликий, але «дорослий» full-stack застосунок: лендінг-форма заявки на продукт
→ REST API → доставка ліда у зовнішню CRM через **webhook** з **retry** та
**dead-letter** чергою (жоден лід не губиться, навіть якщо CRM лежить).

> Кейс зроблено під реальний сценарій e-commerce/харчового бізнесу: зібрати заявку
> з сайту і надійно довести її до CRM/менеджера.

## 🧱 Стек

| Шар | Технології |
|-----|-----------|
| Frontend | Два окремі React 18 + Vite застосунки (лендінг і панель), нативний `fetch`, без UI-бібліотек |
| Backend | Node.js, Express, ESM — спільний API для обох застосунків |
| Інтеграція | REST API + webhook у CRM, retry з експоненційним backoff, dead-letter |

## 🗺️ Архітектура

Два окремі фронтенди на різних портах звертаються до **одного** backend API:

```
 Лендінг (порт 5173)                     Панель менеджера (порт 5174)
  публічний сайт із формою                внутрішня адмінка
    │  заповнює форму (React)                │  переглядає заявки + dead-letter
    ▼                                        ▼
 POST /api/leads ──►  Express API (:4000)  ◄── GET /api/leads, GET /api/leads/dead-letter
                       │  1. validate.js   (валідація полів → 422)            │
                       │  2. crm.js        (forwardToCrm)                     │
                       │        ├─ webhook POST у CRM                         │
                       │        ├─ якщо збій → retry x3 (backoff)             │
                       │        └─ якщо всі провалились → dead-letter ◄───────┘
                       ▼                                  ▲  POST .../:id/retry
            201 створено │ 202 у черзі │ 422 помилки      └─ ручний повтор доставки
```

Двосторонній потік даних: лендінг **надсилає** заявку, панель менеджера **бачить** її статус
(`CRM ✓` або `у черзі`) і може **повторити** доставку недоставлених лідів вручну.

Ендпоінти API:
- `POST /api/leads` — прийняти заявку → `201` (у CRM) / `202` (у черзі) / `422` (помилки валідації). **Публічний** (лендінг);
- `POST /api/auth/login` — вхід у панель (`admin` / `admin`) → токен; `POST /api/auth/logout`;
- `GET /api/me` — профіль поточного користувача *(захищено)*;
- `GET /api/stats` — KPI для дашборду: total / sent / queued / конверсія / сьогодні / byProduct *(захищено)*;
- `GET /api/leads` — список усіх заявок зі статусом *(захищено)*;
- `GET /api/leads/dead-letter` — недоставлені заявки *(захищено)*;
- `POST /api/leads/dead-letter/:id/retry` — ручний повтор доставки в CRM *(захищено)*.

> Manager-ендпоінти захищені middleware `requireAuth` (Bearer-токен). Приймання заявок з лендінгу лишається публічним.

## ▶️ Як запустити

Потрібен Node.js 18+ (для вбудованого `fetch`). **Три термінали:**

**1. Backend (API)**
```bash
cd server
npm install
npm run dev        # http://localhost:4000
```

**2. Лендінг (форма заявки)**
```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

**3. Панель менеджера**
```bash
cd manager
npm install
npm run dev        # http://localhost:5174
```

- **http://localhost:5173** — заповнити форму, надіслати заявку;
- **http://localhost:5174** — панель менеджера, вхід **`admin` / `admin`**: дашборд (KPI), заявки (пошук/фільтр/сортування/CSV), повтор доставки, особистий кабінет.

> Backend засіває демо-дані при старті (~12 заявок різних продуктів і статусів), щоб дашборд і таблиця були наповнені одразу.

> Вбудований **mock CRM** (`/mock/crm`) навмисно «падає» приблизно у 40% запитів —
> щоб наочно показати роботу retry та dead-letter. Надішліть кілька заявок поспіль і
> подивіться лог сервера. Реальну CRM можна підключити через `CRM_WEBHOOK_URL`
> (див. `server/.env.example`).

### Перевірити dead-letter
```bash
curl http://localhost:4000/api/leads/dead-letter
```

## 🧩 Структура

```
server/                # Backend API (:4000) — спільний для обох фронтендів
  index.js             # Express app + mock CRM + /api/me, /api/stats
  auth.js              # login/logout (admin/admin) + middleware requireAuth
  leads.js             # POST /api/leads (публічний) + захищені GET / retry
  validate.js          # валідація без залежностей
  crm.js               # доставка у CRM: retry + backoff
  store.js             # in-memory сховище + getStats() + seedDemoData()

client/                # Лендінг (:5173) — публічний застосунок із формою
  src/
    App.jsx
    LeadForm.jsx       # форма зі станами idle/sending/success/error
    api.js             # submitLead()
    styles.css

manager/               # Панель менеджера (:5174) — внутрішня адмінка (вхід admin/admin)
  src/
    App.jsx            # авторизація, вкладки Дашборд / Заявки / Профіль
    Login.jsx          # екран входу
    Dashboard.jsx      # KPI-картки + розбивка по продуктах
    ManagerPanel.jsx   # таблиця: пошук / фільтр / сортування / CSV + dead-letter retry
    Profile.jsx        # особистий кабінет (профіль, сесія, вихід)
    api.js             # authFetch (Bearer) + login / fetchStats / fetchLeads / retry
    styles.css
```

## 💡 Що демонструє кейс (мапінг на вакансію)

- **Frontend за ТЗ**: кілька сторінок (лендінг + панель), React-компоненти, керування станом, рендер списків/таблиць, валідація, стани завантаження/помилки.
- **Backend-інтеграції**: REST API, webhook, повний потік даних в обидва боки (надсилання + перегляд + ретрай).
- **Надійність інтеграцій**: retry/backoff і dead-letter — типова проблема роботи з CRM/ERP/платіжками.
- **Чистий, читабельний код**: можу пояснити призначення кожного рядка (у т.ч. згенерованого AI-інструментами).

## 🚀 Куди розвивати далі

- Авторизація службового ендпоінта dead-letter + ретрай-воркер, який дочищає чергу.
- Збереження лідів у БД (PostgreSQL) замість in-memory лічильника.
- Підключення реальної CRM (KeyCRM/HubSpot/n8n-вебхук) через `CRM_WEBHOOK_URL`.
- Тести (Vitest для API, React Testing Library для форми) і CI на GitHub Actions.
