# ADR-003: Migrate Container Registry from DOCR to GHCR

## Status

Accepted (2026-04-08)

## Context

The CI/CD pipeline (ADR-002) pushes Docker images to DigitalOcean Container
Registry (DOCR) as part of the deploy workflow. DOCR has become unreliable —
repeated `unauthorized` errors on `docker push` despite valid `doctl` auth,
causing failed deployments.

Beyond reliability, DOCR has structural drawbacks for this project:

- **Extra credentials** — requires a `DIGITALOCEAN_ACCESS_TOKEN` secret with
  registry write scope, separate from the GitHub Actions built-in `GITHUB_TOKEN`
- **Storage limits** — free tier is capped at 500 MB / 1 repository
- **No ecosystem integration** — images are disconnected from the GitHub
  repository, PRs, and packages UI

The project is open source and hosted on GitHub, so the registry choice should
align with the existing toolchain.

## Decision

Migrate from DigitalOcean Container Registry to **GitHub Container Registry
(GHCR)** at `ghcr.io`.

### Why GHCR

- **Free for public packages** — no storage or bandwidth limits for public
  images, which suits an open source project
- **Built-in authentication** — GitHub Actions provides `GITHUB_TOKEN` with
  `packages: write` scope, eliminating the need for external registry
  credentials
- **Native integration** — images appear in the repository's Packages tab,
  linked to commits and workflows
- **No external dependency** — removes the DOCR dependency from the deploy
  pipeline entirely

### Image naming

Images are published to `ghcr.io/tiernebre/make-the-pick:latest`, matching the
GitHub `owner/repo` convention.

### Changes required

1. **`deploy.yml`** — replace the `doctl` install + DOCR login steps with a
   `docker/login-action` step using `GITHUB_TOKEN`. Update the build/push
   commands to target `ghcr.io`. Remove the DOCR garbage collection step.
2. **`docker-compose.prod.yml`** — update the `image` field to pull from
   `ghcr.io` instead of `registry.digitalocean.com`.
3. **Droplet** — the Droplet must authenticate to GHCR to pull the image. The
   deploy step logs into GHCR via SSH before pulling.

### Alternatives considered

- **Docker Hub** — free tier allows 1 public repository. Widely used but
  requires separate Docker Hub credentials, has pull rate limits (100 pulls/6h
  for anonymous, 200 for authenticated), and no GitHub-native integration.
- **Quay.io (Red Hat)** — free for public repositories. Solid registry but
  requires a separate Red Hat account and has less GitHub Actions integration
  than GHCR.
- **Stay on DOCR and fix auth** — possible by regenerating the API token, but
  does not address the structural drawbacks (storage limits, extra credentials,
  no GitHub integration). Migrating now avoids the next DOCR outage.

## Consequences

### What becomes easier

- **No external registry credentials** — `GITHUB_TOKEN` is automatically
  available in GitHub Actions, removing the `DIGITALOCEAN_ACCESS_TOKEN`
  dependency for registry operations
- **No storage limits** — public images on GHCR have no cap, unlike DOCR's 500
  MB free tier
- **Better visibility** — images are linked to the repository in the GitHub
  Packages UI
- **Simpler workflow** — fewer steps in `deploy.yml` (no `doctl` install, no
  garbage collection)

### What becomes harder

- **Droplet authentication** — the Droplet needs a way to pull from GHCR. This
  requires a Personal Access Token (classic, with `read:packages` scope) stored
  on the Droplet, since `GITHUB_TOKEN` is scoped to GitHub Actions only
- **DigitalOcean coupling** — the `DIGITALOCEAN_ACCESS_TOKEN` secret is still
  needed if other `doctl` commands are used in the future, but is no longer
  required for the current pipeline

### Migration checklist

- [ ] Update `deploy.yml` to use GHCR
- [ ] Update `docker-compose.prod.yml` image reference
- [ ] Create a GitHub PAT with `read:packages` scope for the Droplet
- [ ] Log in to GHCR on the Droplet (`docker login ghcr.io`)
- [ ] Remove the `DIGITALOCEAN_ACCESS_TOKEN` secret from GitHub if no longer
      needed for other purposes
- [ ] Delete the DOCR registry after confirming GHCR works
