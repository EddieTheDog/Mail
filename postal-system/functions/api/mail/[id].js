// functions/api/mail/[id].js
// PATCH /api/mail/:id — update status, stamp, notes
// DELETE /api/mail/:id — remove mail item

export async function onRequestPatch({ params, request, env }) {
  const { id } = params;
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const fields = [];
    const vals = [];

    if (body.status !== undefined) {
      fields.push('status = ?'); vals.push(body.status);
      if (body.status === 'eligible') { fields.push('eligible_at = ?'); vals.push(now); }
      if (body.status === 'delivered') { fields.push('delivered_at = ?'); vals.push(now); }
    }
    if (body.stamped !== undefined) { fields.push('stamped = ?'); vals.push(body.stamped ? 1 : 0); }
    if (body.drop_station !== undefined) { fields.push('drop_station = ?'); vals.push(body.drop_station); }
    if (body.notes !== undefined) { fields.push('notes = ?'); vals.push(body.notes); }
    if (body.delivery_round !== undefined) { fields.push('delivery_round = ?'); vals.push(body.delivery_round); }

    if (fields.length === 0) {
      return Response.json({ ok: false, error: 'No fields to update' }, { status: 400 });
    }

    vals.push(id);
    await env.DB.prepare(`UPDATE mail SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();

    // Log action
    const action = body.status === 'delivered' ? 'delivered_to_station' : body.stamped ? 'stamped' : 'updated';
    await env.DB.prepare(
      `INSERT INTO delivery_log (mail_id, action, actor, timestamp) VALUES (?, ?, ?, ?)`
    ).bind(id, action, body.actor || null, now).run();

    const item = await env.DB.prepare('SELECT * FROM mail WHERE id = ?').bind(id).first();
    return Response.json({ ok: true, mail: item });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete({ params, env }) {
  const { id } = params;
  try {
    await env.DB.prepare('DELETE FROM delivery_log WHERE mail_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM mail WHERE id = ?').bind(id).run();
    return Response.json({ ok: true, deleted: id });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
