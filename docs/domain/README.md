# Domain Models

Canonical definitions of Draftr's core entities, their relationships, and business invariants.

Each file describes one bounded context or aggregate root. These specs serve as the source of truth when implementing Zod schemas, database migrations, and tRPC procedures.

## Format

For each entity, document:

- **Fields** with types and constraints
- **Relationships** to other entities
- **Invariants** (business rules that must always hold)
- **State transitions** (if the entity has a lifecycle)
