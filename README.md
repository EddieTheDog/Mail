# 🏠 House Post — Home Postal System

A station-only home mail management system built on **Cloudflare Pages + D1 + GitHub**.

## Architecture

```
GitHub (source) → GitHub Actions → Cloudflare Pages (frontend + Functions)
                                 → Cloudflare D1 (SQLite database)
```

- **Frontend**: `public/index.html` — served as static asset via Cloudflare Pages
- **API**: `functions/api/` — Cloudflare Pages Functions (Workers runtime)
- **Database**: Cloudflare D1 (SQLite), bound as `DB`

---

## First-Time Setup

### 1. Create D1 Database

```bash
npm install -g wrangler
wrangler login
wrangler d1 create home-postal-system
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "home-postal-system"
database_id = "PASTE_YOUR_ID_HERE"   # ← replace this
```

### 2. Run Migrations

```bash
# Local dev
npm run db:migrate:local

# Remote (production)
npm run db:migrate:remote
```

This creates the `mail`, `stations`, `delivery_rounds`, and `delivery_log` tables and seeds 5 default stations.

### 3. Create Cloudflare Pages Project

```bash
# First deploy (creates the project)
wrangler pages deploy public --project-name home-postal-system
```

Then in the Cloudflare dashboard:
- Go to **Pages → home-postal-system → Settings → Functions → D1 database bindings**
- Add binding: Variable name = `DB`, D1 database = `home-postal-system`

### 4. Push to GitHub

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/home-postal-system.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 5. Add GitHub Secrets

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Where to find it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token (use "Edit Cloudflare Workers" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar on Workers & Pages |

After this, every push to `main` auto-deploys.

---

## Local Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:8788` with local D1 database.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mail` | List all mail (query: `?status=`, `?station=`, `?priority=`) |
| `POST` | `/api/mail` | Accept new mail |
| `PATCH` | `/api/mail/:id` | Update mail (status, stamp, notes) |
| `DELETE` | `/api/mail/:id` | Remove mail item |
| `GET` | `/api/stations` | All stations with live mail counts |
| `GET` | `/api/rounds` | Delivery round history |
| `POST` | `/api/rounds` | Start a new delivery round |
| `POST` | `/api/rounds/:id/complete` | Complete round, mark all eligible as delivered |

---

## Stations (Default)

| ID | Name | Zone |
|----|------|------|
| `office` | Main Office | hub |
| `station-1` | Hallway Station | downstairs |
| `station-2` | Kitchen Station | downstairs |
| `station-3` | Landing Station | upstairs |
| `station-4` | Study Station | upstairs |

---

## Delivery Timing Rules

- **< 5 minutes**: Waiting — not yet eligible
- **5–10 minutes**: Eligible — ready for delivery round
- **10+ minutes**: Urgent — flagged in UI, must be delivered immediately

---

## Customization

**Add residents** — Edit the `<datalist id="residents-list">` in `public/index.html`

**Add/rename rooms** — Edit the `<select id="f-room">` options and the `ROOM_ZONES` map in `functions/_helpers.js`

**Add stations** — Insert rows into the `stations` table via:
```bash
wrangler d1 execute home-postal-system --remote --command="INSERT INTO stations (id, name, zone, description) VALUES ('station-5', 'Porch Station', 'downstairs', 'Front porch')"
```

---

## Gamification — Points

- **+10 pts** per mail item delivered to station
- **+25 pts** bonus for completing a full delivery round
- Points accumulate per session (stored in-memory on client)
