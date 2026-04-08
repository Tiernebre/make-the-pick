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

## Architecture

- Follow the conventions in
  [`docs/design-patterns.md`](./docs/design-patterns.md).
- Server code uses three layers: **Router → Service → Repository**, organized by
  feature domain under `server/features/`.
- Routers are thin (auth gate + input/output schemas + call service). Business
  logic lives in services. Data access lives in repositories.
- Use factory functions for dependency injection — no classes, no DI containers.
- Zod schemas shared between client and server live in `@make-the-pick/shared`.
- Database schema stays centralized in `server/db/schema.ts`.

## Workflow

- Always work in a git worktree when making code changes. Use the
  `EnterWorktree` tool before starting implementation to avoid conflicts with
  parallel sessions.
- After every successful change, commit and push directly to `main`. Keep
  commits small and frequent — one logical change per commit. From a worktree,
  use: `git push origin HEAD:main`.
