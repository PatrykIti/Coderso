import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  roles,
  sessions,
  userRoles,
  users,
} from "../../../core/db/schema";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import { createContentType } from "../../../core/services/content/typeService";
import { createSession } from "../../../core/services/auth/sessionService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const hasDb = Boolean(process.env.DATABASE_URL);
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 30_000;

// No import-time DB probe (pages-runtime lane pattern): a postgres.js pool
// 'error' during an eager select 1 can kill the whole bun test process when
// the pooler briefly rejects. Test bodies fail loudly if the DB is down.

const trackedUserIds = new Set<string>();
const trackedRoleIds = new Set<string>();
const trackedSessionIds = new Set<string>();
const trackedEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const trackedDetailPageIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const rememberSetting = async (key: string) => {
  if (settingSnapshots.has(key)) return;
  const row = await getSettingRecord(key);
  settingSnapshots.set(key, {
    exists: Boolean(row),
    value: row?.value,
  });
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

const cleanupTrackedRows = async () => {
  const detailPageIds = [...trackedDetailPageIds];
  const entryIds = [...trackedEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const sessionIds = [...trackedSessionIds];
  const roleIds = [...trackedRoleIds];
  const userIds = [...trackedUserIds];

  if (detailPageIds.length > 0) {
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, detailPageIds));
  }
  if (entryIds.length > 0) {
    await db.delete(contentEntries).where(inArray(contentEntries.id, entryIds));
  }
  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }
  if (sessionIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.id, sessionIds));
  }
  if (roleIds.length > 0) {
    await db.delete(userRoles).where(inArray(userRoles.roleId, roleIds));
    await db.delete(roles).where(inArray(roles.id, roleIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedDetailPageIds.clear();
  trackedEntryIds.clear();
  trackedContentTypeIds.clear();
  trackedSessionIds.clear();
  trackedRoleIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const requestPublicPath = (path: string, sessionToken?: string) => {
  const headers: Record<string, string> = {
    "user-agent": "entry-visibility-gate-test",
    "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
  };
  if (sessionToken) headers.cookie = `session=${sessionToken}`;
  return handlePublicRequest(new Request(`http://public.coderso.test${path}`, { headers }));
};

const createActor = async (emailPrefix: string) => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `${emailPrefix}-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_visibility_gate_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

const createRole = async (permissions: string[]) => {
  const [role] = await db
    .insert(roles)
    .values({
      name: `vis-gate-role-${randomUUID()}`,
      description: "Test role",
      permissions,
      createdAt: new Date(),
    })
    .returning();
  if (!role?.id) throw new Error("missing_visibility_gate_role");
  trackedRoleIds.add(role.id);
  return role;
};

const createSessionForUser = async (userId: string) => {
  const { token, session } = await createSession({ userId });
  if (!session) throw new Error("missing_visibility_gate_session");
  trackedSessionIds.add(session.id);
  return token;
};

const grantContentRead = async (userId: string) => {
  const role = await createRole(["content:read"]);
  await db.insert(userRoles).values({ userId, roleId: role.id });
  return role;
};

const createContentTypeFixture = async (slugPrefix: string) => {
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Vis gate ${slugPrefix} ${token}`,
    slug: `${slugPrefix}-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { headline: { type: "string", xFieldType: "text" } },
    },
  });
  trackedContentTypeIds.add(contentType.id);
  return { contentType, token };
};

const seedEntry = async (input: {
  contentTypeId: string;
  slug: string;
  title: string;
  visibility: "public" | "private" | "password";
  accessPassword?: string;
}) => {
  const actor = await createActor("vis-gate-actor");
  const entry = await createEntry(input.contentTypeId, {
    title: input.title,
    slug: input.slug,
    authorId: actor.id,
    data: { headline: `${input.title} headline` },
  });
  if (!entry) throw new Error("missing_visibility_gate_entry");
  trackedEntryIds.add(entry.id);
  await updateEntryMetadata(
    entry.id,
    {
      status: "published",
      visibility: input.visibility,
      ...(input.accessPassword !== undefined ? { accessPassword: input.accessPassword } : {}),
    },
    actor.id
  );
  return entry;
};

const insertPublishedDetailPageDocument = async (input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
}) => {
  const baseDocument: DetailPageDocument = {
    schemaVersion: 1,
    id: input.id,
    name: "Vis gate detail page",
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: "published",
    titlePattern: "{{ title }}",
    settings: {
      template: "detail",
      layout: {
        wrapper: {
          container: "default",
          padding: { top: "md", bottom: "lg" },
          background: {
            color: "#ffffff",
            image: null,
            media: { type: "none", source: "external", src: null },
          },
        },
        sections: {
          gap: "lg",
          defaults: {
            container: "default",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "none" },
          },
        },
        applyDefaultsToNewBlocks: false,
      },
    },
    blocks: [
      {
        id: "hero",
        type: "hero",
        variant: "centered",
        data: {
          headline: "Linked gate detail headline",
          body: "Linked gate detail body",
        },
      },
    ],
    bindings: [
      {
        id: "binding-headline",
        blockId: "hero",
        propPath: "headline",
        source: { kind: "entry-field", field: "headline" },
        transform: "text",
        required: true,
      },
    ],
  };
  const document = normalizeDetailPageDocument(baseDocument);
  await db.insert(detailPageDocuments).values({
    id: input.id,
    name: "Vis gate detail page",
    contentTypeId: input.contentTypeId,
    status: "published",
    currentDocument: document,
    publishedDocument: document,
  });
  trackedDetailPageIds.add(input.id);
};

const seedDefaultGateFixture = async () => {
  const { contentType } = await createContentTypeFixture("gate-default");
  const publicEntry = await seedEntry({
    contentTypeId: contentType.id,
    slug: `gate-public-${randomUUID().slice(0, 8)}`,
    title: "Gate public entry",
    visibility: "public",
  });
  const privateEntry = await seedEntry({
    contentTypeId: contentType.id,
    slug: `gate-private-${randomUUID().slice(0, 8)}`,
    title: "Gate private entry",
    visibility: "private",
  });
  const passwordEntry = await seedEntry({
    contentTypeId: contentType.id,
    slug: `gate-password-${randomUUID().slice(0, 8)}`,
    title: "Gate password entry",
    visibility: "password",
    accessPassword: "correct-horse-battery-staple",
  });
  await setTestSetting("site.cacheTtlSeconds", 0);
  await setTestSetting("site.contentRoutes", [
    {
      type: contentType.slug,
      listPath: `/${contentType.slug}`,
      detailPath: `/${contentType.slug}/:slug`,
      enabled: true,
      detailPageId: null,
    } satisfies ContentRouteSetting,
  ]);
  return { contentType, publicEntry, privateEntry, passwordEntry };
};

testIfDbWithOptions(
  "a public entry renders to an anonymous visitor",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry } = await seedDefaultGateFixture();
    const response = await requestPublicPath(`/${contentType.slug}/${publicEntry.slug}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Gate public entry");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a private entry returns a uniform 404 to an anonymous visitor (byte-identical to non-existent)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry } = await seedDefaultGateFixture();

    const privateResponse = await requestPublicPath(`/${contentType.slug}/${privateEntry.slug}`);
    const controlResponse = await requestPublicPath(
      `/${contentType.slug}/does-not-exist-${randomUUID().slice(0, 8)}`
    );

    expect(privateResponse.status).toBe(404);
    expect(privateResponse.status).toBe(controlResponse.status);
    expect(await privateResponse.text()).toBe(await controlResponse.text());
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a private entry renders for a content:read session (permission-bounded bypass)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry } = await seedDefaultGateFixture();
    const actor = await createActor("vis-gate-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);

    const response = await requestPublicPath(`/${contentType.slug}/${privateEntry.slug}`, token);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Gate private entry");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a password entry without a valid unlock serves the prompt page, never the body",
  async () => {
    resetRateLimitBuckets();
    const { contentType, passwordEntry } = await seedDefaultGateFixture();

    const response = await requestPublicPath(`/${contentType.slug}/${passwordEntry.slug}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<form`); // 517-02-L03 prompt
    expect(html).toContain(`action="/entries/${encodeURIComponent(passwordEntry.id)}/unlock"`);
    expect(html).toContain(`type="password"`);
    // The locked BODY is never rendered — the entry data headline must not appear.
    expect(html).not.toContain("Gate password entry headline");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a session WITHOUT content:read does NOT bypass the gate (private still 404)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry } = await seedDefaultGateFixture();
    const actor = await createActor("vis-gate-lowpriv");
    // No content:read role assigned → permissions resolve to [] → no bypass.
    const token = await createSessionForUser(actor.id);

    const response = await requestPublicPath(`/${contentType.slug}/${privateEntry.slug}`, token);
    expect(response.status).toBe(404);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a gated entry rendered under the content:read bypass is NOT written to the shared cache (default-generic exit)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry } = await seedDefaultGateFixture();
    await setTestSetting("site.cacheTtlSeconds", 60);
    const actor = await createActor("vis-gate-cache-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);

    const authedResponse = await requestPublicPath(
      `/${contentType.slug}/${privateEntry.slug}`,
      token
    );
    expect(authedResponse.status).toBe(200);

    // Follow-up anon request must NOT be served a cached gated body.
    const anonResponse = await requestPublicPath(`/${contentType.slug}/${privateEntry.slug}`);
    expect(anonResponse.status).toBe(404);
    expect(await anonResponse.text()).not.toContain("Gate private entry");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a linked-detail-page gated entry rendered under the content:read bypass is NOT written to the shared cache",
  async () => {
    resetRateLimitBuckets();
    const { contentType } = await createContentTypeFixture("gate-linked");
    const privateEntry = await seedEntry({
      contentTypeId: contentType.id,
      slug: `gate-linked-private-${randomUUID().slice(0, 8)}`,
      title: "Gate linked private entry",
      visibility: "private",
    });
    const detailPageId = randomUUID();
    await insertPublishedDetailPageDocument({
      id: detailPageId,
      contentTypeId: contentType.id,
      contentTypeSlug: contentType.slug,
    });
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath: `/${contentType.slug}`,
        detailPath: `/${contentType.slug}/:slug`,
        enabled: true,
        detailPageId,
      } satisfies ContentRouteSetting,
    ]);
    const actor = await createActor("vis-gate-linked-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);

    const authedResponse = await requestPublicPath(
      `/${contentType.slug}/${privateEntry.slug}`,
      token
    );
    expect(authedResponse.status).toBe(200);
    expect(await authedResponse.text()).toContain("Linked gate detail body");

    // Follow-up anon request must NOT be served a cached gated body.
    const anonResponse = await requestPublicPath(`/${contentType.slug}/${privateEntry.slug}`);
    expect(anonResponse.status).toBe(404);
    expect(await anonResponse.text()).not.toContain("Gate linked private entry");
  },
  { timeout: dbRuntimeTimeout }
);

// ── TASK-517-01-L05: list-branch visibility filter (no enumeration leak) ──────

testIfDbWithOptions(
  "an anonymous list body omits private and password entries (not enumerable)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry, privateEntry, passwordEntry } =
      await seedDefaultGateFixture();

    const response = await requestPublicPath(`/${contentType.slug}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Gate public entry");
    expect(html).not.toContain(privateEntry.title);
    expect(html).not.toContain(passwordEntry.title);
    expect(html).not.toContain(`/${privateEntry.slug}`);
    expect(html).not.toContain(`/${passwordEntry.slug}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a content:read session sees the full list including gated entries (bypass parity)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry, privateEntry, passwordEntry } =
      await seedDefaultGateFixture();
    const actor = await createActor("vis-gate-list-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);

    const response = await requestPublicPath(`/${contentType.slug}`, token);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(publicEntry.title);
    expect(html).toContain(privateEntry.title);
    expect(html).toContain(passwordEntry.title);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a session WITHOUT content:read sees the same public-only list as an anonymous visitor",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry, passwordEntry } = await seedDefaultGateFixture();
    const actor = await createActor("vis-gate-list-lowpriv");
    const token = await createSessionForUser(actor.id);

    const response = await requestPublicPath(`/${contentType.slug}`, token);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).not.toContain(privateEntry.title);
    expect(html).not.toContain(passwordEntry.title);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "the authed full-list body is never written to the shared cache (anti-poisoning)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry, passwordEntry } = await seedDefaultGateFixture();
    await setTestSetting("site.cacheTtlSeconds", 60);
    const actor = await createActor("vis-gate-list-cache-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);

    const authedResponse = await requestPublicPath(`/${contentType.slug}`, token);
    expect(authedResponse.status).toBe(200);
    expect(await authedResponse.text()).toContain(privateEntry.title);

    // Follow-up ANON GET to the SAME path must be the public-only body — the
    // authed full-list body was not cached under the auth-independent key.
    const anonResponse = await requestPublicPath(`/${contentType.slug}`);
    expect(anonResponse.status).toBe(200);
    const html = await anonResponse.text();
    expect(html).not.toContain(privateEntry.title);
    expect(html).not.toContain(passwordEntry.title);
  },
  { timeout: dbRuntimeTimeout }
);

// ── TASK-572: list cache visibility fence (M-517-01 + transition fence) ──────

testIfDbWithOptions(
  "TASK-572: an authed content:read list read is never served the anonymous cached body (private/password visible)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry, privateEntry, passwordEntry } =
      await seedDefaultGateFixture();
    await setTestSetting("site.cacheTtlSeconds", 60);

    // Anonymous request primes/attempts the list; under the old code this wrote
    // the public-only body to the shared cache under the auth-independent key.
    const anonResponse = await requestPublicPath(`/${contentType.slug}`);
    expect(anonResponse.status).toBe(200);
    expect(await anonResponse.text()).toContain("Gate public entry");

    // The content:read session requests the SAME path and must receive the
    // FULL list — private/password entries included — never the anonymous
    // cached body (M-517-01).
    const actor = await createActor("vis-gate-572-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);
    const authedResponse = await requestPublicPath(`/${contentType.slug}`, token);
    expect(authedResponse.status).toBe(200);
    const html = await authedResponse.text();
    expect(html).toContain(publicEntry.title);
    expect(html).toContain(privateEntry.title);
    expect(html).toContain(passwordEntry.title);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "TASK-572: a public→restricted transition is immediately fail-closed (no stale cached list exposure)",
  async () => {
    resetRateLimitBuckets();
    const { contentType } = await createContentTypeFixture("gate-572-transition");
    const entryA = await seedEntry({
      contentTypeId: contentType.id,
      slug: `gate-572-a-${randomUUID().slice(0, 8)}`,
      title: "Gate 572 transition A",
      visibility: "public",
    });
    const entryB = await seedEntry({
      contentTypeId: contentType.id,
      slug: `gate-572-b-${randomUUID().slice(0, 8)}`,
      title: "Gate 572 transition B",
      visibility: "public",
    });
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath: `/${contentType.slug}`,
        detailPath: `/${contentType.slug}/:slug`,
        enabled: true,
        detailPageId: null,
      } satisfies ContentRouteSetting,
    ]);

    // Anonymous primes the list while BOTH entries are public — the shared
    // cache now holds a body that enumerates A and B.
    const primeResponse = await requestPublicPath(`/${contentType.slug}`);
    expect(primeResponse.status).toBe(200);
    const primeHtml = await primeResponse.text();
    expect(primeHtml).toContain(entryA.title);
    expect(primeHtml).toContain(entryB.title);

    // B becomes private. The next anonymous request must be fail-closed: the
    // now-restricted entry must NOT appear, and the stale cached list body
    // (still enumerating B) must never be served (transition fence).
    const actor = await createActor("vis-gate-572-transition-admin");
    await updateEntryMetadata(entryB.id, { status: "published", visibility: "private" }, actor.id);
    const afterResponse = await requestPublicPath(`/${contentType.slug}`);
    expect(afterResponse.status).toBe(200);
    const afterHtml = await afterResponse.text();
    expect(afterHtml).toContain(entryA.title);
    expect(afterHtml).not.toContain(entryB.title);
    expect(afterHtml).not.toContain(`/${entryB.slug}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "TASK-572: anonymous-prime → authed-read ordering keeps the cache anonymous-only",
  async () => {
    resetRateLimitBuckets();
    const { contentType } = await createContentTypeFixture("gate-572-ordering");
    const publicEntry = await seedEntry({
      contentTypeId: contentType.id,
      slug: `gate-572-ordering-public-${randomUUID().slice(0, 8)}`,
      title: "Gate 572 ordering public",
      visibility: "public",
    });
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath: `/${contentType.slug}`,
        detailPath: `/${contentType.slug}/:slug`,
        enabled: true,
        detailPageId: null,
      } satisfies ContentRouteSetting,
    ]);

    // 1) Anonymous primes the list while the type is still all-public.
    const primeResponse = await requestPublicPath(`/${contentType.slug}`);
    expect(primeResponse.status).toBe(200);
    expect(await primeResponse.text()).toContain(publicEntry.title);

    // 2) Restricted entries appear AFTER the prime.
    const privateEntry = await seedEntry({
      contentTypeId: contentType.id,
      slug: `gate-572-ordering-private-${randomUUID().slice(0, 8)}`,
      title: "Gate 572 ordering private",
      visibility: "private",
    });
    const passwordEntry = await seedEntry({
      contentTypeId: contentType.id,
      slug: `gate-572-ordering-password-${randomUUID().slice(0, 8)}`,
      title: "Gate 572 ordering password",
      visibility: "password",
      accessPassword: "ordering-secret",
    });

    // 3) Authed read of the SAME path sees the FULL list — the pre-transition
    // anonymous cache is never served to the content:read session.
    const actor = await createActor("vis-gate-572-ordering-admin");
    await grantContentRead(actor.id);
    const token = await createSessionForUser(actor.id);
    const authedResponse = await requestPublicPath(`/${contentType.slug}`, token);
    expect(authedResponse.status).toBe(200);
    const authedHtml = await authedResponse.text();
    expect(authedHtml).toContain(publicEntry.title);
    expect(authedHtml).toContain(privateEntry.title);
    expect(authedHtml).toContain(passwordEntry.title);

    // 4) A follow-up ANONYMOUS read is still public-only — the authed full-list
    // body was never written under the auth-independent key, and the transition
    // fence keeps restricted entries out of every anonymous list render.
    const followUpResponse = await requestPublicPath(`/${contentType.slug}`);
    expect(followUpResponse.status).toBe(200);
    const followUpHtml = await followUpResponse.text();
    expect(followUpHtml).toContain(publicEntry.title);
    expect(followUpHtml).not.toContain(privateEntry.title);
    expect(followUpHtml).not.toContain(passwordEntry.title);
  },
  { timeout: dbRuntimeTimeout }
);
