import { assertEquals } from "jsr:@std/assert";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";
import { healthChecks } from "./schema.ts";

Deno.test({
  name: "healthChecks: insert and read back a row",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const connectionString = Deno.env.get("DATABASE_URL");
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for integration tests");
    }

    const client = postgres(connectionString);
    const testDb = drizzle(client, { schema });

    const [inserted] = await testDb
      .insert(healthChecks)
      .values({})
      .returning();

    assertEquals(typeof inserted.id, "number");
    assertEquals(inserted.checkedAt instanceof Date, true);

    await testDb.delete(healthChecks).where(eq(healthChecks.id, inserted.id));
    await client.end();
  },
});
