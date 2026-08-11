import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, or } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, roles, sessions, userRoles, users } from "../../../core/db/schema";
import {
  createPost,
  deletePost,
  getPost,
  updatePostMetadata,
} from "../../../core/services/content/postsService";
import {
  createCsrfToken,
  createSession,
  SESSION_COOKIE_NAME,
  setCsrfToken,
} from "../../../core/services/auth/sessionService";
import { getSetting } from "../../../core/services/settings/settingsService";
import {
  getSecuritySettings,
  setSecuritySettings,
} from "../../../core/services/settings/securitySettings";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import type { PermissionRequirement } from "../../../core/server/middleware/rbac";
import type { RouteContext } from "../../../core/server/router";
import {
  registerPostsRoutes,
  type PostMetadataUpdater,
  type PostsRouteHandler,
  type Router,
} from "../../../core/server/routes/postsRoutes";
import { startHttpServer } from "../../../core/server/httpServer";
import { resolveAdminPath } from "../../../core/server/utils/adminPath";
import { validate } from "../../../core/server/validation/schemaValidator";
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

type RegisteredRoute = {
  method: string;
  path: string;
  handlers: PostsRouteHandler[];
};

type UpdateCall = {
  id: string;
  input: Parameters<PostMetadataUpdater>[1];
  actorId: string | undefined;
};

type HttpActor = Readonly<{
  userId: string;
  roleId: string;
  sessionId: string;
  token: string;
  csrfToken: string;
}>;

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

const makeRouter = (): { router: Router; routes: RegisteredRoute[] } => {
  const routes: RegisteredRoute[] = [];
  const add =
    (method: string) =>
    (path: string, ...handlers: PostsRouteHandler[]) => {
      routes.push({ method, path, handlers });
    };

  return {
    routes,
    router: {
      get: add("GET"),
      post: add("POST"),
      patch: add("PATCH"),
      delete: add("DELETE"),
    },
  };
};

const metadataContext = (body: unknown, user: RouteContext["user"] = { id: "actor-1" }) => ({
  params: { id: "post-1" },
  query: {},
  body,
  user,
});

const createMetadataHarness = (
  options: {
    deny?: (requirement: PermissionRequirement) => boolean;
    update?: PostMetadataUpdater;
  } = {}
) => {
  const { router, routes } = makeRouter();
  const permissionCalls: PermissionRequirement[] = [];
  const updateCalls: UpdateCall[] = [];
  const updater: PostMetadataUpdater =
    options.update ??
    (async (id, input, actorId) => {
      updateCalls.push({ id, input, actorId });
      return { id } as Awaited<ReturnType<PostMetadataUpdater>>;
    });

  registerPostsRoutes(router, {
    requirePermission: (requirement) => async () => {
      permissionCalls.push(requirement);
      if (options.deny?.(requirement)) throw new Error("forbidden");
    },
    updatePostMetadata: updater,
    validate,
  });

  const route = routes.find(
    (candidate) => candidate.method === "PATCH" && candidate.path === "/posts/:id/metadata"
  );
  const handler = route?.handlers[0];
  if (!handler) throw new Error("missing_post_metadata_route_handler");

  return { handler, permissionCalls, updateCalls };
};

test("metadata-only writer request keeps omitted scheduling absent and takes one write guard", async () => {
  const harness = createMetadataHarness();

  await expect(
    harness.handler(metadataContext({ tags: ["news"], seo: { description: "Updated" } }))
  ).resolves.toMatchObject({ id: "post-1" });

  expect(harness.permissionCalls).toEqual(["content:write"]);
  expect(harness.updateCalls).toEqual([
    {
      id: "post-1",
      input: { tags: ["news"], seo: { description: "Updated" } },
      actorId: "actor-1",
    },
  ]);
  expect(Object.hasOwn(harness.updateCalls[0]?.input ?? {}, "scheduledAt")).toBe(false);
});

test("each own publication field selects the all-of guard exactly once", async () => {
  for (const body of [{ status: "published" }, { scheduledAt: null }]) {
    const harness = createMetadataHarness();

    await expect(harness.handler(metadataContext(body))).resolves.toMatchObject({ id: "post-1" });

    expect(harness.permissionCalls).toEqual([["content:write", "content:publish"]]);
    expect(harness.updateCalls).toHaveLength(1);
  }
});

test("invalid calendar values fail before a permission snapshot or service invocation", async () => {
  const harness = createMetadataHarness();

  await expect(
    harness.handler(metadataContext({ scheduledAt: "2024-02-30T00:00:00Z" }))
  ).rejects.toMatchObject({ code: "validation_error", status: 400 });

  expect(harness.permissionCalls).toEqual([]);
  expect(harness.updateCalls).toEqual([]);
});

test("empty and recursively empty metadata fail before authorization or mutation", async () => {
  for (const body of [{}, { taxonomy: {} }, { seo: {} }, { unexpected: true }]) {
    const harness = createMetadataHarness();

    await expect(harness.handler(metadataContext(body))).rejects.toMatchObject({
      code: "validation_error",
      status: 400,
    });
    expect(harness.permissionCalls).toEqual([]);
    expect(harness.updateCalls).toEqual([]);
  }
});

test("a publish denial cannot reach the updater", async () => {
  const harness = createMetadataHarness({ deny: (requirement) => Array.isArray(requirement) });

  await expect(harness.handler(metadataContext({ status: "draft" }))).rejects.toThrow("forbidden");

  expect(harness.permissionCalls).toEqual([["content:write", "content:publish"]]);
  expect(harness.updateCalls).toEqual([]);
});

test("unexpected metadata service failures use the redacted route envelope", async () => {
  const sensitiveMessage = "driver password=do-not-expose";
  const harness = createMetadataHarness({
    update: async () => {
      throw new Error(sensitiveMessage);
    },
  });

  await expect(
    harness.handler(metadataContext({ seo: { description: "safe update" } }))
  ).rejects.toMatchObject({
    code: "post_metadata_update_failed",
    message: "Failed to update post metadata.",
    status: 500,
  });

  try {
    await harness.handler(metadataContext({ seo: { description: "safe update" } }));
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(sensitiveMessage);
    expect((error as Error).stack).not.toContain(sensitiveMessage);
  }
});

test("missing actors fail before validation, authorization, and mutation", async () => {
  const harness = createMetadataHarness();
  const anonymousContext: RouteContext = {
    params: { id: "post-1" },
    query: {},
    body: { status: "published" },
  };

  await expect(harness.handler(anonymousContext)).rejects.toThrow("auth_required");

  expect(harness.permissionCalls).toEqual([]);
  expect(harness.updateCalls).toEqual([]);
});

testIfDb(
  "real HTTP metadata updates keep writer scheduling intact and fail closed at publish, CSRF, and parser boundaries",
  async () => {
    resetRateLimitBuckets();
    const marker = `task-554-post-metadata-${randomUUID()}`;
    const userIds = new Set<string>();
    const roleIds = new Set<string>();
    const sessionIds = new Set<string>();
    const ledger: ExpectedAccessLog[] = [];
    let postId: string | null = null;
    let server: ReturnType<typeof startHttpServer> | null = null;
    let behaviorError: Error | null = null;
    let validationError: Error | null = null;
    let fixturesCleaned = false;
    let priorAdminWriteRateLimit: { windowSeconds: number; maxRequests: number } | null = null;
    const fallbackCleanupErrors: Error[] = [];

    const scope = (): AccessLogScope => ({
      marker,
      userIds,
      sessionIds,
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
            inArray(accessLogs.sessionId, [...sessionIds])
          )
        );
    const pollDeps: PollDeps = {
      query: queryCandidates,
      deleteExactIds: async (ids) => {
        if (ids.length === 0) return;
        await db.delete(accessLogs).where(inArray(accessLogs.id, [...ids]));
      },
      now: () => Date.now(),
      wait: (milliseconds) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, milliseconds);
        }),
    };
    const cleanupExactFixtures = async () => {
      if (postId) {
        await deletePost(postId);
        postId = null;
      }
      if (sessionIds.size > 0) {
        await db.delete(sessions).where(inArray(sessions.id, [...sessionIds]));
      }
      if (userIds.size > 0) {
        await db.delete(userRoles).where(inArray(userRoles.userId, [...userIds]));
      }
      if (roleIds.size > 0) {
        await db.delete(roles).where(inArray(roles.id, [...roleIds]));
      }
      if (userIds.size > 0) {
        await db.delete(users).where(inArray(users.id, [...userIds]));
      }
      fixturesCleaned = true;
    };
    const createActor = async (permissions: readonly string[]): Promise<HttpActor> => {
      const [user] = await db
        .insert(users)
        .values({
          email: `task-554-${randomUUID()}@example.test`,
          passwordHash: "test-hash",
          status: "active",
        })
        .returning({ id: users.id });
      if (!user) throw new Error("task_554_user_create_failed");
      userIds.add(user.id);

      const [role] = await db
        .insert(roles)
        .values({ name: `task-554-role-${randomUUID()}`, permissions: [...permissions] })
        .returning({ id: roles.id });
      if (!role) throw new Error("task_554_role_create_failed");
      roleIds.add(role.id);
      await db.insert(userRoles).values({ userId: user.id, roleId: role.id });

      const createdSession = await createSession({ userId: user.id, userAgent: marker });
      sessionIds.add(createdSession.session.id);
      const csrf = createCsrfToken();
      await setCsrfToken(createdSession.session.id, csrf.tokenHash);
      return {
        userId: user.id,
        roleId: role.id,
        sessionId: createdSession.session.id,
        token: createdSession.token,
        csrfToken: csrf.token,
      };
    };

    try {
      const writer = await createActor(["content:write"]);
      const publisher = await createActor(["content:write", "content:publish"]);
      const publishOnly = await createActor(["content:publish"]);
      const post = await createPost({
        title: `Task 554 ${marker}`,
        slug: `task-554-${randomUUID()}`,
        data: { excerpt: "metadata RBAC fixture" },
        authorId: writer.userId,
      });
      if (!post) throw new Error("task_554_post_create_failed");
      postId = post.id;
      const initialSchedule = new Date("2038-03-04T05:06:07.000Z");
      await updatePostMetadata(post.id, { scheduledAt: initialSchedule });

      const adminPath = await resolveAdminPath();
      server = startHttpServer({ port: 0 });
      const baseUrl = `http://127.0.0.1:${server.port}`;
      const host = configuredHost(
        await getSetting("site.adminBaseUrl"),
        `127.0.0.1:${server.port}`
      );
      const routePath = `${adminPath}/api/posts/${post.id}/metadata`;
      const url = `${baseUrl}${routePath}`;
      const headers = (
        actor?: HttpActor,
        csrfToken?: string,
        additional: Readonly<Record<string, string>> = {}
      ): Record<string, string> => ({
        Host: host,
        "User-Agent": marker,
        ...(actor ? { Cookie: `${SESSION_COOKIE_NAME}=${actor.token}` } : {}),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        "Content-Type": "application/json",
        ...additional,
      });
      const request = (
        actor: HttpActor | undefined,
        csrfToken: string | undefined,
        body: BodyInit,
        status: number,
        identity: AccessLogIdentity,
        additionalHeaders: Readonly<Record<string, string>> = {}
      ) =>
        trackedFetch(
          url,
          {
            method: "PATCH",
            headers: headers(actor, csrfToken, additionalHeaders),
            body,
          },
          { method: "PATCH", path: routePath, status, identity },
          marker,
          ledger
        );

      try {
        const anonymous = await request(
          undefined,
          undefined,
          JSON.stringify({ seo: { description: "anonymous" } }),
          401,
          { userId: null, sessionId: null }
        );
        expect(await responseErrorCode(anonymous)).toBe("auth_required");

        const anonymousInvalidSchema = await request(
          undefined,
          undefined,
          JSON.stringify({ unexpected: true }),
          401,
          { userId: null, sessionId: null }
        );
        expect(await responseErrorCode(anonymousInvalidSchema)).toBe("auth_required");

        const seoUpdate = await request(
          writer,
          writer.csrfToken,
          JSON.stringify({ seo: { description: "writer update" } }),
          200,
          { userId: writer.userId, sessionId: writer.sessionId }
        );
        expect((await seoUpdate.json()) as { id?: string }).toMatchObject({ id: post.id });
        expect((await getPost(post.id))?.scheduledAt?.getTime()).toBe(initialSchedule.getTime());

        const invalidCalendar = await request(
          writer,
          writer.csrfToken,
          JSON.stringify({ scheduledAt: "2038-02-30T05:06:07Z" }),
          400,
          { userId: writer.userId, sessionId: writer.sessionId }
        );
        expect(await responseErrorCode(invalidCalendar)).toBe("validation_error");

        const writerPublish = await request(
          writer,
          writer.csrfToken,
          JSON.stringify({ status: "published" }),
          403,
          { userId: writer.userId, sessionId: writer.sessionId }
        );
        expect(await responseErrorCode(writerPublish)).toBe("forbidden");
        expect((await getPost(post.id))?.status).toBe("draft");

        const publishOnlyWrite = await request(
          publishOnly,
          publishOnly.csrfToken,
          JSON.stringify({ tags: ["forbidden"] }),
          403,
          { userId: publishOnly.userId, sessionId: publishOnly.sessionId }
        );
        expect(await responseErrorCode(publishOnlyWrite)).toBe("forbidden");

        const missingCsrf = await request(
          publisher,
          undefined,
          JSON.stringify({ status: "published" }),
          403,
          { userId: publisher.userId, sessionId: publisher.sessionId }
        );
        expect(await responseErrorCode(missingCsrf)).toBe("csrf_invalid");

        const publisherUpdate = await request(
          publisher,
          publisher.csrfToken,
          JSON.stringify({ status: "published" }),
          200,
          { userId: publisher.userId, sessionId: publisher.sessionId }
        );
        expect((await publisherUpdate.json()) as { id?: string }).toMatchObject({ id: post.id });
        expect((await getPost(post.id))?.status).toBe("published");

        const malformed = await request(undefined, undefined, "{", 400, {
          userId: null,
          sessionId: null,
        });
        expect(await responseErrorCode(malformed)).toBe("invalid_json");

        const authenticatedMalformed = await request(writer, writer.csrfToken, "{", 400, {
          userId: null,
          sessionId: null,
        });
        expect(await responseErrorCode(authenticatedMalformed)).toBe("invalid_json");

        const oversizedBody = new Uint8Array(64 * 1024 + 1);
        const declaredTooLarge = await request(
          undefined,
          undefined,
          oversizedBody,
          413,
          { userId: null, sessionId: null },
          { "Content-Length": String(oversizedBody.byteLength) }
        );
        expect(await responseErrorCode(declaredTooLarge)).toBe("payload_too_large");

        const streamedTooLargeBody = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(oversizedBody);
            controller.close();
          },
        });
        const streamedTooLarge = await trackedFetch(
          url,
          {
            method: "PATCH",
            headers: headers(),
            body: streamedTooLargeBody,
            duplex: "half",
          } as RequestInit & { duplex: "half" },
          {
            method: "PATCH",
            path: routePath,
            status: 413,
            identity: { userId: null, sessionId: null },
          },
          marker,
          ledger
        );
        expect(await responseErrorCode(streamedTooLarge)).toBe("payload_too_large");

        const securitySettings = await getSecuritySettings();
        priorAdminWriteRateLimit = { ...securitySettings.rateLimit.buckets.admin_write };
        await setSecuritySettings({
          rateLimit: {
            buckets: {
              admin_write: {
                windowSeconds: priorAdminWriteRateLimit.windowSeconds,
                maxRequests: 1,
              },
            },
          },
        });
        resetRateLimitBuckets();
        const rateLimit = (await getSecuritySettings()).rateLimit;
        expect(rateLimit.enabled).toBe(true);
        const rateLimitMax = rateLimit.buckets.admin_write.maxRequests;
        expect(rateLimitMax).toBe(1);
        const rateLimitIdentity = { "X-Forwarded-For": "203.0.113.54" };
        for (let index = 0; index < rateLimitMax; index += 1) {
          const withinQuota = await request(
            undefined,
            undefined,
            "{",
            400,
            { userId: null, sessionId: null },
            rateLimitIdentity
          );
          expect(await responseErrorCode(withinQuota)).toBe("invalid_json");
        }
        const rateLimitedMalformed = await request(
          undefined,
          undefined,
          "{",
          429,
          { userId: null, sessionId: null },
          rateLimitIdentity
        );
        expect(await responseErrorCode(rateLimitedMalformed)).toBe("rate_limited");
      } catch (error) {
        behaviorError = error instanceof Error ? error : new Error("task_554_metadata_http_failed");
      }

      await server.stop(true);
      server = null;

      try {
        await validateAndCleanupAccessLogs(
          pollDeps,
          scope(),
          ledger.map(expectedAccessLogSignature),
          cleanupExactFixtures
        );
      } catch (error) {
        validationError =
          error instanceof Error ? error : new Error("task_554_access_log_validation_failed");
      }
    } catch (error) {
      if (!behaviorError) {
        behaviorError = error instanceof Error ? error : new Error("task_554_metadata_http_failed");
      }
    } finally {
      if (server) {
        try {
          await server.stop(true);
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("task_554_server_stop_failed")
          );
        }
      }
      resetRateLimitBuckets();
      if (priorAdminWriteRateLimit) {
        try {
          await setSecuritySettings({
            rateLimit: {
              buckets: {
                admin_write: priorAdminWriteRateLimit,
              },
            },
          });
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("task_554_rate_limit_restore_failed")
          );
        }
      }
      if (!fixturesCleaned) {
        try {
          const existing = await queryCandidates();
          const ownedIds = existing
            .filter((row) => isOwnedAccessLogCandidate(row, scope()))
            .map((row) => row.id);
          const drained = await drainExactAccessLogs(pollDeps, scope(), ownedIds);
          if (drained.scopeInvalid) {
            fallbackCleanupErrors.push(new Error("task_554_access_log_scope_invalid"));
          }
          if (drained.lateAfterDelete) {
            fallbackCleanupErrors.push(new Error("task_554_access_log_late_after_delete"));
          }
          if (drained.cleanupError) {
            fallbackCleanupErrors.push(drained.cleanupError);
          } else {
            await cleanupExactFixtures();
          }
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("task_554_fallback_cleanup_failed")
          );
        }
      }
    }

    const errors = [behaviorError, validationError, ...fallbackCleanupErrors].filter(
      (error): error is Error => error !== null
    );
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, "task_554_metadata_http_and_cleanup_failed");
    }
  },
  60_000
);
