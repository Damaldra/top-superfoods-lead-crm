// Маршрути для роботи із заявками (leads): прийом, перегляд, ретрай dead-letter.

import { Router } from 'express';
import { validateLead } from './validate.js';
import { forwardToCrm } from './crm.js';
import { requireAuth } from './auth.js';
import {
  nextId,
  addLead,
  listLeads,
  updateLead,
  addDeadLetter,
  listDeadLetters,
  takeDeadLetter,
} from './store.js';

export const leadsRouter = Router();

// POST /api/leads — приймаємо заявку з лендінгу
leadsRouter.post('/', async (req, res) => {
  try {
    const { valid, errors, lead } = validateLead(req.body);
    if (!valid) return res.status(422).json({ ok: false, errors });

    const id = nextId();
    const record = { id, ...lead, createdAt: new Date().toISOString() };

    const result = await forwardToCrm(lead);

    if (result.ok) {
      // 201: лід створено в CRM
      addLead({ ...record, status: 'sent', crmId: result.crmId, attempts: result.attempts });
      return res.status(201).json({ ok: true, crmId: result.crmId, attempts: result.attempts });
    }

    // 202: CRM недоступна — фіксуємо лід як 'queued' і кладемо в dead-letter для ретраю.
    // Для користувача це все одно успіх: заявку прийнято, нічого не втрачено.
    addLead({ ...record, status: 'queued', crmId: null, attempts: result.attempts });
    addDeadLetter({ id, lead: record, error: result.error, failedAt: new Date().toISOString() });
    return res.status(202).json({
      ok: true,
      queued: true,
      message: 'Заявку прийнято. Ми звʼяжемося з вами найближчим часом.',
    });
  } catch {
    return res.status(500).json({ ok: false, error: 'Внутрішня помилка' });
  }
});

// GET /api/leads — список усіх прийнятих заявок (для панелі менеджера, захищено)
leadsRouter.get('/', requireAuth, (_req, res) => res.json(listLeads()));

// GET /api/leads/dead-letter — недоставлені заявки (захищено)
leadsRouter.get('/dead-letter', requireAuth, (_req, res) => res.json(listDeadLetters()));

// POST /api/leads/dead-letter/:id/retry — повторна спроба доставки в CRM (захищено)
leadsRouter.post('/dead-letter/:id/retry', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const entry = takeDeadLetter(id);
    if (!entry) return res.status(404).json({ ok: false, error: 'Запис не знайдено' });

    const result = await forwardToCrm(entry.lead);

    if (result.ok) {
      updateLead(id, { status: 'sent', crmId: result.crmId, attempts: result.attempts });
      return res.json({ ok: true, crmId: result.crmId });
    }

    // знову не вийшло — повертаємо запис назад у чергу
    addDeadLetter({ ...entry, error: result.error, failedAt: new Date().toISOString() });
    return res.status(202).json({ ok: false, retried: true, error: result.error });
  } catch {
    return res.status(500).json({ ok: false, error: 'Внутрішня помилка' });
  }
});
