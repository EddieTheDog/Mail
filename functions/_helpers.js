// functions/_helpers.js — shared utilities

export function generateId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MAIL-${ts}-${rand}`;
}

// Room → zone mapping (customize to your house layout)
const ROOM_ZONES = {
  'master-bedroom': 'upstairs',
  'bedroom-2': 'upstairs',
  'bedroom-3': 'upstairs',
  'bathroom-upstairs': 'upstairs',
  'study': 'upstairs',
  'living-room': 'downstairs',
  'kitchen': 'downstairs',
  'dining-room': 'downstairs',
  'garage': 'downstairs',
  'basement': 'downstairs',
  'bathroom-downstairs': 'downstairs',
  'office': 'downstairs',
};

export function getRoomZone(room) {
  return ROOM_ZONES[room] || 'downstairs';
}

export async function assignPriorityNumber(db, zone, priority) {
  const result = await db.prepare(`
    SELECT MAX(priority_number) as max_num FROM mail
    WHERE sort_zone = ? AND priority = ? AND status != 'delivered'
  `).bind(zone, priority).first();
  return (result?.max_num || 0) + 1;
}
