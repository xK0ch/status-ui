# status-ui

Frontend for [status.fynn-koch.de](https://status.fynn-koch.de). A small,
dependency-light Vite + TypeScript page that shows the live status of the
homelab game servers, styled to match [fynn-koch.de](https://fynn-koch.de).

Paired backend: [status-service](https://github.com/xK0ch/status-service).

## What it does

- Opens a Server-Sent Events stream (`/api/status/stream`) and re-renders the
  server cards whenever a new snapshot arrives, so the page updates itself
  without reloading.
- Falls back to polling `/api/status` if the browser has no `EventSource`.
- Shows a connection indicator (live / reconnecting) and a relative
  "updated N seconds ago" label that ticks every second.

Each card shows online/offline, player count, version, map and ping where the
protocol provides them.

## Local development

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Type-check (tsc) + production build to dist/
npm run preview    # Serve the production build locally
```

In dev the page talks to the backend at `http://localhost:8080`, so run
[status-service](https://github.com/xK0ch/status-service) alongside it with its origin allowed:

```bash
STATUS_CORS_ALLOWED_ORIGINS=http://localhost:5173 ./gradlew bootRun
```
