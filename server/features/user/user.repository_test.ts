import { assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema.ts";
import { user } from "../../db/schema.ts";
import { createUserRepository } from "./user.repository.ts";

function createTestDb() {
  const connectionString = Deno.env.get("DATABASE_URL");
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for integration tests");
  }
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return { db, client };
}

async function createTestUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  id: string,
) {
  const [testUser] = await db.insert(user).values({
    id,
    name: "Test User",
    email: `${id}@test.com`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return testUser;
}

Deno.test({
  name: "userRepository.deleteById: removes the user from the database",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createUserRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);

      const before = await db.select().from(user).where(eq(user.id, userId));
      assertEquals(before.length, 1);

      await repo.deleteById(userId);

      const after = await db.select().from(user).where(eq(user.id, userId));
      assertEquals(after.length, 0);
    } finally {
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name: "userRepository.deleteById: is a no-op when the user does not exist",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createUserRepository(db);

    try {
      // Should not throw even when the user is absent
      await repo.deleteById(crypto.randomUUID());
    } finally {
      await client.end();
    }
  },
});
