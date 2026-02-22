/**
 * Optional analytics API for StellarSplit.
 * POST /events — body: { event, ts } (event: group_created | expense_added | group_settled)
 * GET /stats — returns aggregated counts (no PII).
 *
 * Set VITE_ANALYTICS_ENDPOINT to this server's /events URL (e.g. http://localhost:3001/events).
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const EVENTS_FILE = path.join(__dirname, 'events.json');

app.use(cors());
app.use(express.json());

const validEvents = ['group_created', 'expense_added', 'group_settled'];

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, version: '1.0' });
});

// Webhook CORS proxy: forward POST body to WEBHOOK_TARGET (e.g. Discord/Slack). Frontend posts to this API to avoid browser CORS.
app.post('/webhook', async (req, res) => {
  const target = process.env.WEBHOOK_TARGET;
  if (!target) {
    return res.status(503).json({ error: 'WEBHOOK_TARGET not configured' });
  }
  try {
    const f = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const text = await f.text();
    res.status(f.status).send(text || undefined);
  } catch (err) {
    res.status(502).json({ error: 'Webhook forward failed', message: err.message });
  }
});

function readEvents() {
  try {
    const data = fs.readFileSync(EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 0), 'utf8');
}

app.post('/events', (req, res) => {
  const { event, ts } = req.body || {};
  if (!validEvents.includes(event) || typeof ts !== 'number') {
    return res.status(400).json({ error: 'Invalid body: need { event, ts }' });
  }
  const events = readEvents();
  events.push({ event, ts });
  writeEvents(events);
  res.status(204).end();
});

app.get('/stats', (req, res) => {
  const events = readEvents();
  const counts = { group_created: 0, expense_added: 0, group_settled: 0 };
  for (const { event } of events) {
    if (counts[event] !== undefined) counts[event]++;
  }
  res.json(counts);
});

// Dynamic OG image (1200x630 SVG) for group/settle share cards
app.get('/og', (req, res) => {
  const title = (req.query.title || 'StellarSplit').toString().slice(0, 60);
  const subtitle = (req.query.subtitle || 'Split expenses. Settle on Stellar.').toString().slice(0, 80);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#312e81"/>
      <stop offset="100%" style="stop-color:#4c1d95"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="280" font-family="system-ui,Arial" font-size="56" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(title)}</text>
  <text x="600" y="360" font-family="system-ui,Arial" font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="middle">${escapeXml(subtitle)}</text>
  <text x="600" y="520" font-family="system-ui,Arial" font-size="20" fill="rgba(255,255,255,0.6)" text-anchor="middle">stellarsplit.app</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.listen(PORT, () => {
  console.log(`StellarSplit analytics API on http://localhost:${PORT}`);
  console.log('  GET /health — health check');
  console.log('  POST /events — send { event, ts }');
  console.log('  GET /stats  — aggregated counts');
  console.log('  GET /og?title=...&subtitle=... — OG image (SVG 1200x630)');
});
