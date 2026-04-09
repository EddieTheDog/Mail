// functions/api/mail.js
// GET /api/mail — list all mail (with optional filters)
// POST /api/mail — create new mail item

import { generateId, assignPriorityNumber, getRoomZone } from '../_helpers.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const station = url.searchParams.get('station');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');

  let query = 'SELECT * FROM mail WHERE 1=1';
  const params = [];

  if (station) { query += ' AND drop_station = ?'; params.push(station); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }

  query += ' ORDER BY priority ASC, priority_number ASC, created_at ASC';

  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Auto-flag eligible mail (5 min passed, not yet delivered)
    const now = Date.now();
    const updated = [];
    for (const item of results) {
      const age = now - new Date(item.created_at).getTime();
      if (item.status === 'waiting' && age >= 5 * 60 * 1000) {
        await env.DB.prepare(
          `UPDATE mail SET status = 'eligible', eligible_at = ? WHERE id = ?`
        ).bind(new Date().toISOString(), item.id).run();
        item.status = 'eligible';
        item.eligible_at = new Date().toISOString();
        updated.push(item.id);
      }
      // Flag urgent: over 10 min
      item.urgent = item.status !== 'delivered' && age >= 10 * 60 * 1000;
      item.age_minutes = Math.floor(age / 60000);
    }

    return Response.json({ ok: true, mail: results, auto_updated: updated });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { recipient_name, room, priority, drop_station, notes } = body;

    if (!recipient_name || !room || !priority || !drop_station) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const id = generateId();
    const now = new Date().toISOString();
    const sort_zone = getRoomZone(room);
    const priority_number = await assignPriorityNumber(env.DB, sort_zone, priority);

    await env.DB.prepare(`
      INSERT INTO mail (id, recipient_name, room, priority, drop_station, notes, sort_zone, priority_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, recipient_name, room, priority, drop_station, notes || null, sort_zone, priority_number, now).run();

    // Log it
    await env.DB.prepare(`
      INSERT INTO delivery_log (mail_id, action, timestamp) VALUES (?, 'created', ?)
    `).bind(id, now).run();

    const item = await env.DB.prepare('SELECT * FROM mail WHERE id = ?').bind(id).first();
    return Response.json({ ok: true, mail: item }, { status: 201 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
