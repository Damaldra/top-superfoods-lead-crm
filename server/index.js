// Точка входу бекенду: Express-застосунок + mock зовнішньої CRM.

import express from 'express';
import cors from 'cors';
import { leadsRouter } from './leads.js';

const app = express();
app.use(cors());            // дозволяємо запити з фронтенду (інший origin у dev)
app.use(express.json());    // парсимо JSON-тіло запитів

// Health-check — зручно для CI/CD та моніторингу
app.get('/health', (_req, res) => res.json({ ok: true }));

// Корінь — коротка довідка, щоб відкривши API у браузері не побачити "Cannot GET /".
app.get('/', (_req, res) => {
  res.json({
    service: 'TOP Superfoods · Lead API',
    ui: 'http://localhost:5173',
    endpoints: {
      'POST /api/leads': 'прийняти заявку',
      'GET /api/leads/dead-letter': 'черга недоставлених заявок',
      'GET /health': 'health-check',
    },
  });
});

// Бізнес-маршрути
app.use('/api/leads', leadsRouter);

// --- Mock CRM ---------------------------------------------------------------
// Імітує зовнішній сервіс. Навмисно "падає" приблизно у 40% випадків,
// щоб наочно показати роботу retry + dead-letter (див. crm.js).
let crmCounter = 1;
app.post('/mock/crm', (req, res) => {
  if (Math.random() < 0.4) {
    return res.status(503).json({ error: 'CRM temporarily unavailable' });
  }
  res.json({
    crmId: `CRM-${String(crmCounter++).padStart(5, '0')}`,
    received: req.body,
  });
});
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API запущено: http://localhost:${PORT}`));
