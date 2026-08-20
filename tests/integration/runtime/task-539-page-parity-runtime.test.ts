// TASK-539-08-L01 — Nine-Flow Page Parity suite, runtime portion.
//
// Real-HTTP page mutation harness. Reaches the internal `/admin/api/pages`
// routes through a real ephemeral Bun server (startHttpServer({port:0})) with
// the configured Admin Host header, an owned X-Forwarded-For /32 allowlist row,
// a real session cookie, and a real CSRF token. It never imports or invokes
// registerPageRoutes or its handlers.
//
// Grounding: tests/integration/routes/userSettings.test.ts (access-log ledger,
// actor/CSRF/security-fixture patterns) and
// tests/integration/routes/support/userSettingsAccessLogHarness.ts (typed
// access-log validation/drain helpers imported as-is).
//
// Public fixture: a published footer template, one published public Form with
// one text field, one suite-owned saved listing query, and a published Page
// whose seamless marquee group carries an unsafe subtree (form + paired
// filters/collection consumers) so it degrades to ONE canonical segment.
import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, like, or } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  accessLogs,
  auditLogs,
  formFields,
  forms,
  ipAllowlist,
  listingQueries,
  pageRevisions,
  pages,
  pageTemplates,
  previewTokens,
  roles,
  sessions,
  settings,
  userRoles,
  users,
} from "../../../core/db/schema";
import { resolveRateLimitBucket, startHttpServer } from "../../../core/server/httpServer";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { resolveAdminPath } from "../../../core/server/utils/adminPath";
import {
  createCsrfToken,
  createSession,
  SESSION_COOKIE_NAME,
  setCsrfToken,
} from "../../../core/services/auth/sessionService";
import { createForm, setFormFields } from "../../../core/services/forms/formsService";
import { assertFormSubmissionNonce } from "../../../core/services/forms/submissionNonce";
import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { createPageTemplate } from "../../../core/services/pages/pageTemplateLibraryService";
import { SITE_FOOTER_TEMPLATE_SETTING_KEY } from "../../../core/services/pages/publicSiteShell";
import {
  deleteSetting,
  getSetting,
  getSettingRecord,
  setSetting,
} from "../../../core/services/settings/settingsService";
import {
  getSecuritySettings,
  resetSecuritySettingsCache,
  setSecuritySettings,
} from "../../../core/services/settings/securitySettings";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
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
} from "../routes/support/userSettingsAccessLogHarness";

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

const countOccurrences = (haystack: string, needle: string): number => {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
};

const responseErrorCode = async (response: Response): Promise<string | null> => {
  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
};

const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error) && typeof error === "object" && (error as { code?: unknown }).code === "23505";

type HttpActor = Readonly<{
  kind: "reader" | "writer" | "publisher";
  userId: string;
  roleId: string;
  sessionId: string;
  sessionToken: string;
  csrfToken: string;
}>;

const createHttpActor = async (
  kind: HttpActor["kind"],
  permissions: readonly string[],
  marker: string,
  displayName?: string
): Promise<HttpActor> => {
  const userId = randomUUID();
  const roleId = randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      email: `wf539-parity-${kind}-${userId}@example.test`,
      passwordHash: "hash",
      status: "active",
      ...(displayName ? { name: displayName } : {}),
    })
    .returning();
  if (!user) throw new Error("wf539_actor_user_missing");
  await db.insert(roles).values({
    id: roleId,
    name: `wf539-parity-${kind}-${randomUUID()}`,
    permissions: [...permissions],
  });
  await db.insert(userRoles).values({ userId, roleId });
  const created = await createSession({ userId, userAgent: marker });
  const csrf = createCsrfToken();
  await setCsrfToken(created.session.id, csrf.tokenHash);
  return {
    kind,
    userId,
    roleId,
    sessionId: created.session.id,
    sessionToken: created.token,
    csrfToken: csrf.token,
  };
};

const insertAllowlistRow = async (marker: string): Promise<{ id: string; ip: string }> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ip = `198.51.100.${Math.floor(Math.random() * 250) + 2}`;
    try {
      const [row] = await db
        .insert(ipAllowlist)
        .values({ cidr: `${ip}/32`, label: `wf539-parity-${marker}` })
        .returning();
      if (row) return { id: row.id, ip };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("wf539_allowlist_candidate_exhausted");
};

const footerTemplateDocument = (token: string) => {
  const document = createDefaultPageDocumentV2();
  const heading = createPageBlockV2("heading", {
    id: `blk-footer-${token}`,
    props: { text: `Footer columns ${token}`, level: "h2", align: "left" },
  });
  const section = createPageSectionV2("content", {
    id: `sec-footer-${token}`,
    blocks: [heading],
  });
  return { ...document, sections: [section] };
};

const buildParityPageDocument = (formId: string, queryId: string) => {
  const formBlock = createPageBlockV2("form", {
    id: "blk-parity-form",
    props: { formId, title: "Parity contact form" },
  });
  const filtersBlock = createPageBlockV2("filters", {
    id: "blk-parity-filters",
    props: { queryId, showCount: true },
  });
  const collectionBlock = createPageBlockV2("collection", {
    id: "blk-parity-collection",
    props: {
      contentTypeId: "",
      queryId,
      limit: 1,
      templateId: null,
      paginationMode: "none",
      pageSize: null,
    },
  });
  const marqueeGroup = createPageBlockV2("group", {
    id: "blk-parity-marquee",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee: { speed: 18, direction: "left", seamless: true } },
    slots: {
      children: [formBlock, filtersBlock, collectionBlock],
    },
  });
  const section = createPageSectionV2("content", {
    id: "sec-parity",
    blocks: [marqueeGroup],
  });
  const document = createDefaultPageDocumentV2();
  return { ...document, sections: [section] };
};

testIfDb(
  "real HTTP page parity: RBAC, CSRF, unknown-field rejection, autosave, publish, and public render with canonical unsafe marquee segment",
  async () => {
    resetRateLimitBuckets();
    // A hard `bun test` timeout can kill a run before its `finally` cleanup;
    // sweep only this suite family's own allowlist rows left by such a run.
    await db.delete(ipAllowlist).where(like(ipAllowlist.label, "wf539-parity-%"));
    const marker = `wf539-page-parity-${randomUUID()}`;
    const slug = `/wf539-parity-${randomUUID().slice(0, 8)}`;
    const token = randomUUID().slice(0, 8);
    const publisherDisplayName = `wf539-parity-user-${token}`;
    const ledger: ExpectedAccessLog[] = [];
    const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

    const actorIds: string[] = [];
    const roleIds: string[] = [];
    const sessionIds: string[] = [];
    let ownedPageIds: string[] = [];
    let ownedTemplateId: string | null = null;
    let ownedFormId: string | null = null;
    let ownedQueryId: string | null = null;
    let allowlistId: string | null = null;
    let forwardedIp = "127.0.0.1";
    let server: ReturnType<typeof startHttpServer> | null = null;
    let behaviorError: Error | null = null;
    let validationError: Error | null = null;
    let fixturesCleaned = false;
    const fallbackCleanupErrors: Error[] = [];

    const nonceSecretPresent = Object.prototype.hasOwnProperty.call(
      process.env,
      "FORM_SUBMIT_NONCE_SECRET"
    );
    const nonceSecretPrior = process.env.FORM_SUBMIT_NONCE_SECRET;
    const nonceSecretValue = `wf539-page-parity-${randomUUID()}`;

    let rawSecuritySnapshot: { exists: boolean; value: unknown; updatedAt: Date | null } = {
      exists: false,
      value: null,
      updatedAt: null,
    };

    const rememberSetting = async (key: string) => {
      if (settingSnapshots.has(key)) return;
      const row = await getSettingRecord(key);
      settingSnapshots.set(key, { exists: Boolean(row), value: row?.value });
    };
    const setTestSetting = async (key: string, value: unknown) => {
      await rememberSetting(key);
      await setSetting(key, value);
    };

    const restoreSettings = async () => {
      for (const [key, snapshot] of [...settingSnapshots].reverse()) {
        if (snapshot.exists) {
          await setSetting(key, snapshot.value);
        } else {
          await deleteSetting(key);
        }
      }
      settingSnapshots.clear();
    };

    const currentScope = (): AccessLogScope => ({
      marker,
      userIds: new Set(actorIds),
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
            inArray(accessLogs.userId, [...actorIds]),
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
      await restoreSettings();
      if (ownedTemplateId) {
        await db.delete(pageTemplates).where(eq(pageTemplates.id, ownedTemplateId));
      }
      if (ownedPageIds.length > 0) {
        await db.delete(auditLogs).where(inArray(auditLogs.targetId, [...ownedPageIds]));
        await db
          .delete(previewTokens)
          .where(
            and(
              eq(previewTokens.targetType, "page"),
              inArray(previewTokens.targetId, [...ownedPageIds])
            )
          );
        await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, [...ownedPageIds]));
        await db.delete(pages).where(inArray(pages.id, [...ownedPageIds]));
      }
      if (ownedFormId) {
        await db.delete(formFields).where(eq(formFields.formId, ownedFormId));
        await db.delete(forms).where(eq(forms.id, ownedFormId));
      }
      if (ownedQueryId) {
        await db.delete(listingQueries).where(eq(listingQueries.id, ownedQueryId));
      }
      if (sessionIds.length > 0) {
        await db.delete(sessions).where(inArray(sessions.id, [...sessionIds]));
      }
      if (roleIds.length > 0 && actorIds.length > 0) {
        await db
          .delete(userRoles)
          .where(
            or(inArray(userRoles.userId, [...actorIds]), inArray(userRoles.roleId, [...roleIds]))
          );
      }
      if (roleIds.length > 0) {
        await db.delete(roles).where(inArray(roles.id, [...roleIds]));
      }
      if (actorIds.length > 0) {
        await db.delete(users).where(inArray(users.id, [...actorIds]));
      }
      fixturesCleaned = true;
    };

    const snapshotOwnedMutationState = async (
      slugs: readonly string[],
      pageIds: readonly string[]
    ) => {
      const ownedPageRows =
        slugs.length > 0 || pageIds.length > 0
          ? await db
              .select({
                id: pages.id,
                slug: pages.slug,
                title: pages.title,
                status: pages.status,
                currentData: pages.currentData,
                publishedData: pages.publishedData,
              })
              .from(pages)
              .where(
                or(
                  ...(slugs.length > 0 ? [inArray(pages.slug, [...slugs])] : []),
                  ...(pageIds.length > 0 ? [inArray(pages.id, [...pageIds])] : [])
                )
              )
              .orderBy(pages.slug)
          : [];
      const ownedRevisionRows =
        pageIds.length > 0
          ? await db
              .select({
                id: pageRevisions.id,
                pageId: pageRevisions.pageId,
                version: pageRevisions.version,
                kind: pageRevisions.kind,
                data: pageRevisions.data,
                createdBy: pageRevisions.createdBy,
              })
              .from(pageRevisions)
              .where(inArray(pageRevisions.pageId, [...pageIds]))
              .orderBy(pageRevisions.pageId, pageRevisions.version)
          : [];
      const ownedAuditRows =
        pageIds.length > 0
          ? await db
              .select({
                id: auditLogs.id,
                action: auditLogs.action,
                targetId: auditLogs.targetId,
                actorId: auditLogs.actorId,
                metadata: auditLogs.metadata,
              })
              .from(auditLogs)
              .where(inArray(auditLogs.targetId, [...pageIds]))
              .orderBy(auditLogs.action, auditLogs.id)
          : [];
      return {
        pages: ownedPageRows,
        revisions: ownedRevisionRows,
        audits: ownedAuditRows,
      };
    };

    const createOwnedListingQuery = async (ownedUserId: string): Promise<string> => {
      const id = randomUUID();
      await db.insert(listingQueries).values({
        id,
        name: `wf539-parity-query-${token}`,
        query: {
          source: "users",
          sourceConfig: {},
          filters: [{ field: "id", op: "eq", value: ownedUserId }],
          sort: [{ field: "id", dir: "asc" }],
          pagination: { limit: 1, offset: 0 },
          fields: ["id", "name", "status"],
        },
      });
      return id;
    };

    try {
      process.env.FORM_SUBMIT_NONCE_SECRET = nonceSecretValue;

      const [rawSecurityRow] = await db
        .select({ value: settings.value, updatedAt: settings.updatedAt })
        .from(settings)
        .where(eq(settings.key, "security.settings"));
      rawSecuritySnapshot = {
        exists: Boolean(rawSecurityRow),
        value: rawSecurityRow?.value ?? null,
        updatedAt: rawSecurityRow?.updatedAt ?? null,
      };
      resetSecuritySettingsCache();
      await setSecuritySettings({
        csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
        rateLimit: {
          enabled: true,
          buckets: { admin_write: { windowSeconds: 60, maxRequests: 100 } },
        },
        botProtection: { enabled: false },
      });
      const appliedSecurity = await getSecuritySettings();
      expect(appliedSecurity.csrf).toEqual({
        enabled: true,
        headerName: "x-csrf-token",
        tokenTtlMinutes: 30,
      });
      expect(appliedSecurity.rateLimit.enabled).toBe(true);
      expect(appliedSecurity.rateLimit.buckets.admin_write).toEqual({
        windowSeconds: 60,
        maxRequests: 100,
      });
      expect(appliedSecurity.botProtection.enabled).toBe(false);
      const allowlist = await insertAllowlistRow(marker);
      allowlistId = allowlist.id;
      forwardedIp = allowlist.ip;
      resetRateLimitBuckets();

      const reader = await createHttpActor("reader", ["content:read"], marker);
      const writer = await createHttpActor("writer", ["content:read", "content:write"], marker);
      const publisher = await createHttpActor(
        "publisher",
        ["content:read", "content:write", "content:publish"],
        marker,
        publisherDisplayName
      );
      for (const actor of [reader, writer, publisher]) {
        actorIds.push(actor.userId);
        roleIds.push(actor.roleId);
        sessionIds.push(actor.sessionId);
      }
      const ownedUserId = publisher.userId;

      const adminPath = await resolveAdminPath();
      server = startHttpServer({ port: 0 });
      const baseUrl = `http://127.0.0.1:${server.port}`;
      const fallbackHost = `127.0.0.1:${server.port}`;
      const adminHost = configuredHost(await getSetting("site.adminBaseUrl"), fallbackHost);
      const publicHost = configuredHost(await getSetting("site.publicBaseUrl"), fallbackHost);

      await setTestSetting("site.cacheTtlSeconds", 0);
      await setTestSetting("site.contentRoutes", []);
      await setTestSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, null);

      const footerTemplate = await createPageTemplate({
        name: `WF539 Footer ${token}`,
        document: footerTemplateDocument(token),
        status: "published",
      });
      ownedTemplateId = footerTemplate.id;
      await setSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, footerTemplate.id);

      const ownedForm = await createForm({
        name: `WF539 Form ${token}`,
        slug: `wf539-form-${token}`,
        status: "published",
      });
      ownedFormId = ownedForm?.id ?? null;
      if (!ownedFormId) throw new Error("wf539_form_missing");
      await setFormFields(ownedFormId, [
        {
          type: "text",
          label: "Name",
          name: "name",
          required: true,
          settings: {},
          orderIndex: 0,
        },
      ]);

      ownedQueryId = await createOwnedListingQuery(ownedUserId);

      const identityOf = (actor: HttpActor): AccessLogIdentity => ({
        userId: actor.userId,
        sessionId: actor.sessionId,
      });
      const anonymous: AccessLogIdentity = { userId: null, sessionId: null };

      const pageRequest = async (
        method: string,
        routeSuffix: string,
        actor: HttpActor | null,
        csrf: string | null,
        body: unknown,
        expectedStatus: number
      ): Promise<Response> => {
        const url = `${baseUrl}${adminPath}/api${routeSuffix}`;
        const headers: Record<string, string> = {
          Host: adminHost,
          "User-Agent": marker,
          "X-Forwarded-For": forwardedIp,
        };
        if (actor) {
          headers.Cookie = `${SESSION_COOKIE_NAME}=${actor.sessionToken}`;
        }
        if (csrf) {
          headers["X-CSRF-Token"] = csrf;
        }
        const init: RequestInit = { method, headers };
        if (body !== undefined) {
          headers["Content-Type"] = "application/json";
          init.body = JSON.stringify(body);
        }
        const identity = actor ? identityOf(actor) : anonymous;
        return trackedFetch(
          url,
          init,
          {
            method: method.toUpperCase(),
            path: new URL(url).pathname,
            status: expectedStatus,
            identity,
          },
          marker,
          ledger
        );
      };

      try {
        expect(resolveRateLimitBucket("POST", "/pages")).toBe("admin_write");
        expect(resolveRateLimitBucket("PATCH", "/pages/:id")).toBe("admin_write");
        expect(resolveRateLimitBucket("POST", "/pages/:id/autosave")).toBe("admin_write");
        expect(resolveRateLimitBucket("POST", "/pages/:id/publish")).toBe("admin_write");

        const initialDocument = buildParityPageDocument(ownedFormId, ownedQueryId);
        const initialTitle = `Parity Page ${token}`;

        // 1) unauthenticated create -> 401 / auth_required, zero mutation.
        let before = await snapshotOwnedMutationState([slug], []);
        const unauthenticated = await pageRequest(
          "POST",
          "/pages",
          null,
          null,
          { title: initialTitle, slug, data: initialDocument },
          401
        );
        expect(await responseErrorCode(unauthenticated)).toBe("auth_required");
        expect(await snapshotOwnedMutationState([slug], [])).toEqual(before);

        // 2) writer create missing CSRF -> 403 / csrf_invalid, zero mutation.
        const missingCsrf = await pageRequest(
          "POST",
          "/pages",
          writer,
          null,
          { title: initialTitle, slug, data: initialDocument },
          403
        );
        expect(await responseErrorCode(missingCsrf)).toBe("csrf_invalid");
        expect(await snapshotOwnedMutationState([slug], [])).toEqual(before);

        // 3) writer create with an invalid CSRF token -> 403 / csrf_invalid.
        const invalidCsrf = await pageRequest(
          "POST",
          "/pages",
          writer,
          "invalid-csrf-token",
          { title: initialTitle, slug, data: initialDocument },
          403
        );
        expect(await responseErrorCode(invalidCsrf)).toBe("csrf_invalid");
        expect(await snapshotOwnedMutationState([slug], [])).toEqual(before);

        // 4) reader create with a valid CSRF token -> 403 / forbidden.
        const readerWrite = await pageRequest(
          "POST",
          "/pages",
          reader,
          reader.csrfToken,
          { title: initialTitle, slug, data: initialDocument },
          403
        );
        expect(await responseErrorCode(readerWrite)).toBe("forbidden");
        expect(await snapshotOwnedMutationState([slug], [])).toEqual(before);

        // 5) writer create with valid CSRF -> 200 and a tracked Page ID.
        const createdResponse = await pageRequest(
          "POST",
          "/pages",
          writer,
          writer.csrfToken,
          { title: initialTitle, slug, data: initialDocument },
          200
        );
        const createdPage = (await createdResponse.json()) as {
          id: string;
          title: string;
          slug: string;
          status: string;
        };
        expect(createdPage.id).toBeTruthy();
        expect(createdPage.title).toBe(initialTitle);
        expect(createdPage.slug).toBe(slug);
        expect(createdPage.status).toBe("draft");
        ownedPageIds = [createdPage.id];

        // 6) writer update with valid CSRF -> 200 with exact current-document persistence.
        const updatedDocument = buildParityPageDocument(ownedFormId, ownedQueryId);
        const updatedResponse = await pageRequest(
          "PATCH",
          `/pages/${createdPage.id}`,
          writer,
          writer.csrfToken,
          { title: `${initialTitle} Updated`, data: updatedDocument },
          200
        );
        const updatedPage = (await updatedResponse.json()) as {
          title: string;
          currentData: unknown;
        };
        expect(updatedPage.title).toBe(`${initialTitle} Updated`);
        const [storedAfterUpdate] = await db
          .select({ currentData: pages.currentData, title: pages.title })
          .from(pages)
          .where(eq(pages.id, createdPage.id));
        expect(storedAfterUpdate?.title).toBe(`${initialTitle} Updated`);
        expect(storedAfterUpdate?.currentData).toEqual(updatedPage.currentData);
        before = await snapshotOwnedMutationState([slug], ownedPageIds);

        // 7) writer update with one nested unknown PageDocumentV2 member ->
        //    400 / page_document_unknown_field with the error path and zero mutation.
        const unknownMemberDocument = buildParityPageDocument(ownedFormId, ownedQueryId);
        const marqueeGroup = unknownMemberDocument.sections[0]!.blocks[0]!;
        const formChild = marqueeGroup.slots!.children![0]!;
        (formChild.props as Record<string, unknown>).unknownField = "nope";
        const unknownFieldResponse = await pageRequest(
          "PATCH",
          `/pages/${createdPage.id}`,
          writer,
          writer.csrfToken,
          { data: unknownMemberDocument },
          400
        );
        const unknownFieldBody = (await unknownFieldResponse.json()) as {
          error?: { code?: string; details?: { path?: string } };
        };
        expect(unknownFieldBody.error?.code).toBe("page_document_unknown_field");
        expect(unknownFieldBody.error?.details).toEqual({
          path: "sections.0.blocks.0.slots.children.0.props.unknownField",
        });
        expect(await snapshotOwnedMutationState([slug], ownedPageIds)).toEqual(before);

        // 8) writer autosave with valid CSRF -> 200 and exactly one owned
        //    autosave revision.
        const autosaveResponse = await pageRequest(
          "POST",
          `/pages/${createdPage.id}/autosave`,
          writer,
          writer.csrfToken,
          { title: `${initialTitle} Autosave`, data: updatedDocument },
          200
        );
        const autosaveBody = (await autosaveResponse.json()) as {
          revision?: { id: string; kind: string };
        };
        expect(autosaveBody.revision?.kind).toBe("autosave");
        const autosaveRevisions = await db
          .select({ kind: pageRevisions.kind })
          .from(pageRevisions)
          .where(eq(pageRevisions.pageId, createdPage.id));
        expect(autosaveRevisions).toEqual([{ kind: "autosave" }]);

        // 9) writer publish with valid CSRF -> 403 / forbidden, preserving the
        //    draft bytes, the autosave inventory, zero publish revision, and
        //    zero publish audit.
        const [draftBeforePublish] = await db
          .select({ currentData: pages.currentData, publishedData: pages.publishedData })
          .from(pages)
          .where(eq(pages.id, createdPage.id));
        const beforeForbiddenPublish = await snapshotOwnedMutationState([slug], ownedPageIds);
        const writerPublish = await pageRequest(
          "POST",
          `/pages/${createdPage.id}/publish`,
          writer,
          writer.csrfToken,
          { data: updatedDocument },
          403
        );
        expect(await responseErrorCode(writerPublish)).toBe("forbidden");
        expect(await snapshotOwnedMutationState([slug], ownedPageIds)).toEqual(
          beforeForbiddenPublish
        );
        const [draftAfterForbiddenPublish] = await db
          .select({ currentData: pages.currentData, publishedData: pages.publishedData })
          .from(pages)
          .where(eq(pages.id, createdPage.id));
        expect(draftAfterForbiddenPublish?.currentData).toEqual(draftBeforePublish?.currentData);
        expect(draftAfterForbiddenPublish?.publishedData).toBeNull();
        const publishAuditsAfterForbidden = await db
          .select({ action: auditLogs.action })
          .from(auditLogs)
          .where(eq(auditLogs.targetId, createdPage.id));
        expect(publishAuditsAfterForbidden).toEqual([]);

        // 10) publisher publish with valid CSRF -> 200 with published/current
        //     parity, exactly one publish revision, and exactly one
        //     pages.publish audit row.
        const publishResponse = await pageRequest(
          "POST",
          `/pages/${createdPage.id}/publish`,
          publisher,
          publisher.csrfToken,
          { data: updatedDocument },
          200
        );
        const publishBody = (await publishResponse.json()) as {
          ok: boolean;
          page: {
            id: string;
            status: string;
            currentData: unknown;
            publishedData: unknown;
          };
        };
        expect(publishBody.ok).toBe(true);
        expect(publishBody.page.id).toBe(createdPage.id);
        expect(publishBody.page.status).toBe("published");
        expect(publishBody.page.publishedData).toEqual(publishBody.page.currentData);

        const publishRevisions = await db
          .select({ kind: pageRevisions.kind, createdBy: pageRevisions.createdBy })
          .from(pageRevisions)
          .where(eq(pageRevisions.pageId, createdPage.id))
          .orderBy(pageRevisions.version);
        expect(publishRevisions).toEqual([
          { kind: "autosave", createdBy: writer.userId },
          { kind: "publish", createdBy: publisher.userId },
        ]);
        const publishAudits = await db
          .select({ action: auditLogs.action, actorId: auditLogs.actorId })
          .from(auditLogs)
          .where(eq(auditLogs.targetId, createdPage.id));
        expect(publishAudits).toEqual([{ action: "pages.publish", actorId: publisher.userId }]);

        // Public render from the same ephemeral server with the public Host
        // (or loopback fallback) and the owned X-Forwarded-For.
        const publicResponse = await fetch(`${baseUrl}${slug}`, {
          headers: {
            Host: publicHost,
            "User-Agent": marker,
            "X-Forwarded-For": forwardedIp,
          },
        });
        expect(publicResponse.status).toBe(200);
        const publicHtml = await publicResponse.text();

        // One canonical marquee: exactly one rendered viewport/rail/segment
        // frame (the TASK-539-04 composition CSS also names those classes, so
        // the counts pin the rendered <div> frames, not the style rules).
        expect(countOccurrences(publicHtml, '<div class="cx-marquee-viewport">')).toBe(1);
        expect(countOccurrences(publicHtml, '<div class="cx-marquee-rail">')).toBe(1);
        expect(countOccurrences(publicHtml, '<div class="cx-marquee-segment">')).toBe(1);
        expect(countOccurrences(publicHtml, 'data-marquee=""')).toBe(1);
        expect(publicHtml).not.toContain("data-page-marquee-replica");
        expect(publicHtml).not.toContain("cx-mrq-");

        // One contact-form surface: the rendered <form> with data-form-id
        // carries the nextless runtime marker once, and the form runtime
        // <script> names that exact attribute in its FORM_SELECTOR constant
        // (legit second string occurrence). The filters block owns a separate
        // listing-runtime form surface (data-listing-runtime-form).
        expect(countOccurrences(publicHtml, "data-form-id=")).toBe(1);
        expect(countOccurrences(publicHtml, 'data-nextless-form-runtime="1"')).toBe(2);
        expect(countOccurrences(publicHtml, 'data-listing-runtime-form="true"')).toBe(1);
        expect(countOccurrences(publicHtml, 'data-form-security-nonce="1"')).toBe(1);
        expect(countOccurrences(publicHtml, 'data-form-root="true"')).toBe(1);
        const nonceMatch = publicHtml.match(
          /data-form-security-nonce="1"\s+name="__nl_form_nonce"\s+value="(\d+\.[0-9a-f]{64})"/
        );
        expect(nonceMatch?.[1]).toBeTruthy();
        if (nonceMatch?.[1]) {
          expect(() => assertFormSubmissionNonce(ownedFormId!, nonceMatch[1])).not.toThrow();
        }

        expect(countOccurrences(publicHtml, 'data-page-filters-block="true"')).toBe(1);
        expect(countOccurrences(publicHtml, 'data-page-filters-count="1"')).toBe(1);
        expect(publicHtml).toContain("1 result");
        expect(publicHtml).toContain(`data-listing-query-id="${ownedQueryId}"`);

        expect(countOccurrences(publicHtml, 'data-content-list-items="1"')).toBe(1);
        expect(countOccurrences(publicHtml, 'data-content-list-item="1"')).toBe(1);
        // The single row renders the unique publisher display name in its
        // title, meta span, and CTA aria-label (three strings, one card).
        expect(publicHtml).toContain(publisherDisplayName);

        expect(countOccurrences(publicHtml, 'data-coderso-runtime-script="listing-runtime"')).toBe(
          1
        );

        expect(publicHtml).toContain('data-page-v2="true"');
        expect(countOccurrences(publicHtml, '<style data-page-composition-css="true">')).toBe(1);
        expect(
          countOccurrences(publicHtml, '<footer class="site-footer" data-site-footer="true">')
        ).toBe(1);
        expect(publicHtml).toContain(`Footer columns ${token}`);
        // The header nav CSS selectors always ship; the rendered <header>
        // element itself must stay absent with no navigation configured.
        expect(publicHtml).not.toContain("<header");
      } catch (error) {
        behaviorError = error instanceof Error ? error : new Error("wf539_page_parity_failed");
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
        validationError = error instanceof Error ? error : new Error("wf539_access_log_failed");
      }
    } catch (error) {
      if (!behaviorError) {
        behaviorError = error instanceof Error ? error : new Error("wf539_page_parity_failed");
      }
    } finally {
      if (server) {
        try {
          await server.stop(true);
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("wf539_server_stop_failed")
          );
        }
      }
      if (nonceSecretPresent) {
        process.env.FORM_SUBMIT_NONCE_SECRET = nonceSecretPrior;
      } else {
        delete process.env.FORM_SUBMIT_NONCE_SECRET;
      }
      try {
        if (rawSecuritySnapshot.exists && rawSecuritySnapshot.updatedAt) {
          await db
            .insert(settings)
            .values({
              key: "security.settings",
              value: rawSecuritySnapshot.value,
              updatedAt: rawSecuritySnapshot.updatedAt,
            })
            .onConflictDoUpdate({
              target: settings.key,
              set: {
                value: rawSecuritySnapshot.value,
                updatedAt: rawSecuritySnapshot.updatedAt,
              },
            });
        } else {
          await db.delete(settings).where(eq(settings.key, "security.settings"));
        }
      } catch (error) {
        fallbackCleanupErrors.push(
          error instanceof Error ? error : new Error("wf539_security_restore_failed")
        );
      }
      resetSecuritySettingsCache();
      if (allowlistId) {
        try {
          await db.delete(ipAllowlist).where(eq(ipAllowlist.id, allowlistId));
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("wf539_allowlist_delete_failed")
          );
        }
      }
      resetRateLimitBuckets();
      clearSiteCache();
      if (!fixturesCleaned) {
        try {
          const scope = currentScope();
          const remaining = await queryCandidates();
          const initialIds = remaining
            .filter((row) => isOwnedAccessLogCandidate(row, scope))
            .map(({ id }) => id);
          const drained = await drainExactAccessLogs(pollDeps, scope, initialIds);
          if (drained.scopeInvalid) {
            fallbackCleanupErrors.push(new Error("wf539_access_log_scope_invalid"));
          }
          if (drained.lateAfterDelete) {
            fallbackCleanupErrors.push(new Error("wf539_access_log_late_after_delete"));
          }
          if (drained.cleanupError) {
            fallbackCleanupErrors.push(drained.cleanupError);
          } else {
            await cleanupExactFixtures();
          }
        } catch (error) {
          fallbackCleanupErrors.push(
            error instanceof Error ? error : new Error("wf539_fallback_cleanup_failed")
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
      throw new AggregateError(finalErrors, "wf539_page_parity_http_and_log_validation_failed");
    }
  },
  60_000 // warm shared-DB run measures ~40s; the CLI --timeout=30000 default is only a floor
);
