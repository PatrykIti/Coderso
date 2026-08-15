import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, users } from "../../../core/db/schema";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  createEntryUnlockToken,
  hashEntryCookieId,
  resolveEntryUnlockTtlMs,
} from "../../../core/services/content/entryUnlockToken";
import { verifyPassword } from "../../../core/services/auth/password";
import {
  handlePublicEntryUnlockApi,
  __setEntryUnlockApiDepsForTests,
} from "../../../core/server/publicEntryUnlockApi";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { SECURITY_SETTINGS_DEFAULTS } from "../../../core/services/settings/securitySettings";
import type { SecuritySettings } from "../../../core/services/settings/securitySettings";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";

const ENTRY_UNLOCK_SECRET = "entry-password-gate-test-secret";

// No import-time DB probe (pages-runtime lane pattern): a postgres.js pool
// 'error' during an eager select 1 can kill the whole bun test process when
// the pooler briefly rejects. Test bodies fail loudly if the DB is down.
const hasDb = Boolean(process.env.DATABASE_URL);
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 45_000;

process.env.ENTRY_UNLOCK_SECRET = ENTRY_UNLOCK_SECRET;

const trackedUserIds = new Set<string>();
const trackedEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
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
  const entryIds = [...trackedEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const userIds = [...trackedUserIds];

  if (entryIds.length > 0) {
    await db.delete(contentEntries).where(inArray(contentEntries.id, entryIds));
  }
  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedEntryIds.clear();
  trackedContentTypeIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  __setEntryUnlockApiDepsForTests(null);
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const requestPublicPath = (path: string, init?: RequestInit) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      ...init,
      headers: {
        "user-agent": "entry-password-gate-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
        ...(init?.headers ?? {}),
      },
    })
  );

const seedPasswordFixture = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `password-gate-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_password_gate_actor");
  trackedUserIds.add(actor.id);

  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Password gate ${token}`,
    slug: `password-gate-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { body: { type: "string" } },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const plaintext = `secret-${token}`;
  const entry = await createEntry(contentType.id, {
    title: `Password gate entry ${token}`,
    slug: `password-gate-entry-${token}`,
    authorId: actor.id,
    data: { body: `Locked body ${token}` },
  });
  if (!entry) throw new Error("missing_password_gate_entry");
  trackedEntryIds.add(entry.id);
  await updateEntryMetadata(
    entry.id,
    { status: "published", visibility: "password", accessPassword: plaintext },
    actor.id
  );

  const publicEntry = await createEntry(contentType.id, {
    title: `Password gate public ${token}`,
    slug: `password-gate-public-${token}`,
    authorId: actor.id,
    data: { body: `Public body ${token}` },
  });
  if (!publicEntry) throw new Error("missing_password_gate_public");
  trackedEntryIds.add(publicEntry.id);
  await updateEntryMetadata(publicEntry.id, { status: "published" }, actor.id);

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

  return { actor, contentType, entry, publicEntry, plaintext, token };
};

const getRateLimitedSecurity = (maxRequests = 1): SecuritySettings => ({
  ...SECURITY_SETTINGS_DEFAULTS,
  rateLimit: {
    ...SECURITY_SETTINGS_DEFAULTS.rateLimit,
    enabled: true,
    buckets: {
      ...SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets,
      public_write: {
        ...SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets.public_write,
        maxRequests,
      },
    },
  },
});

const postUnlock = (entryId: string, body: Record<string, unknown>, init?: RequestInit) =>
  requestPublicPath(`/entries/${encodeURIComponent(entryId)}/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });

testIfDbWithOptions(
  "locked password entry serves the prompt page with no body",
  async () => {
    resetRateLimitBuckets();
    const { contentType, entry, token } = await seedPasswordFixture();

    const response = await requestPublicPath(`/${contentType.slug}/${entry.slug}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<form`);
    expect(html).toContain(`action="/entries/${encodeURIComponent(entry.id)}/unlock"`);
    expect(html).toContain(`type="password"`);
    // The locked BODY is never rendered.
    expect(html).not.toContain(`Locked body ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "wrong password returns a uniform 401 with no Set-Cookie; null-hash ids pay the same argon2 path",
  async () => {
    resetRateLimitBuckets();
    const { entry, publicEntry } = await seedPasswordFixture();
    const verifyCalls: Array<{ hash: string; password: string }> = [];
    __setEntryUnlockApiDepsForTests({
      hashPassword: async () => "dummy-argon2-hash",
      verifyPassword: async (hash, password) => {
        verifyCalls.push({ hash, password });
        // Real argon2 only for genuine hashes; dummy hash short-circuits false.
        if (!hash.startsWith("$argon2id$")) return false;
        return verifyPassword(hash, password);
      },
    });

    const wrong = await postUnlock(entry.id, { password: "nope" });
    expect(wrong.status).toBe(401);
    const wrongBody = await wrong.json();
    expect(wrongBody.error.code).toBe("entry_unlock_failed");
    expect(wrong.headers.get("set-cookie")).toBeNull();

    const missing = await postUnlock(randomUUID(), { password: "nope" });
    expect(missing.status).toBe(401);
    const missingBody = await missing.json();
    expect(missingBody.error.code).toBe("entry_unlock_failed");
    expect(missing.headers.get("set-cookie")).toBeNull();

    const publicId = await postUnlock(publicEntry.id, { password: "nope" });
    expect(publicId.status).toBe(401);
    const publicIdBody = await publicId.json();
    expect(publicIdBody.error.code).toBe("entry_unlock_failed");

    // Timing parity: the null-hash branches ALSO invoked verifyPassword (dummy
    // argon2) — the wrong-password path (1) + missing (2) + public (3).
    expect(verifyCalls.length).toBe(3);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a correct password sets the per-entry cookie and 302s to the validated return path",
  async () => {
    resetRateLimitBuckets();
    const { entry, plaintext } = await seedPasswordFixture();
    const originalCookieSecure = process.env.COOKIE_SECURE;
    process.env.COOKIE_SECURE = "true";
    try {
      const response = await postUnlock(entry.id, {
        password: plaintext,
        returnPath: `/blog/${entry.slug}`,
      });
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toBe(`/blog/${entry.slug}`);

      const setCookie = response.headers.get("set-cookie");
      expect(setCookie).not.toBeNull();
      expect(setCookie).toContain("SameSite=Strict");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain(`entry_unlock_${hashEntryCookieId(entry.id)}=`);
      expect(setCookie).toContain("Path=/");
      // Secure follows the COOKIE_SECURE override (sessionService pattern).
      expect(setCookie).toContain("Secure");
    } finally {
      if (originalCookieSecure === undefined) {
        delete process.env.COOKIE_SECURE;
      } else {
        process.env.COOKIE_SECURE = originalCookieSecure;
      }
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "an unlocked cookie serves the entry body on the render path",
  async () => {
    resetRateLimitBuckets();
    const { contentType, entry, plaintext, token } = await seedPasswordFixture();

    const unlock = await postUnlock(entry.id, {
      password: plaintext,
      returnPath: `/${contentType.slug}/${entry.slug}`,
    });
    const setCookie = unlock.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    const cookieValue = setCookie!.split(";")[0]!;

    const response = await requestPublicPath(`/${contentType.slug}/${entry.slug}`, {
      headers: { cookie: cookieValue },
    });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`Locked body ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "tampered, cross-entry and expired cookies stay locked (prompt, never body)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, entry, plaintext, actor } = await seedPasswordFixture();

    const validToken = createEntryUnlockToken(entry.id);
    const cookieName = `entry_unlock_${hashEntryCookieId(entry.id)}`;

    const tampered = `${validToken.slice(0, -1)}${validToken.endsWith("0") ? "1" : "0"}`;
    const tamperedResponse = await requestPublicPath(`/${contentType.slug}/${entry.slug}`, {
      headers: { cookie: `${cookieName}=${encodeURIComponent(tampered)}` },
    });
    expect(tamperedResponse.status).toBe(200);
    expect(await tamperedResponse.text()).toContain(`type="password"`);

    // Cross-entry: a valid cookie minted for entry B must not unlock entry A.
    const otherEntry = await createEntry(contentType.id, {
      title: `Other gate entry ${randomUUID().slice(0, 8)}`,
      slug: `other-gate-${randomUUID().slice(0, 8)}`,
      authorId: actor.id,
      data: { body: "other" },
    });
    if (!otherEntry) throw new Error("missing_other_gate_entry");
    trackedEntryIds.add(otherEntry.id);
    await updateEntryMetadata(
      otherEntry.id,
      { status: "published", visibility: "password", accessPassword: plaintext },
      actor.id
    );
    const otherCookie = `entry_unlock_${hashEntryCookieId(otherEntry.id)}=${encodeURIComponent(
      createEntryUnlockToken(otherEntry.id)
    )}`;
    const crossResponse = await requestPublicPath(`/${contentType.slug}/${entry.slug}`, {
      headers: { cookie: otherCookie },
    });
    expect(crossResponse.status).toBe(200);
    expect(await crossResponse.text()).toContain(`type="password"`);

    // Expired: minted beyond the TTL window.
    const ttl = resolveEntryUnlockTtlMs();
    const expiredToken = createEntryUnlockToken(entry.id, Date.now() - ttl - 60_000);
    const expiredResponse = await requestPublicPath(`/${contentType.slug}/${entry.slug}`, {
      headers: { cookie: `${cookieName}=${encodeURIComponent(expiredToken)}` },
    });
    expect(expiredResponse.status).toBe(200);
    expect(await expiredResponse.text()).toContain(`type="password"`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "reject-unknown unlock payloads return 400 validation_error",
  async () => {
    resetRateLimitBuckets();
    const { entry } = await seedPasswordFixture();

    const response = await postUnlock(entry.id, { password: "x", extra: 1 });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "the unlock endpoint enforces the public_write rate-limit bucket per entry id",
  async () => {
    resetRateLimitBuckets();
    const { entry, plaintext } = await seedPasswordFixture();
    const security = getRateLimitedSecurity(1);
    const url = new URL(`http://public.coderso.test/entries/${entry.id}/unlock`);

    const first = await handlePublicEntryUnlockApi(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      }),
      { url, ip: "198.51.100.7", userAgent: "entry-password-gate-test", security }
    );
    expect(first?.status).toBe(401);

    const second = await handlePublicEntryUnlockApi(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: plaintext }),
      }),
      { url, ip: "198.51.100.7", userAgent: "entry-password-gate-test", security }
    );
    expect(second?.status).toBe(429);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "malformed entry-id encoding returns 400, never a 500",
  async () => {
    resetRateLimitBuckets();
    const response = await requestPublicPath("/entries/%zz/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "x" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "resolveSafeEntryReturnPath never redirects to an attacker host (no open redirect)",
  async () => {
    resetRateLimitBuckets();
    const { entry, plaintext } = await seedPasswordFixture();

    for (const evil of [
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "\\evil.com",
      "https://evil.com",
      "%2f%2fevil.com",
      "\t//evil.com",
    ]) {
      const response = await postUnlock(entry.id, { password: plaintext, returnPath: evil });
      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).not.toBeNull();
      expect(location!.startsWith("//")).toBe(false);
      expect(location!.startsWith("http://evil.com")).toBe(false);
      expect(location!.startsWith("https://evil.com")).toBe(false);
    }
  },
  { timeout: dbRuntimeTimeout }
);
