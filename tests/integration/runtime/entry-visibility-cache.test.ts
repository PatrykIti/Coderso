// TASK-517-03: cache exclusion for gated (private/password) entry routes.
//
// The shared public HTML cache is keyed ONLY on (profile, path, search
// signature) — it never varies on auth or the unlock cookie. This suite proves:
//  - a PUBLIC entry keeps the 30-60 s cache (write + read hit),
//  - the LIST route and the HOMEPAGE still cache after the `shouldUseCache`
//    reorder (routeIsGatedEntry must stay false for non-detail matches),
//  - PRIVATE and PASSWORD entry routes are fully cache-exempt on BOTH sides:
//    even a poisoned/stale entry injected directly into the shared cache is
//    never served to any visitor (the cache read is bypassed for gated routes).
//
// Lane: Bun (runtime route + shared cache + DB). Delete-only cleanup via the
// shared pages-runtime support file's afterEach.

import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, pages } from "../../../core/db/schema";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  buildSiteCacheKey,
  clearSiteCache,
  getSiteCacheEntry,
  normalizeSitePath,
  resolveSiteCacheSearchSignature,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";
import { getActiveThemeProfile } from "../../../core/services/themes/themeProfileService";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import {
  createActor,
  createPublishedPageWithDraft,
  dbRuntimeTimeout,
  pageData,
  setTestSetting,
  testIfDbWithOptions,
  trackContentEntry,
  trackContentType,
  trackPage,
} from "./pages-runtime-test-support";

// No import-time DB probe (pages-runtime lane pattern): test bodies fail
// loudly if the DB is down, instead of a postgres.js pool 'error' killing the
// whole bun process during an eager select 1.
process.env.ENTRY_UNLOCK_SECRET = "entry-visibility-cache-test-secret";
const hasDb = Boolean(process.env.DATABASE_URL);

const requestPath = (path: string, init?: RequestInit) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      ...init,
      headers: {
        "user-agent": "entry-visibility-cache-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
        ...(init?.headers ?? {}),
      },
    })
  );

// The exact cache key handlePublicRequest builds for a path (profile, path,
// search signature) — same inputs, so a poisoned entry provably sits at the
// read point the gated-route bypass must skip.
const siteCacheKeyFor = async (path: string) => {
  const profile = await getActiveThemeProfile();
  return buildSiteCacheKey(
    profile?.id ?? "default",
    normalizeSitePath(path),
    resolveSiteCacheSearchSignature(new URLSearchParams()).signature
  );
};

const seedCacheFixture = async () => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `Cache gate ${token}`,
    slug: `cache-gate-${token}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { body: { type: "string" } },
    },
  });
  trackContentType(contentType.id);

  const publicEntry = await createEntry(contentType.id, {
    title: `Cache public entry ${token}`,
    slug: `cache-public-${token}`,
    authorId: actor.id,
    data: { body: `Cache body ${token}` },
  });
  if (!publicEntry) throw new Error("missing_cache_public_entry");
  trackContentEntry(publicEntry.id);
  await updateEntryMetadata(publicEntry.id, { status: "published" }, actor.id);

  const privateEntry = await createEntry(contentType.id, {
    title: `Cache private entry ${token}`,
    slug: `cache-private-${token}`,
    authorId: actor.id,
    data: { body: `Cache body private ${token}` },
  });
  if (!privateEntry) throw new Error("missing_cache_private_entry");
  trackContentEntry(privateEntry.id);
  await updateEntryMetadata(
    privateEntry.id,
    { status: "published", visibility: "private" },
    actor.id
  );

  const passwordEntry = await createEntry(contentType.id, {
    title: `Cache password entry ${token}`,
    slug: `cache-password-${token}`,
    authorId: actor.id,
    data: { body: `Cache body ${token}` },
  });
  if (!passwordEntry) throw new Error("missing_cache_password_entry");
  trackContentEntry(passwordEntry.id);
  await updateEntryMetadata(
    passwordEntry.id,
    {
      status: "published",
      visibility: "password",
      accessPassword: `pw-${token}`,
    },
    actor.id
  );

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

  return { actor, contentType, publicEntry, privateEntry, passwordEntry, token };
};

testIfDbWithOptions(
  "a public entry body IS served from the shared cache (write + read hit)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry, token } = await seedCacheFixture();
    const path = `/${contentType.slug}/${publicEntry.slug}`;

    const first = await requestPath(path);
    expect(first.status).toBe(200);
    expect(await first.text()).toContain(`Cache body ${token}`);

    // Direct row mutation bypasses service invalidation — a second identical
    // request MUST come from the cache (stale body), proving the write landed
    // and the read hit.
    await db
      .update(contentEntries)
      .set({ data: { body: `Cache body CHANGED ${token}` } })
      .where(eq(contentEntries.id, publicEntry.id));
    const key = await siteCacheKeyFor(path);
    expect(getSiteCacheEntry(key)).not.toBeNull();

    const second = await requestPath(path);
    expect(second.status).toBe(200);
    const secondHtml = await second.text();
    expect(secondHtml).toContain(`Cache body ${token}`);
    expect(secondHtml).not.toContain("CHANGED");

    // Probe validity: after a cache clear the mutation surfaces.
    clearSiteCache();
    const fresh = await requestPath(path);
    expect(fresh.status).toBe(200);
    expect(await fresh.text()).toContain(`Cache body CHANGED ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "the public list route and the homepage still cache after the gated-route reorder",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry, token } = await seedCacheFixture();

    // LIST: a public list is NOT a gated detail match, so it keeps caching.
    const listPath = `/${contentType.slug}`;
    const listFirst = await requestPath(listPath);
    expect(listFirst.status).toBe(200);
    expect(await listFirst.text()).toContain(publicEntry.title);

    await db
      .update(contentEntries)
      .set({ title: `Cache renamed ${token}` })
      .where(eq(contentEntries.id, publicEntry.id));

    const listSecond = await requestPath(listPath);
    expect(listSecond.status).toBe(200);
    const listSecondHtml = await listSecond.text();
    expect(listSecondHtml).toContain(publicEntry.title);
    expect(listSecondHtml).not.toContain("Cache renamed");

    // HOMEPAGE: routeIsGatedEntry stays false when match is null.
    const home = await createPublishedPageWithDraft();
    trackPage(home.page.id);
    await setTestSetting("site.homepageId", home.page.id);

    const rootFirst = await requestPath("/");
    expect(rootFirst.status).toBe(200);
    expect(await rootFirst.text()).toContain(home.publishedHeadline);

    await db
      .update(pages)
      .set({ publishedData: pageData(`Changed home ${token}`) })
      .where(eq(pages.id, home.page.id));

    const rootSecond = await requestPath("/");
    expect(rootSecond.status).toBe(200);
    const rootSecondHtml = await rootSecond.text();
    expect(rootSecondHtml).toContain(home.publishedHeadline);
    expect(rootSecondHtml).not.toContain("Changed home");

    clearSiteCache();
    const rootFresh = await requestPath("/");
    expect(await rootFresh.text()).toContain(`Changed home ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a password entry NEVER serves a stale shared-cache body to any visitor (read bypass)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, passwordEntry, token } = await seedCacheFixture();
    const path = `/${contentType.slug}/${passwordEntry.slug}`;

    // Unlock through the real endpoint, then render the body.
    const unlock = await requestPath(`/entries/${passwordEntry.id}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: `pw-${token}`, returnPath: path }),
    });
    expect(unlock.status).toBe(302);
    const setCookie = unlock.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    const cookie = setCookie!.split(";")[0]!;

    const unlocked = await requestPath(path, { headers: { cookie } });
    expect(unlocked.status).toBe(200);
    expect(await unlocked.text()).toContain(`Cache body ${token}`);

    // Direct mutation (no invalidation): the unlocked follow-up MUST re-render
    // fresh — the gated route is exempt from the cache READ too.
    await db
      .update(contentEntries)
      .set({ data: { body: `Cache body FRESH ${token}` } })
      .where(eq(contentEntries.id, passwordEntry.id));
    const refreshed = await requestPath(path, { headers: { cookie } });
    expect(refreshed.status).toBe(200);
    expect(await refreshed.text()).toContain(`Cache body FRESH ${token}`);

    // Stale-injection: a poisoned entry at the exact read key is still never
    // served — not to an anon visitor (prompt) and not to a locked one.
    const key = await siteCacheKeyFor(path);
    setSiteCacheEntry(key, `POISONED ${token}`, 60);
    expect(getSiteCacheEntry(key)).toBe(`POISONED ${token}`);

    const anon = await requestPath(path);
    expect(anon.status).toBe(200);
    const anonHtml = await anon.text();
    expect(anonHtml).not.toContain(`POISONED ${token}`);
    expect(anonHtml).not.toContain(`Cache body FRESH ${token}`);
    expect(anonHtml).toContain(`type="password"`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a private entry NEVER serves a stale shared-cache body (read bypass, uniform 404)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, privateEntry, token } = await seedCacheFixture();
    const path = `/${contentType.slug}/${privateEntry.slug}`;

    // Poison the exact read key for the private route: the gate must bypass the
    // read and render the uniform 404, never the poisoned body.
    const key = await siteCacheKeyFor(path);
    setSiteCacheEntry(key, `POISONED PRIVATE ${token}`, 60);
    expect(getSiteCacheEntry(key)).toBe(`POISONED PRIVATE ${token}`);

    const anon = await requestPath(path);
    expect(anon.status).toBe(404);
    const html = await anon.text();
    expect(html).not.toContain(`POISONED PRIVATE ${token}`);
    expect(html).not.toContain("Cache body private");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a public entry rendered alongside gated entries still caches only for anon (no cross-talk)",
  async () => {
    resetRateLimitBuckets();
    const { contentType, publicEntry, privateEntry } = await seedCacheFixture();

    // The gated detail route shares the public route table — verify the public
    // entry's own cache key is unaffected by the presence of gated siblings.
    const publicPath = `/${contentType.slug}/${publicEntry.slug}`;
    const privatePath = `/${contentType.slug}/${privateEntry.slug}`;
    const privateKey = await siteCacheKeyFor(privatePath);

    await requestPath(publicPath);
    await requestPath(privatePath); // 404, gated — must NOT have written anything

    expect(getSiteCacheEntry(privateKey)).toBeNull();

    const publicKey = await siteCacheKeyFor(publicPath);
    expect(getSiteCacheEntry(publicKey)).not.toBeNull();
  },
  { timeout: dbRuntimeTimeout }
);
