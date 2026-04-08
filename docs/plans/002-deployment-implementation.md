# Deployment Implementation Plan (ADR-002)

## Context

ADR-002 specifies a single DigitalOcean Droplet running Docker Compose with
co-located PostgreSQL, auto-deploy via GitHub Actions, and Cloudflare for
DNS/SSL. Currently only CI exists (lint/format/test) — no production
infrastructure is provisioned.

**What exists:** Dockerfile, CI workflow, dev docker-compose.yml, `.env.example`
**What's needed:** DOCR, Droplet, docker-compose.prod.yml, deploy workflow,
secrets

**Decisions made:**

- Region: `nyc3`
- Droplet size: `s-1vcpu-2gb` ($12/mo)
- SSH key: Mac M2 (ID 41017317)

---

## Step 1: Create DigitalOcean Container Registry (DOCR)

Using `doctl` (free starter tier: 1 repo, 500 MB):

```sh
doctl registry create make-the-pick --subscription-tier starter
```

## Step 2: Create the Droplet

Provision a `s-1vcpu-2gb` ($12/mo) Droplet with the Docker marketplace image:

```sh
doctl compute droplet create make-the-pick \
  --image docker-20-04 \
  --size s-1vcpu-2gb \
  --region nyc3 \
  --ssh-keys 41017317 \
  --tag-names make-the-pick \
  --wait
```

Then configure the Droplet:

1. SSH in and install `doctl` on the Droplet, then authenticate Docker to DOCR:
   `doctl registry login`
2. Create `/opt/make-the-pick/.env` with production secrets:
   - `DATABASE_URL=postgres://make_the_pick:<strong_password>@postgres:5432/make_the_pick`
   - `POSTGRES_USER=make_the_pick`
   - `POSTGRES_PASSWORD=<strong_password>`
   - `POSTGRES_DB=make_the_pick`
   - Google OAuth credentials (when ready)

## Step 3: Create `docker-compose.prod.yml`

**File:** `docker-compose.prod.yml` (committed to repo)

```yaml
services:
  app:
    image: registry.digitalocean.com/make-the-pick/app:latest
    ports:
      - "80:3000"
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env
    restart: unless-stopped

  postgres:
    image: postgres:17
    volumes:
      - pgdata:/var/lib/postgresql/data
    env_file:
      - .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U make_the_pick"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

The app container's `DATABASE_URL` uses `postgres` as hostname (Docker Compose
service name). The postgres container reads `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB` from the same `.env` file.

## Step 4: Update CI workflow to support reuse

Add `workflow_call` to `.github/workflows/ci.yml` so the deploy workflow can
call it without CI double-triggering on push to main:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_call:
```

## Step 5: Create GitHub Actions Deploy Workflow

**File:** `.github/workflows/deploy.yml`

Triggers on push to `main` only. Calls CI first, then builds/pushes/deploys:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  ci:
    uses: ./.github/workflows/ci.yml

  deploy:
    name: Deploy
    needs: [ci]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Log in to DOCR
        run: doctl registry login --expiry-seconds 300

      - name: Build and push image
        run: |
          docker build -t registry.digitalocean.com/make-the-pick/app:latest .
          docker push registry.digitalocean.com/make-the-pick/app:latest

      - name: Copy docker-compose.prod.yml to Droplet
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: docker-compose.prod.yml
          target: /opt/make-the-pick/

      - name: Deploy to Droplet
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/make-the-pick
            docker pull registry.digitalocean.com/make-the-pick/app:latest
            docker compose -f docker-compose.prod.yml up -d
```

### Required GitHub Secrets

Set these interactively (values will be prompted):

```sh
gh secret set DIGITALOCEAN_ACCESS_TOKEN
gh secret set SSH_PRIVATE_KEY
gh secret set DROPLET_IP
```

## Step 6: Cloudflare & DNS (User action)

1. Add `makethepick.gg` to Cloudflare free plan
2. Point Namecheap nameservers to Cloudflare's assigned nameservers
3. Create proxied A record: `@` → Droplet public IP (from Step 2 output)
4. Set SSL/TLS mode to **Full**

---

## Implementation Order

| # | Task                                  | Who      | Tool            |
| - | ------------------------------------- | -------- | --------------- |
| 1 | Create DOCR                           | Claude   | `doctl`         |
| 2 | Create Droplet                        | Claude   | `doctl`         |
| 3 | Create `docker-compose.prod.yml`      | Claude   | code            |
| 4 | Update `ci.yml` (add `workflow_call`) | Claude   | code            |
| 5 | Create `.github/workflows/deploy.yml` | Claude   | code            |
| 6 | Set GitHub secrets                    | Together | `gh secret set` |
| 7 | Configure Droplet (`.env`, DOCR auth) | Together | SSH             |
| 8 | Cloudflare/Namecheap DNS              | User     | Web UI          |

## Verification

1. Push to `main` → CI passes → deploy workflow triggers
2. Image appears in DOCR: `doctl registry repository list-v2`
3. SSH into Droplet: `docker compose ps` shows app + postgres running
4. `curl http://<DROPLET_IP>/api/health` returns healthy
5. After Cloudflare setup: `curl https://makethepick.gg/api/health` works
