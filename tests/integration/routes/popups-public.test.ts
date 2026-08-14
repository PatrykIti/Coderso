import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { popups } from "../../../core/db/schema";
import { handlePublicPopupsApi } from "../../../core/server/publicPopupsApi";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import type { SecuritySettings } from "../../../core/services/settings/securitySettings";
import { createSession } from "../../../core/services/auth/sessionService";
import { createPopup } from "../../../core/services/popups/popupService";
import {
  createActor,
  dbRuntimeTimeout,
  testIfDbWithOptions,
} from "../runtime/pages-runtime-test-support";

/**
 * TASK-486-04-L01 — end-to-end Bun coverage for the public delivery path:
 * anonymous read, server-side targeting/audience evaluation, published-only
 * filtering, no-PII payload, reject-unknown query, and handler-level routing.
 * The public_read rate-limit bucket and admin RBAC isolation are asserted in
 * tests/security/popups-public.test.ts.
 */

type PublicPopupItem = {
  id: string;
  slug: string;
  trigger: unknown;
  frequency: unknown;
  content: Record<string, unknown>;
  settings: unknown;
};

type PublicPopupsResponse = { items: PublicPopupItem[] };

type SeedOverrides = {
  name?: string;
  slug?: string;
  status?: "draft" | "published" | "archived";
  trigger?: unknown;
  targeting?: unknown;
  frequency?: unknown;
  content?: unknown;
  settings?: unknown;
};

const trackedPopupIds = new Set<string>();

const seedPopup = async (overrides: SeedOverrides = {}) => {
  const token = randomUUID().slice(0, 8);
  const created = await createPopup({
    name: overrides.name ?? `Popup ${token}`,
    slug: overrides.slug ?? `popup-${token}`,
    status: overrides.status ?? "published",
    trigger: overrides.trigger ?? { type: "time_delay", delaySeconds: 3 },
    targeting: overrides.targeting ?? {
      includePaths: ["/"],
      excludePaths: [],
      audience: "all",
    },
    frequency: overrides.frequency ?? {
      strategy: "session_once",
      cooldownMinutes: 30,
    },
    content: overrides.content ?? {
      title: "Spring Sale",
      body: "Get 20% off this week",
      ctaLabel: "Shop now",
      ctaHref: "/shop",
    },
    settings: overrides.settings ?? {
      placement: "center",
      dismissible: true,
      showOverlay: true,
    },
  });
  if (!created?.id) throw new Error("missing_seeded_popup");
  trackedPopupIds.add(created.id);
  return created;
};

// Drives the real public request pipeline (handlePublicRequest), so the
// dispatch, rate-limit, validation, session attachment, and resolver all run.
// A fixed ip/user-agent keeps rate-limit keys deterministic for this file.
const publicRequest = (path: string, cookie?: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "popups-public-test",
        "x-forwarded-for": "127.0.0.1",
        ...(cookie ? { cookie } : {}),
      },
    })
  );

afterEach(async () => {
  if (!process.env.DATABASE_URL || trackedPopupIds.size === 0) return;
  await db.delete(popups).where(inArray(popups.id, [...trackedPopupIds]));
  trackedPopupIds.clear();
});

testIfDbWithOptions(
  "anonymous GET /api/popups returns only published, path-targeted popups",
  async () => {
    resetRateLimitBuckets();
    const home = await seedPopup();
    const draft = await seedPopup({ status: "draft" });
    const archived = await seedPopup({ status: "archived" });
    const otherPath = await seedPopup({
      targeting: { includePaths: ["/pricing"], excludePaths: [], audience: "all" },
    });

    const response = await publicRequest("/api/popups?path=/");
    expect(response.status).toBe(200);
    const body = (await response.json()) as PublicPopupsResponse;
    const slugs = body.items.map((item) => item.slug);

    expect(slugs).toContain(home.slug);
    expect(slugs).not.toContain(draft.slug);
    expect(slugs).not.toContain(archived.slug);
    expect(slugs).not.toContain(otherPath.slug);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "response items are the no-PII public DTO with frequency carried through",
  async () => {
    resetRateLimitBuckets();
    const seeded = await seedPopup({
      targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
      frequency: { strategy: "daily_once", cooldownMinutes: 60 },
      content: { title: "Sale", body: "20% off", ctaLabel: "Shop", ctaHref: "/shop" },
    });

    const response = await publicRequest("/api/popups?path=/");
    expect(response.status).toBe(200);
    const body = (await response.json()) as PublicPopupsResponse;

    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    // PII gate: ONLY the six public keys; name/status/targeting/timestamps are
    // never shipped to the client.
    expect(Object.keys(item).sort()).toEqual([
      "content",
      "frequency",
      "id",
      "settings",
      "slug",
      "trigger",
    ]);
    expect(item.id).toBe(seeded.id);
    expect(item.slug).toBe(seeded.slug);
    expect(item.trigger).toEqual({ type: "time_delay", delaySeconds: 3 });
    // Frequency must reach the client so the runtime can enforce cooldown.
    expect(item.frequency).toEqual({ strategy: "daily_once", cooldownMinutes: 60 });
    expect(Object.keys(item.content).sort()).toEqual(["body", "ctaHref", "ctaLabel", "title"]);
    expect(item.content.templateId).toBeUndefined();
    expect(item.settings).toEqual({
      placement: "center",
      dismissible: true,
      showOverlay: true,
    });
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "audience is resolved from the session, never from the query",
  async () => {
    resetRateLimitBuckets();
    const member = await seedPopup({
      slug: `member-${randomUUID().slice(0, 8)}`,
      targeting: { includePaths: ["/"], excludePaths: [], audience: "logged_in" },
    });
    const guest = await seedPopup({
      slug: `guest-${randomUUID().slice(0, 8)}`,
      targeting: { includePaths: ["/"], excludePaths: [], audience: "logged_out" },
    });
    const everyone = await seedPopup({
      slug: `everyone-${randomUUID().slice(0, 8)}`,
      targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    });

    // Anonymous visitor: only logged_out + all appear.
    const anonResponse = await publicRequest("/api/popups?path=/");
    expect(anonResponse.status).toBe(200);
    const anonBody = (await anonResponse.json()) as PublicPopupsResponse;
    const anonSlugs = anonBody.items.map((item) => item.slug);
    expect(anonSlugs).toContain(guest.slug);
    expect(anonSlugs).toContain(everyone.slug);
    expect(anonSlugs).not.toContain(member.slug);

    // Logged-in visitor with a real session cookie: logged_in + all appear.
    const actor = await createActor();
    const { token } = await createSession({
      userId: actor.id,
      ip: "127.0.0.1",
      userAgent: "popups-public-test",
    });
    const authedResponse = await publicRequest("/api/popups?path=/", `session=${token}`);
    expect(authedResponse.status).toBe(200);
    const authedBody = (await authedResponse.json()) as PublicPopupsResponse;
    const authedSlugs = authedBody.items.map((item) => item.slug);
    expect(authedSlugs).toContain(member.slug);
    expect(authedSlugs).toContain(everyone.slug);
    expect(authedSlugs).not.toContain(guest.slug);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "exclude path beats include path for the same popup",
  async () => {
    resetRateLimitBuckets();
    const blog = await seedPopup({
      slug: `blog-${randomUUID().slice(0, 8)}`,
      targeting: {
        includePaths: ["/blog/*"],
        excludePaths: ["/blog/private"],
        audience: "all",
      },
    });

    const excluded = await publicRequest("/api/popups?path=/blog/private");
    expect(excluded.status).toBe(200);
    const excludedBody = (await excluded.json()) as PublicPopupsResponse;
    expect(excludedBody.items.map((item) => item.slug)).toEqual([]);

    const included = await publicRequest("/api/popups?path=/blog/public");
    expect(included.status).toBe(200);
    const includedBody = (await included.json()) as PublicPopupsResponse;
    expect(includedBody.items.map((item) => item.slug)).toEqual([blog.slug]);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "empty includePaths targets every path",
  async () => {
    resetRateLimitBuckets();
    const global = await seedPopup({
      slug: `global-${randomUUID().slice(0, 8)}`,
      targeting: { includePaths: [], excludePaths: [], audience: "all" },
    });

    const response = await publicRequest("/api/popups?path=/deep/nested/page");
    expect(response.status).toBe(200);
    const body = (await response.json()) as PublicPopupsResponse;
    expect(body.items.map((item) => item.slug)).toEqual([global.slug]);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "unknown query keys return 400 validation_error",
  async () => {
    resetRateLimitBuckets();
    const response = await publicRequest("/api/popups?path=/&utm_source=newsletter");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("validation_error");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "missing path returns 400 validation_error",
  async () => {
    resetRateLimitBuckets();
    const response = await publicRequest("/api/popups?page=1");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("validation_error");
  },
  { timeout: dbRuntimeTimeout }
);

test("non-GET requests are not handled by the public popups handler", async () => {
  const ctx = {
    url: new URL("http://public.coderso.test/api/popups?path=/"),
    // The method guard runs before any rate-limit/settings access, so a stub
    // security config is sufficient for this contract check.
    security: { rateLimit: { enabled: false } } as SecuritySettings,
  };
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const) {
    const request = new Request("http://public.coderso.test/api/popups?path=/", {
      method,
    });
    // The handler returns null (the pipeline owns 404/405); it never answers
    // a non-GET itself.
    await expect(handlePublicPopupsApi(request, ctx)).resolves.toBeNull();
  }
});
