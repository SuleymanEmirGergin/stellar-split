# StellarSplit Analytics API (optional)

Minimal backend to collect anonymous events from the frontend when `VITE_ANALYTICS_ENDPOINT` is set.

## Endpoints

- **GET /health** — Health check. Returns `200` and `{ ok: true, version: "1.0" }`.
- **POST /webhook** — CORS proxy: forwards request body to `WEBHOOK_TARGET` (e.g. Discord/Slack incoming webhook URL). Set `WEBHOOK_TARGET` in env; if unset, returns 503. Frontend can POST to this API URL instead of calling Discord/Slack directly to avoid browser CORS.
- **POST /events** — Body: `{ "event": "group_created" | "expense_added" | "group_settled", "ts": 1234567890 }`. Returns 204.
- **GET /stats** — Returns `{ group_created, expense_added, group_settled }` counts.
- **GET /og?title=...&subtitle=...** — Dynamic OG image (SVG 1200×630) for share cards. When `VITE_ANALYTICS_ENDPOINT` points to this server’s `/events`, the frontend uses `/og` for `og:image` on group/dashboard/join pages.

## Run locally

```bash
cd api
npm install
npm start
```

Then in `frontend/.env` set:

```
VITE_ANALYTICS_ENDPOINT=http://localhost:3001/events
```

Optional: **WEBHOOK_TARGET** — URL to forward webhook payloads (e.g. Discord or Slack incoming webhook). If set, the frontend can use `VITE_ANALYTICS_ENDPOINT` base URL + `/webhook` to send notifications without CORS issues.

Events are stored in `api/events.json`. For production, use a real database or replace `readEvents`/`writeEvents` with your store.
