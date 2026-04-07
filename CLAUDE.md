# CLAUDE.md

## Git

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages.
- Format: `<type>(<optional scope>): <description>`
- Include a detailed body explaining **why** the change was made, not just what changed.
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`
- Example:
  ```
  feat(draft): add snake draft pick order logic

  Implements the snake draft algorithm where pick order reverses
  each round. This is the most common draft format requested by
  users and is needed before the real-time draft room can function.
  ```
