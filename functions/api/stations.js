// functions/api/stations.js
// GET /api/stations — all stations with current mail counts

export async function onRequestGet({ env }) {
  try {
    const { results: stations } = await env.DB.prepare('SELECT * FROM stations ORDER BY zone, name').all();

    // Attach live mail counts per station
    for (const station of stations) {
      const counts = await env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status != 'delivered' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN priority = 'A' AND status != 'delivered' THEN 1 ELSE 0 END) as pile_a,
          SUM(CASE WHEN priority = 'B' AND status != 'delivered' THEN 1 ELSE 0 END) as pile_b,
          SUM(CASE WHEN status = 'eligible' THEN 1 ELSE 0 END) as eligible,
          SUM(CASE WHEN status = 'waiting' AND (julianday('now') - julianday(created_at)) * 24 * 60 >= 10 THEN 1 ELSE 0 END) as urgent
        FROM mail WHERE drop_station = ?
      `).bind(station.id).first();
      station.counts = counts;
    }

    return Response.json({ ok: true, stations });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
