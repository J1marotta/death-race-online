# Colyseus Deployment

The migration server is packaged for Fly.io while the static frontend stays on Cloudflare Pages.

## Cost Boundary

Fly.io has no free tier and currently does not provide billing alerts. This project therefore uses one `shared-cpu-1x` Machine with 256 MB RAM, no volume, and scale-to-zero. Active WebSocket connections count as concurrency and keep a live match active; an idle server can stop, so the first lobby after idle may have a cold start.

Before production cutover, confirm current pricing and billing details in the Fly dashboard. Do not add extra regions, Machines, volumes, dedicated IPv4 addresses, or always-on minimum capacity without reviewing cost.

## Deploy

```text
flyctl auth login
flyctl apps create death-race-online-game
flyctl deploy
flyctl status
flyctl checks list
```

The service URL is `https://death-race-online-game.fly.dev`; browser clients use `wss://death-race-online-game.fly.dev`.

## Frontend Preview

Build the migration client without changing the default rollback build:

```text
VITE_NETWORK_BACKEND=colyseus VITE_COLYSEUS_URL=wss://death-race-online-game.fly.dev npm run build
```

Production must not select this build until the remote health check and two-browser multi-round acceptance pass.

## Rollback

Cloudflare Pages and the Durable Object Worker remain deployable with `npm run deploy:cloudflare` and `npm run deploy:rooms`. Immutable Pages deployment URLs remain available even after the main domain is switched.
