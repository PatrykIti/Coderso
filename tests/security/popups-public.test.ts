import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../core/db/client";
import { popups } from "../../core/db/schema";
import { handlePublicRequest } from "../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../core/server/middleware/rateLimit";
import { requirePermission } from "../../core/server/middleware/rbac";
import {
  registerPopupsRoutes,
  type PopupsRouteDeps,
  type PopupsRouteHandler,
} from "../../core/server/routes/popupsRoutes";
import { createPopup } from "../../core/services/popups/popupService";
import {
  getSecuritySettings,
  setSecuritySettings,
} from "../../core/services/settings/securitySettings";
import {
  createActor,
  dbRuntimeTimeout,
  testIfDbWithOptions,
} from "../integration/runtime/pages-runtime-test-support";

/**
 * TASK-486-04-L01 — security gate for the public popups delivery path: the
 * public_read rate-limit bucket applies to GET /api/popups, draft/archived
 * popups are never delivered even when their targeting matches, and the admin
 * /popups surface stays behind popups:read / popups:write RBAC gates.
 */

type PublicPopupsResponse = { items: Array<{ slug: string }> };

type SeedOverrides = {
  slug?: string;
  status?: "draft" | "published" | "archived";
  targeting?: unknown;
};

const trackedPopupIds = new Set<string>();

const seedPopup = async (overrides: SeedOverrides = {}) => {
  const token = randomUUID().slice(0, 8);
  const created = await createPopup({
    name: `Security Popup ${token}`,
    slug: overrides.slug ?? `security-popup-${token}`,
    status: overrides.status ?? "published",
    trigger: { type: "time_delay", delaySeconds: 3 },
    targeting: overrides.targeting ?? {
      includePaths: ["/"],
      excludePaths: [],
      audience: "all",
    },
    frequency: { strategy: "session_once", cooldownMinutes: 30 },
    content: { title: "Sale", body: "20% off", ctaLabel: "Shop", ctaHref: "/shop" },
    settings: { placement: "center", dismissible: true, showOverlay: true },
  });
  if (!created?.id) throw new Error("missing_seeded_popup");
  trackedPopupIds.add(created.id);
  return created;
};

// Fixed ip + user-agent so the public_read bucket key is stable across the
// requests that must trip the limit.
const rateLimitedRequest = (path: string) =>
  new Request(`http://public.coderso.test${path}`, {
    headers: {
      "user-agent": "popups-security-test",
      "x-forwarded-for": "203.0.113.9",
    },
  });

afterEach(() => {
  if (!process.env.DATABASE_URL || trackedPopupIds.size === 0) return;
  return db
    .delete(popups)
    .where(inArray(popups.id, [...trackedPopupIds]))
    .then(() => {
      trackedPopupIds.clear();
    });
});

testIfDbWithOptions(
  "public_read rate-limit bucket applies to GET /api/popups",
  async () => {
    resetRateLimitBuckets();
    const previous = await getSecuritySettings();
    try {
      await setSecuritySettings({
        rateLimit: {
          enabled: true,
          buckets: { public_read: { windowSeconds: 60, maxRequests: 2 } },
        },
      });

      const first = await handlePublicRequest(rateLimitedRequest("/api/popups?path=/"));
      expect(first.status).toBe(200);

      const second = await handlePublicRequest(rateLimitedRequest("/api/popups?path=/"));
      expect(second.status).toBe(200);

      const third = await handlePublicRequest(rateLimitedRequest("/api/popups?path=/"));
      expect(third.status).toBe(429);
      const body = (await third.json()) as { error: { code: string } };
      expect(body.error.code).toBe("rate_limited");
    } finally {
      // getSecuritySettings widens secretKey to the encrypted-object form; the
      // update input accepts the plain string|null shape. Restore the read
      // settings with that one field normalized so the shared DB row is
      // returned to its prior state exactly.
      await setSecuritySettings({
        ...previous,
        botProtection: {
          ...previous.botProtection,
          secretKey:
            typeof previous.botProtection.secretKey === "string"
              ? previous.botProtection.secretKey
              : null,
        },
      });
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "draft and archived popups are never returned even when targeting matches",
  async () => {
    resetRateLimitBuckets();
    const published = await seedPopup();
    const draft = await seedPopup({
      status: "draft",
      targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    });
    const archived = await seedPopup({
      status: "archived",
      targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    });

    const response = await handlePublicRequest(rateLimitedRequest("/api/popups?path=/"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as PublicPopupsResponse;
    const slugs = body.items.map((item) => item.slug);

    expect(slugs).toContain(published.slug);
    expect(slugs).not.toContain(draft.slug);
    expect(slugs).not.toContain(archived.slug);
  },
  { timeout: dbRuntimeTimeout }
);

type Route = { method: string; path: string; handlers: PopupsRouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: PopupsRouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: PopupsRouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: PopupsRouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      delete: (path: string, ...handlers: PopupsRouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

const runGate = async (route: Route) => {
  const gate = route.handlers[0] as unknown as (ctx: { user?: { id: string } }) => Promise<unknown>;
  return gate;
};

testIfDbWithOptions(
  "admin /popups routes stay behind popups:read / popups:write RBAC gates",
  async () => {
    const { router, routes } = makeRouter();
    registerPopupsRoutes(router, {
      requirePermission: (permission: string) =>
        requirePermission(permission) as unknown as PopupsRouteHandler,
      validate: () => undefined,
    } as PopupsRouteDeps);

    expect(routes.length).toBeGreaterThan(0);
    const expectedPaths = [
      "GET /popups",
      "GET /popups/:id",
      "POST /popups",
      "PATCH /popups/:id",
      "PATCH /popups/:id/status",
      "DELETE /popups/:id",
    ];
    expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual(
      expect.arrayContaining(expectedPaths)
    );

    // Anonymous: every admin popups route is fail-closed (401 trigger).
    for (const route of routes) {
      const gate = await runGate(route);
      await expect(gate({})).rejects.toThrow("auth_required");
    }

    // Authenticated without permissions: every route is forbidden (403 trigger).
    const actor = await createActor();
    for (const route of routes) {
      const gate = await runGate(route);
      await expect(gate({ user: { id: actor.id } })).rejects.toThrow("forbidden");
    }
  },
  { timeout: dbRuntimeTimeout }
);
