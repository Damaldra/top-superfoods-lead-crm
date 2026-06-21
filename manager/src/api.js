// Клієнт до REST API для панелі менеджера (читання + ретрай).

export async function fetchLeads() {
  const res = await fetch('/api/leads');
  return res.json();
}

export async function fetchDeadLetters() {
  const res = await fetch('/api/leads/dead-letter');
  return res.json();
}

export async function retryDeadLetter(id) {
  const res = await fetch(`/api/leads/dead-letter/${id}/retry`, { method: 'POST' });
  return res.json();
}
