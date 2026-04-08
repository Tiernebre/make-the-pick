import postgres from "postgres";
import { TEST_ACCOUNT, TEST_SESSION, TEST_USER } from "./seed-data.ts";

const DATABASE_URL_E2E = process.env.DATABASE_URL_E2E ??
  "postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick_e2e";

const sql = postgres(DATABASE_URL_E2E);

/**
 * Truncates all application tables in dependency order.
 * Safe to call before each test suite to reset state.
 */
export async function resetDatabase(): Promise<void> {
  await sql`TRUNCATE "session", "account", "verification", "user", "health_checks" CASCADE`;
}

/**
 * Seeds a test user with an active session into the database.
 * Returns the session token for cookie injection.
 */
export async function seedTestUser(): Promise<{ sessionToken: string }> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
    VALUES (
      ${TEST_USER.id},
      ${TEST_USER.name},
      ${TEST_USER.email},
      ${TEST_USER.emailVerified},
      ${TEST_USER.image},
      ${TEST_USER.createdAt},
      ${TEST_USER.updatedAt}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO "account" (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at)
    VALUES (
      ${TEST_ACCOUNT.id},
      ${TEST_ACCOUNT.accountId},
      ${TEST_ACCOUNT.providerId},
      ${TEST_ACCOUNT.userId},
      ${TEST_ACCOUNT.accessToken},
      ${TEST_ACCOUNT.refreshToken},
      ${TEST_ACCOUNT.idToken},
      ${TEST_ACCOUNT.accessTokenExpiresAt},
      ${TEST_ACCOUNT.refreshTokenExpiresAt},
      ${TEST_ACCOUNT.scope},
      ${TEST_ACCOUNT.password},
      ${TEST_ACCOUNT.createdAt},
      ${TEST_ACCOUNT.updatedAt}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO "session" (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
    VALUES (
      ${TEST_SESSION.id},
      ${TEST_SESSION.expiresAt},
      ${TEST_SESSION.token},
      ${TEST_SESSION.createdAt},
      ${TEST_SESSION.updatedAt},
      ${TEST_SESSION.ipAddress},
      ${TEST_SESSION.userAgent},
      ${TEST_SESSION.userId}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  return { sessionToken: TEST_SESSION.token };
}

/**
 * Closes the database connection pool.
 * Call in globalTeardown or afterAll.
 */
export async function closeDatabase(): Promise<void> {
  await sql.end();
}
