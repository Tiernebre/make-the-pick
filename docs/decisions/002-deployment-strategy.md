# ADR-002: Deployment Strategy

## Status

Accepted (2026-04-08)

## Context

ADR-001 identified DigitalOcean as the deployment target and Docker as the
container strategy, but left the concrete deployment architecture unspecified.
We need to decide on compute, database hosting, CI/CD pipeline, domain/SSL
management, and secrets handling for production — optimizing for low cost and
minimal ops burden at the MVP stage.

Key constraints:

- The app requires persistent WebSocket connections (draft rooms), which rules
  out most serverless platforms
- PostgreSQL is the database (ADR-001)
- The existing Dockerfile handles multi-stage builds and runs migrations on
  startup
- CI already runs lint, format, and tests via GitHub Actions
- Budget target: under $15/mo for the MVP

## Decision

### Compute: Single DigitalOcean Droplet

A single Droplet (1 vCPU, 1–2 GB RAM, $6–12/mo) running Docker Compose. The
Droplet hosts both the application container and the database container on the
same machine. This is the cheapest viable production setup and avoids the
operational overhead of managing multiple servers.

**Considered:**

- **App Platform** — DigitalOcean's PaaS offering. Simpler ops but does not
  support co-locating PostgreSQL in the same unit — requires a separate managed
  database add-on ($15/mo minimum), pushing the total to $20–27/mo. Good
  migration target if the app outgrows a single server.
- **DOKS (Managed Kubernetes)** — $12/mo for the control plane alone, plus node
  costs. Significant operational complexity for no MVP benefit.

### Database: Co-located PostgreSQL via Docker Compose

PostgreSQL 17 runs as a Docker Compose service alongside the application
container on the same Droplet. Data is stored on a named Docker volume for
durability across container restarts.

No backup strategy at MVP — data loss is acceptable for an early-stage app with
test data. Backups (e.g., daily `pg_dump` to DigitalOcean Spaces) should be
added before real user data is at stake.

Migration path: when the app outgrows a single server (concurrent users,
reliability requirements, or need for automated failover), migrate to
DigitalOcean Managed PostgreSQL. The application only needs a `DATABASE_URL`
change — no code modifications required.

**Considered:**

- **DigitalOcean Managed PostgreSQL** — $15/mo for the basic plan. Automated
  backups, failover, and connection pooling out of the box. Excellent option but
  unnecessary cost for an MVP with a single-digit user base.

### CI/CD: GitHub Actions Auto-Deploy on Push to Main

The existing CI pipeline (lint → format → test) is extended with a deploy stage
that runs only on the `main` branch after all checks pass:

1. **Build** the Docker image
2. **Push** to DigitalOcean Container Registry (DOCR, free tier: 1 repo, 500 MB)
3. **Deploy** via SSH into the Droplet: copy the repo's
   `docker-compose.prod.yml` to the Droplet, pull the latest image, and run
   `docker compose -f docker-compose.prod.yml up -d`

Zero-downtime deploys are not guaranteed at MVP — the app restarts briefly
during deploys. This is acceptable for an early-stage app with a small user
base.

**Considered:**

- **Manual deploy trigger** — adds a manual approval step in GitHub Actions.
  Unnecessary friction for an MVP where every green CI run on `main` should
  ship.

### Domain & SSL: Cloudflare

Domain `makethepick.gg` registered via **Namecheap**, with nameservers pointed
to Cloudflare for DNS management, SSL, and CDN.

Setup:

1. Add `makethepick.gg` to Cloudflare (free plan) and set Namecheap's
   nameservers to the ones Cloudflare assigns
2. Create a proxied **A record** (`@` → Droplet public IP) in Cloudflare DNS
3. Set SSL/TLS mode to **Full** — Cloudflare terminates HTTPS from the browser,
   then connects to the Droplet over HTTP. No TLS certificates or reverse proxy
   (nginx, certbot) needed on the server

Cloudflare also provides on the free plan:

- **DDoS protection** — basic layer included
- **CDN caching** — static assets (client bundle) cached at the edge

The Droplet only needs to listen on port 80 (HTTP). Cloudflare handles all
HTTPS/TLS on the client side.

**Considered:**

- **Let's Encrypt + nginx on the Droplet** — free SSL but requires managing
  certificate renewal, nginx config, and reverse proxy setup. Cloudflare is
  simpler and adds CDN/DDoS protection for free.
- **DigitalOcean DNS** — functional but no free SSL termination or CDN.

### Production Docker Compose

A `docker-compose.prod.yml` committed to the repository defines the production
stack. During deployment, the CI/CD pipeline copies this file to the Droplet via
`scp`, ensuring the Droplet always runs the version that matches the deployed
code:

- **app** — pulls the latest image from DOCR, exposes port 3000, depends on
  `postgres`
- **postgres** — `postgres:17` with a named volume for data persistence
- Environment variables loaded from a `.env` file on the Droplet

### Secrets Management

- **On the Droplet:** environment variables via a `.env` file (not committed).
  Contains `DATABASE_URL`, Google OAuth client ID/secret, and any other
  production secrets.
- **In GitHub Actions:** repository secrets for DOCR credentials
  (`DIGITALOCEAN_ACCESS_TOKEN`) and SSH access to the Droplet
  (`SSH_PRIVATE_KEY`, `DROPLET_IP`).

### Migration Strategy

Already handled by the existing Dockerfile — the `CMD` runs `db/migrate.ts`
before starting the server. This is safe for a single-instance deployment with
no concurrent migration risk. If horizontal scaling is added later, migrations
should move to a separate init container or pre-deploy step.

## Consequences

### What becomes easier

- **Deployment is automatic** — push to `main`, CI passes, app deploys. No
  manual steps.
- **Cost is minimal** — ~$6–12/mo for compute. Under $15/mo total.
- **Single server simplicity** — one machine to monitor, one SSH target, one
  `docker compose` command to manage everything.
- **SSL is free and automatic** — Cloudflare handles certificates with zero
  configuration on the server.

### What becomes harder

- **Reliability** — single point of failure. If the Droplet goes down, the app
  and database are both offline. Acceptable for MVP, not for production scale.
- **Scaling** — vertical scaling only (upgrade the Droplet). Horizontal scaling
  requires migrating to App Platform, DOKS, or a multi-server architecture.
- **Database ops** — backups, upgrades, and recovery are manual. A managed
  database removes this burden but costs more.
- **Zero-downtime deploys** — not supported in this setup. Brief downtime on
  each deploy. Can be mitigated later with blue-green deploys or App Platform.

### Migration path

When the app outgrows this setup, the natural progression is:

1. **Database first** — move PostgreSQL to DO Managed PostgreSQL (change
   `DATABASE_URL`, done)
2. **Compute next** — move the app container to App Platform or a larger Droplet
3. **If needed** — add a load balancer and multiple Droplets, or move to DOKS
