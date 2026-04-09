// functions/api/rounds/[id]/complete.js
// POST /api/rounds/:id/complete

export async function onRequestPost({ params, request, env }) {
  const { id } = params;
  try {
    const now = new Date().toISOString();
    const body = await request.json().catch(() => ({}));

    // Mark all eligible mail as delivered in this round
    const { results: eligibleMail } = await env.DB.prepare(
      `SELECT id FROM mail WHERE status = 'eligible'`
    ).all();

    for (const m of eligibleMail) {
      await env.DB.prepare(
        `UPDATE mail SET status = 'delivered', delivered_at = ?, delivery_round = ? WHERE id = ?`
      ).bind(now, id, m.id).run();
      await env.DB.prepare(
        `INSERT INTO delivery_log (mail_id, round_id, action, actor, timestamp) VALUES (?, ?, 'delivered_to_station', ?, ?)`
      ).bind(m.id, id, body.actor || null, now).run();
    }

    const delivered = eligibleMail.length;
    // Points: 10 per item + 25 bonus if all cleared in one round
    const points = delivered * 10 + (delivered > 0 ? 25 : 0);

    await env.DB.prepare(
      `UPDATE delivery_rounds SET completed_at = ?, mail_count = ?, points_earned = ?, notes = ? WHERE id = ?`
    ).bind(now, delivered, points, body.notes || null, id).run();

    const round = await env.DB.prepare('SELECT * FROM delivery_rounds WHERE id = ?').bind(id).first();
    return Response.json({ ok: true, round, delivered, points });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
