# Incident 002: Droplet disk full, deploys silently failed for two PRs

- **Date:** 2026-04-11
- **Duration of stale production:** ~40 minutes (PR #79 merged 17:53 UTC →
  manual recovery 18:19 UTC). The window would have been open-ended without the
  follow-up investigation — nothing in CI was flagging that the Droplet was
  still running the pre-#79 image.
- **User impact:** Users trying to delete a league continued to hit the `23503`
  foreign-key error that #74 / #79 / #81 were all trying to fix. Production was
  up and serving traffic on the old image; the new migration just never reached
  it.
- **Severity:** SEV-3 (production serving stale code, deploy pipeline
  effectively broken, no way for the team to know)

## Summary

Three back-to-back PRs (#74, #79, #81) tried to fix the same bug: `draft_pick`
foreign keys needed `ON DELETE cascade` so league delete could succeed. After
each merge, production still threw `23503` on delete. The working theory moved
from "drizzle isn't picking up the migration because of a timestamp ordering
bug" (the subject of #79 and #81) to "something else is wrong".

The actual problem had nothing to do with drizzle. The Droplet's root filesystem
was 100% full — 49G / 49G used, ~200MB free, ~46GB of it sitting in 94 stale
Docker images under `/var/lib/docker`. When the Deploy workflow ran
`docker pull` on the Droplet, image layer download succeeded but extraction
failed:

```
failed to extract layer (application/vnd.docker.image.rootfs.diff.tar.gzip
sha256:4b607e37c5f6…) to overlayfs as "extract-701147453-S7Bm …": mkdir
/var/lib/containerd/…/fs/app/node_modules/.deno/monaco-editor@0.55.1/…: no
space left on device
```

The deploy script swallowed that failure for three reasons stacked on top of
each other:

1. **`docker pull` failed, but the ssh-action `script` kept going.** The script
   block in `.github/workflows/deploy.yml` is just
   `docker pull … &&
   docker compose … up -d` — except it's written as two
   separate lines with no `set -e`, so a non-zero exit from `docker pull` didn't
   abort the step.
2. **`docker compose up -d` saw no image change**, because the pull hadn't
   actually updated the local `ghcr.io/tiernebre/make-the-pick:latest` tag —
   extraction is what finalises the tag update. Compose reported the existing
   `app` container as `Running` and returned 0. No recreation, no migration run.
3. **The smoke test hit the old running container and passed.**
   `curl
   https://makethepick.gg` returned 200 because the previous image was
   still serving traffic just fine. The smoke test has no concept of "did my
   _new_ code reach prod?" — only "is _something_ answering on 443?".

Net result: `Deploy` workflow for #79 and #81 both ended in ✅ green. The
Droplet container's `StartedAt` was 2026-04-11 17:31 — before either PR merged.
Two "successful" deploys in a row had not actually deployed anything.

## Timeline (UTC, 2026-04-11)

- **17:31** — Last deploy that actually recreated the app container. Image
  digest `sha256:646c1623…`. This is the pre-cascade-fix build.
- **17:53** — PR #79 (first attempt to fix the timestamp ordering) merges.
  Deploy workflow runs, reports success, Droplet still on `646c1623…`.
- **18:07** — PR #81 (regenerated migration) merges. Deploy workflow runs,
  `docker pull` extraction fails with `no space left on device`,
  `docker
  compose up -d` reports "Running", smoke test passes against the
  _old_ container, workflow reports ✅. Droplet still on `646c1623…`.
- **~18:15** — User reports that the fix "isn't going through" and shares the
  prod `__drizzle_migrations` dump showing only 23 rows (max
  `created_at = 1776350000000`). The journal's 0024 is at `1776370000000` —
  strictly greater — so drizzle would apply it if `db/migrate.ts` ever ran
  against this DB.
- **18:17** — SSH into the Droplet reveals the app container was started at
  17:31, on an image also built at 17:30 — i.e. neither #79 nor #81 had actually
  replaced the running container. `df -h /` shows `49G / 49G / 205M`.
  `docker system df` shows 94 images totalling 46.22GB.
- **18:18** — `docker image prune -a -f` reclaims ~6.3GB of tagged-but-unused
  images plus another ~40GB of orphaned containerd overlay snapshots left behind
  by the failed extract. Disk drops to `7.1G / 49G`, `df` reports 15%.
- **18:19** — Manual
  `docker compose -f docker-compose.prod.yml pull app && up
  -d app` from
  `/opt/make-the-pick`. App container starts on image `sha256:da8bd967…` (the
  #82 build from 18:17 UTC). Migration 0024 applies on first `migrate.ts` run.
  `select * from __drizzle_migrations` now shows row 24 at `1776370000000`.
  League delete works on prod.

## Root cause

Two failure modes compounding:

1. **No disk hygiene on the Droplet.** Every deploy builds a new image, pushes
   it to GHCR, the Droplet pulls it, and the _previous_ image is left behind
   tagged by digest. With ~1–2 deploys/day and ~500MB per image, the Droplet
   fills up within a month. Nothing on the Droplet is pruning old images, and
   nothing in the deploy pipeline is either. ADR-002 mentions the deploy
   strategy but doesn't cover garbage collection.
2. **The deploy script has no failure detection.** The remote script in
   `.github/workflows/deploy.yml` is:

   ```yaml
   script: |
     cd /opt/make-the-pick
     docker pull ghcr.io/tiernebre/make-the-pick:latest
     docker compose -f docker-compose.prod.yml up -d
   ```

   There's no `set -euo pipefail`, no pre-flight disk check, no verification
   that the new image was actually pulled, and no post-deploy check that the
   running container's image digest matches the one we just pushed. Any failure
   in the middle — not just disk-full — is invisible as long as _something_ is
   still up at `makethepick.gg`.

The smoke test compounds both: it's the wrong layer to catch this. HTTP-200 on
`/` tells you the site is up; it doesn't tell you the _new_ code is up.

## What went well

- **Production stayed up.** The old container kept serving traffic the entire
  time. Same pattern as incident 001: the failure was "can't deploy new code",
  not "site is down".
- **Memory guided the investigation to the right place.** The auto-memory note
  "Use doctl for Droplet lookups" meant the first move was
  `doctl compute droplet list` → SSH → `df -h` → immediate root cause, instead
  of continuing to chase drizzle timestamp theories.
- **The cleanup reclaimed far more than expected.** `docker image prune` freed
  ~6GB of tagged images, but the kernel/containerd cleanup of orphaned overlay
  snapshots (left over from the ENOSPC extract) dropped the FS from 49G → 7.1G.
  Worth remembering: the _visible_ reclaim number understates how much a failed
  extract can pin.

## What went badly

- **Three PRs in a row shipped against a theory that couldn't be verified.**
  #74, #79, and #81 all assumed the migration was _running_ and failing to
  apply, when actually the container it was supposed to run in never started. A
  30-second
  `ssh droplet "docker inspect make-the-pick-app-1 --format
  '{{.State.StartedAt}}'"`
  after #74 or #79 would have revealed "container is still running on the image
  from before your PR merged" and saved two round trips. Lesson: when a
  production fix lands and prod behaviour doesn't change, **verify the new code
  is actually running** before forming a theory about _why_ it didn't work.
- **The deploy pipeline's success signal is not trustworthy.** A green Deploy
  job currently means "CI passed and the smoke test against `/` returned 200".
  It does _not_ mean "the new image is running on the Droplet". This is the same
  class of bug as a test that passes without exercising the code under test.
- **No disk alerting.** The Droplet is a $6–12/mo unmanaged box; there's no
  monitoring on it. It can go from 50% full to 100% full silently, and the first
  symptom is a deploy that "succeeds" but does nothing.
- **ENOSPC is the _only_ failure the deploy script will silently eat, but it's
  not the only failure it _could_.** Anything that makes `docker pull` fail
  (GHCR auth, network, registry outage) has the same shape: pull partially
  succeeds, `compose up -d` returns happy, smoke test hits the old container,
  deploy reports green. The root fix is "detect _any_ pull or recreate failure",
  not just "detect disk-full".

## Action items

- [ ] **Fail deploy on disk pressure.** Add a pre-flight check to the deploy
      script:

      ```bash
      df --output=pcent / | tail -1 | tr -d ' %' | awk '{ if ($1 >= 85) exit 1 }'
      ```

      If the Droplet is ≥85% full, abort the deploy with a clear error
      instead of letting `docker pull` run into ENOSPC. 85% leaves enough
      headroom for one full image pull (~500MB–1GB).

- [ ] **Prune old images on every successful deploy.** After
      `docker compose
      up -d` completes and the new container is healthy,
      run:

      ```bash
      docker image prune -a -f --filter "until=24h"
      ```

      This keeps the most recent day of images (useful for fast rollback)
      and drops everything older. Run it _after_ the smoke test passes, so
      a failed deploy doesn't take the rollback image with it.

- [ ] **Make the deploy script fail loudly.** Add `set -euo pipefail` to the
      ssh-action `script` block so `docker pull` failures abort the step.
      Currently any intermediate failure is ignored as long as the final command
      returns 0.

- [ ] **Verify the new image is actually running.** After `compose up -d`, check
      that the `make-the-pick-app-1` container's image digest matches the one we
      just pushed to GHCR. If it doesn't, the pull/recreate silently no-op'd and
      the deploy should fail. Something like:

      ```bash
      expected=$(docker image inspect ghcr.io/…:latest --format '{{.Id}}')
      actual=$(docker inspect make-the-pick-app-1 --format '{{.Image}}')
      test "$expected" = "$actual"
      ```

- [ ] **Smoke test on a new code marker, not `/`.** Bump a `GET /api/health`
      response to include the build SHA (from `GITHUB_SHA` baked in at build
      time) and have the smoke test assert the returned SHA matches the commit
      being deployed. This catches any "deploy succeeded but old container is
      still running" regression, not just disk-full.

- [ ] **Add minimal Droplet alerting.** Turn on DigitalOcean's free Droplet
      monitoring agent and set an alert at 80% disk. Single email / Slack, no
      dashboards needed. Catches the slow-burn before it becomes a deploy
      outage.

- [ ] **Document the manual recovery recipe.** When this happens again before
      the automated fixes land: `ssh root@<droplet>`,
      `docker image prune -a -f`,
      `cd /opt/make-the-pick && docker compose
      -f docker-compose.prod.yml pull app && docker compose -f
      docker-compose.prod.yml up -d app`.
      Add to a runbook once `docs/runbooks/` exists.

## References

- Failing deploy run with the ENOSPC line:
  https://github.com/Tiernebre/make-the-pick/actions/runs/24288430300
- The three cascade-fix PRs that all shipped into a dead container: #74, #79,
  #81
- Deploy workflow:
  [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
- ADR-002 (deployment strategy):
  [`docs/decisions/002-deployment-strategy.md`](../decisions/002-deployment-strategy.md)
