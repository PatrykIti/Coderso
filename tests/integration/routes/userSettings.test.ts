import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, sessions, userSettings, users } from "../../../core/db/schema";
import { resolveRateLimitBucket, startHttpServer } from "../../../core/server/httpServer";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { registerUserSettingsRoutes } from "../../../core/server/routes/userSettingsRoutes";
import { resolveAdminPath } from "../../../core/server/utils/adminPath";
import {
  createCsrfToken,
  createSession,
  SESSION_COOKIE_NAME,
  setCsrfToken,
} from "../../../core/services/auth/sessionService";
import { getSetting } from "../../../core/services/settings/settingsService";
import { canConnect } from "../../utils/db";
import {
  type AccessLogCandidate,
  type AccessLogIdentity,
  type AccessLogScope,
  type ExpectedAccessLog,
  type PollDeps,
  drainExactAccessLogs,
  expectedAccessLogSignature,
  isOwnedAccessLogCandidate,
  trackedFetch,
  validateAndCleanupAccessLogs,
} from "./support/userSettingsAccessLogHarness";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
    },
  };
};

test("registerUserSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerUserSettingsRoutes(
    router as unknown as Parameters<typeof registerUserSettingsRoutes>[0],
    {
      requireAuth: () => undefined,
      validate: () => undefined,
    } as unknown as Parameters<typeof registerUserSettingsRoutes>[1]
  );

  expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual(
    expect.arrayContaining([
      "GET /user-settings",
      "GET /user-settings/:key",
      "PATCH /user-settings/:key",
    ])
  );
});

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const configuredHost = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  try {
    return new URL(value).host;
  } catch {
    return fallback;
  }
};

const responseErrorCode = async (response: Response): Promise<string | null> => {
  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
};

testIfDb(
  "real HTTP user-settings routes preserve self-scope, CSRF, buckets, errors, and exact log ownership",
  async () => {
    resetRateLimitBuckets();
    const marker = `wf540-user-settings-${randomUUID()}`;
    const userA = randomUUID();
    const userB = randomUUID();
    const userIds = [userA, userB] as const;
    const ledger: ExpectedAccessLog[] = [];
    let server: ReturnType<typeof startHttpServer> | null = null;
    let sessionIds: readonly string[] = [];
    let behaviorError: Error | null = null;
    let validationError: Error | null = null;
    let fixturesCleaned = false;
    const fallbackCleanupErrors: Error[] = [];

    const currentScope = (): AccessLogScope => ({
      marker,
      userIds: new Set(userIds),
      sessionIds: new Set(sessionIds),
    });
    const queryCandidates = async (): Promise<readonly AccessLogCandidate[]> =>
      db
        .select({
          id: accessLogs.id,
          userAgent: accessLogs.userAgent,
          method: accessLogs.method,
          path: accessLogs.path,
          status: accessLogs.status,
          userId: accessLogs.userId,
          sessionId: accessLogs.sessionId,
        })
        .from(accessLogs)
        .where(
          or(
            eq(accessLogs.userAgent, marker),
            inArray(accessLogs.userId, [...userIds]),
            ...(sessionIds.length > 0 ? [inArray(accessLogs.sessionId, [...sessionIds])] : [])
          )
        );
    const pollDeps: PollDeps = {
      query: queryCandidates,
      deleteExactIds: async (ids) => {
        if (ids.length === 0) return;
        await db.delete(accessLogs).where(inArray(accessLogs.id, [...ids]));
      },
      now: () => Date.now(),
      wait: (ms) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        }),
    };
    const cleanupExactFixtures = async (): Promise<void> => {
      await db.delete(userSettings).where(inArray(userSettings.userId, [...userIds]));
      if (sessionIds.length > 0) {
        await db.delete(sessions).where(inArray(sessions.id, [...sessionIds]));
      }
      await db.delete(users).where(inArray(users.id, [...userIds]));
      fixturesCleaned = true;
    };

    await db.insert(users).values([
      {
        id: userA,
        email: `wf540-${userA}@example.test`,
        passwordHash: "hash",
      },
      {
        id: userB,
        email: `wf540-${userB}@example.test`,
        passwordHash: "hash",
      },
    ]);

    try {
      const [createdA, createdB] = await Promise.all([
        createSession({ userId: userA, userAgent: marker }),
        createSession({ userId: userB, userAgent: marker }),
      ]);
      sessionIds = [createdA.session.id, createdB.session.id];
      const csrfA = createCsrfToken();
      const csrfB = createCsrfToken();
      await Promise.all([
        setCsrfToken(createdA.session.id, csrfA.tokenHash),
        setCsrfToken(createdB.session.id, csrfB.tokenHash),
      ]);

      const adminPath = await resolveAdminPath();
      server = startHttpServer({ port: 0 });
      const baseUrl = `http://127.0.0.1:${server.port}`;
      const fallbackHost = `127.0.0.1:${server.port}`;
      const host = configuredHost(await getSetting("site.adminBaseUrl"), fallbackHost);
      const routePath = `${adminPath}/api/user-settings/customScreens.entry.preferences`;
      const unknownPath = `${adminPath}/api/user-settings/unknown.key`;
      const url = `${baseUrl}${routePath}`;
      const headers = (
        token?: string,
        csrf?: string,
        expectedUserId?: string
      ): Record<string, string> => ({
        Host: host,
        "User-Agent": marker,
        ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(expectedUserId ? { "X-Coderso-Expected-User-Id": expectedUserId } : {}),
      });
      const identityA = {
        userId: userA,
        sessionId: createdA.session.id,
      } as const;
      const identityB = {
        userId: userB,
        sessionId: createdB.session.id,
      } as const;
      const request = (
        requestUrl: string,
        init: RequestInit,
        status: number,
        identity: AccessLogIdentity
      ) =>
        trackedFetch(
          requestUrl,
          init,
          {
            method: (init.method ?? "GET").toUpperCase(),
            path: new URL(requestUrl).pathname,
            status,
            identity,
          },
          marker,
          ledger
        );

      try {
        expect(resolveRateLimitBucket("GET", "/user-settings/key")).toBe("admin_read");
        expect(resolveRateLimitBucket("PATCH", "/user-settings/key")).toBe("admin_write");

        const unauthenticated = await request(url, { method: "GET", headers: headers() }, 401, {
          userId: null,
          sessionId: null,
        });
        expect(await responseErrorCode(unauthenticated)).toBe("auth_required");

        const defaultA = await request(
          url,
          { method: "GET", headers: headers(createdA.token) },
          200,
          identityA
        );
        expect(await defaultA.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: false },
        });

        const writeA = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: true },
            }),
          },
          200,
          identityA
        );
        expect(await writeA.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: true },
        });

        await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdB.token, csrfB.token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
            }),
          },
          200,
          identityB
        );

        const readA = await request(
          url,
          { method: "GET", headers: headers(createdA.token) },
          200,
          identityA
        );
        expect(await readA.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: true },
        });

        const mismatch = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdB.token, csrfB.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: true },
            }),
          },
          409,
          identityB
        );
        expect(await responseErrorCode(mismatch)).toBe("user_setting_identity_changed");

        const readB = await request(
          url,
          { method: "GET", headers: headers(createdB.token) },
          200,
          identityB
        );
        expect(await readB.json()).toEqual({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: false },
        });
        const [storedA] = await db
          .select({ value: userSettings.value })
          .from(userSettings)
          .where(
            and(
              eq(userSettings.userId, userA),
              eq(userSettings.key, "customScreens.entry.preferences")
            )
          );
        expect(storedA?.value).toEqual({
          version: 1,
          showFieldMetadata: true,
        });
        const [storedB] = await db
          .select({ value: userSettings.value })
          .from(userSettings)
          .where(
            and(
              eq(userSettings.userId, userB),
              eq(userSettings.key, "customScreens.entry.preferences")
            )
          );
        expect(storedB?.value).toEqual({
          version: 1,
          showFieldMetadata: false,
        });

        const invalidKey = await request(
          `${baseUrl}${unknownPath}`,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ value: true }),
          },
          400,
          identityA
        );
        expect(await responseErrorCode(invalidKey)).toBe("user_settings_key_invalid");

        const invalidValue = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: "yes" },
            }),
          },
          400,
          identityA
        );
        expect(await responseErrorCode(invalidValue)).toBe("user_settings_value_invalid");

        const unknownEnvelope = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, csrfA.token, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
              extra: true,
            }),
          },
          400,
          identityA
        );
        expect(await responseErrorCode(unknownEnvelope)).toBe("validation_error");

        const missingCsrf = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, undefined, userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
            }),
          },
          403,
          identityA
        );
        expect(await responseErrorCode(missingCsrf)).toBe("csrf_invalid");

        const invalidCsrf = await request(
          url,
          {
            method: "PATCH",
            headers: {
              ...headers(createdA.token, "invalid-csrf-token", userA),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              value: { version: 1, showFieldMetadata: false },
            }),
          },
          403,
          identityA
        );
        expect(await responseErrorCode(invalidCsrf)).toBe("csrf_invalid");
      } catch (error) {
        behaviorError = error instanceof Error ? error : new Error("user_settings_http_failed");
      }

      await server.stop(true);
      server = null;

      try {
        await validateAndCleanupAccessLogs(
          pollDeps,
          currentScope(),
          ledger.map(expectedAccessLogSignature),
          cleanupExactFixtures
        );
      } catch (error) {
        validationError =
          error instanceof Error ? error : new Error("access_log_validation_failed");
      }
    } catch (error) {
      if (!behaviorError) {
        behaviorError = error instanceof Error ? error : new Error("user_settings_http_failed");
      }
    } finally {
      if (server) {
        try {
          await server.stop(true);
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("user_settings_server_stop_failed")
          );
        }
      }
      resetRateLimitBuckets();
      if (!fixturesCleaned) {
        try {
          const scope = currentScope();
          const remaining = await queryCandidates();
          const initialIds = remaining
            .filter((row) => isOwnedAccessLogCandidate(row, scope))
            .map(({ id }) => id);
          const drained = await drainExactAccessLogs(pollDeps, scope, initialIds);
          if (drained.scopeInvalid) {
            fallbackCleanupErrors.push(new Error("access_log_scope_invalid"));
          }
          if (drained.lateAfterDelete) {
            fallbackCleanupErrors.push(new Error("access_log_late_after_delete"));
          }
          if (drained.cleanupError) {
            fallbackCleanupErrors.push(drained.cleanupError);
          } else {
            await cleanupExactFixtures();
          }
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("access_log_fallback_cleanup_failed")
          );
        }
      }
    }

    const finalErrors: Error[] = [];
    if (behaviorError) finalErrors.push(behaviorError);
    if (validationError) finalErrors.push(validationError);
    finalErrors.push(...fallbackCleanupErrors);
    if (finalErrors.length === 1) throw finalErrors[0];
    if (finalErrors.length > 1) {
      throw new AggregateError(finalErrors, "user_settings_http_and_log_validation_failed");
    }
  },
  30_000
);
