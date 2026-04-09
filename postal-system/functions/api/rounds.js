// functions/api/rounds.js
// GET /api/rounds — list delivery rounds
// POST /api/rounds — start a new round
// POST /api/rounds/:id/complete — complete a round

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM delivery_rounds ORDER BY started_at DESC LIMIT 20'
    ).all();
    return Response.json({ ok: true, rounds: results });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const now = new Date().toISOString();

    // Count eligible mail
    const { count } = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM mail WHERE status = 'eligible'`
    ).first();

    const result = await env.DB.prepare(
      `INSERT INTO delivery_rounds (started_at, mail_count) VALUES (?, ?)`
    ).bind(now, count || 0).run();

    const round = await env.DB.prepare(
      'SELECT * FROM delivery_rounds WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return Response.json({ ok: true, round }, { status: 201 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
