// Маршрути для роботи із заявками (leads): прийом, перегляд, ретрай dead-letter.

import { Router } from 'express';
import { validateLead } from './validate.js';
import { forwardToCrm } from './crm.js';
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
  const { valid, errors, lead } = validateLead(req.body);
  if (!valid) return res.status(422).json({ ok: false, errors });

  const id = nextId();
  const record = { id, ...lead, createdAt: new Date().toISOString() };

  const result = await forwardToCrm(lead);

  if (result.ok) {
    addLead({ ...record, status: 'sent', crmId: result.crmId, attempts: result.attempts });
    return res.status(201).json({ ok: true, crmId: result.crmId, attempts: result.attempts });
  }

  addLead({ ...record, status: 'queued', crmId: null, attempts: result.attempts });
  addDeadLetter({ id, lead: record, error: result.error, failedAt: new Date().toISOString() });
  return res.status(202).json({
    ok: true,
    queued: true,
    message: 'Заявку прийнято. Ми звʼяжемося з вами найближчим часом.',
  });
});

// GET /api/leads — список усіх прийнятих заявок (для панелі менеджера)
leadsRouter.get('/', (_req, res) => res.json(listLeads()));

// GET /api/leads/dead-letter — недоставлені заявки
leadsRouter.get('/dead-letter', (_req, res) => res.json(listDeadLetters()));

// POST /api/leads/dead-letter/:id/retry — повторна спроба доставки в CRM
leadsRouter.post('/dead-letter/:id/retry', async (req, res) => {
  const id = Number(req.params.id);
  const entry = takeDeadLetter(id);
  if (!entry) return res.status(404).json({ ok: false, error: 'Запис не знайдено' });

  const result = await forwardToCrm(entry.lead);

  if (result.ok) {
    updateLead(id, { status: 'sent', crmId: result.crmId, attempts: result.attempts });
    return res.json({ ok: true, crmId: result.crmId });
  }

  addDeadLetter({ ...entry, error: result.error, failedAt: new Date().toISOString() });
  return res.status(202).json({ ok: false, retried: true, error: result.error });
});
