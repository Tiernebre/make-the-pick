# CLAUDE.md

## Git

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for
  all commit messages.
- Format: `<type>(<optional scope>): <description>`
- Include a detailed body explaining **why** the change was made, not just what
  changed.
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`,
  `ci`
- Example:
  ```
  feat(draft): add snake draft pick order logic

  Implements the snake draft algorithm where pick order reverses
  each round. This is the most common draft format requested by
  users and is needed before the real-time draft room can function.
  ```

## Domain

- Domain documentation lives in [`docs/domain/`](./docs/domain/). Read the
  relevant domain doc before working on a feature to understand the ubiquitous
  language, entities, and rules.

## Architecture

- Follow the conventions in
  [`docs/design-patterns.md`](./docs/design-patterns.md).
- Server code uses three layers: **Router → Service → Repository**, organized by
  feature domain under `server/features/`.
- Routers are thin (auth gate + input/output schemas + call service). Business
  logic lives in services. Data access lives in repositories.
- Use factory functions for dependency injection — no classes, no DI containers.
- Zod schemas shared between client and server live in `@make-the-pick/shared`.
- Client code is also feature-based: `client/src/features/<domain>/` for pages,
  components, and hooks specific to a feature. Top-level `components/` and
  `hooks/` are for genuinely shared code only.
- Database schema stays centralized in `server/db/schema.ts`.

## Testing

- Follow strict **test-driven development (TDD)** with red-green-refactor
  cycles. This is not optional.
  1. **Red** — Write a failing test against a spec or interface. The
     implementation does not exist yet.
  2. **Green** — Write the minimum code to make the test pass.
  3. **Refactor** — Clean up the implementation while keeping tests green.
- Never write implementation before a failing test. Tests drive the design.
- For services: define the interface/type signature first, write tests against
  it with fakes, then implement.
- For repositories: write integration tests against the expected query behavior
  first, then implement the queries.

## Workflow

- Always work in a git worktree when making code changes. Use the
  `EnterWorktree` tool before starting implementation to avoid conflicts with
  parallel sessions.
- **Never push directly to `main`.** Every change — even one-line fixes — goes
  through a pull request so CI runs against it _before_ it can affect the deploy
  pipeline. Why: we got burned once (see
  [`docs/incidents/001-deno-2.7.12-npm-extraction-regression.md`](./docs/incidents/001-deno-2.7.12-npm-extraction-regression.md))
  when multiple untested commits stacked up on a broken `main` and had to be
  bisected out. A PR gate prevents that entire failure mode.
- Keep PRs small and frequent — one logical change per PR. This preserves the
  "small commits" habit while still giving every change a CI gate.
- Standard PR flow for each change:
  1. In the worktree, create a feature branch and push it:
     `git push -u origin HEAD:<branch-name>`.
  2. Open the PR against `main` with `gh pr create`.
  3. Enable auto-merge immediately: `gh pr merge --auto --squash` (or `--merge`
     if a linear history is preferred for that change). Auto-merge will merge
     the PR the moment required checks pass, without requiring another
     round-trip.
  4. Watch CI with `gh run watch` / `gh pr checks --watch`. If checks fail, fix
     on the same branch and push again — do not merge manually to bypass.
  5. After the PR merges, run `git fetch origin main:main` locally so the
     worktree's `main` ref catches up.
- The only acceptable exception to the PR rule is an **incident-response change
  that unblocks a broken deploy pipeline** (e.g. pinning a regressed toolchain
  version). In that case it is still preferable to use a PR with auto-merge, but
  a direct push is permitted if CI on `main` is the only way to validate the
  fix. Document the exception in the commit body.
