// TASK-482-09-L01: end-to-end onboarding flow via an injected-service, in-memory
// stub-router harness (installer -> login/session transition -> Basic settings ->
// starter content -> Advanced strict-reject -> finalize + self-disable).
//
// SHARED-DB SAFETY (mandatory): the test DATABASE_URL is ONE remote Postgres
// shared with the owner and the parallel TASK-483/484 streams. This suite NEVER
// truncates/deletes `users`, never flips the real DB into a global no-users
// install state, and never resets shared `settings` rows. The no-users/first-run
// state is simulated purely via the dependency-injected `InstallRouteDeps` seams
// (`isFirstRun` / `createFirstAdmin`) over an in-memory `world`; the real
// database is never read or mutated.
//
// HARNESS SHAPE: same generic `{ method, path, handlers }` recorder +
// `findRoute`/`runRoute` helpers as `auth.test.ts`/`settings.test.ts`, but the
// `makeRouter` records the GET+POST+PATCH SUPERSET (this PATCH-heavy flow would
// silently drop routes under either reference recorder). ALL THREE phases drive
// the REAL registered route modules — `registerInstallRoutes` (fully seamed),
// `registerSettingsRoutes` and `registerSetupRoutes` — so the actual handler
// chains, validation, key resolution, error mapping AND audit-action strings get
// genuine E2E coverage. Only persistence is redirected to the in-memory `world`
// through each module's optional service seams (default = real services; same
// additive pattern as `InstallRouteDeps.{isFirstRun,createFirstAdmin,logAudit}`),
// so the shared remote Postgres is never touched. Full kit-install and
// settings-persistence behaviour remains covered by the dedicated Bun suites
// (`starterContent.test.ts`, `setupStarterContent.test.ts`, `settings.test.ts`,
// `settingsService` unit lane).

import { describe, expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import type { RouteContext, RouteHandler, Router } from "../../../core/server/router";
import { registerInstallRoutes } from "../../../core/server/routes/installRoutes";
import {
  registerSettingsRoutes,
  resolveSettingsRouteKey,
  type SettingsRouteDeps,
  type Router as SettingsRouter,
} from "../../../core/server/routes/settingsRoutes";
import {
  registerSetupRoutes,
  type SetupRouteDeps,
  type Router as SetupRouter,
} from "../../../core/server/routes/setupRoutes";
import { enforceCsrf } from "../../../core/server/middleware/csrf";
import { validate } from "../../../core/server/validation/schemaValidator";
import { hasPermission } from "../../../core/services/auth/roleService";
import type {
  CreateFirstAdminInput,
  CreateFirstAdminResult,
} from "../../../core/services/admin/firstRunService";
import type { AuditEvent, AuditRecord } from "../../../core/services/audit/auditService";

// ---------------------------------------------------------------------------
// In-memory world — simulates the DB. The REAL shared Postgres is never touched.
// ---------------------------------------------------------------------------
type WorldUser = { id: string; email: string; name: string; permissions: string[] };

type World = {
  users: WorldUser[];
  settings: Map<string, unknown>;
  audits: AuditEvent[];
};

const makeWorld = (): World => ({
  users: [],
  settings: new Map<string, unknown>(),
  audits: [],
});

const recordAudit =
  (world: World) =>
  async (event: AuditEvent): Promise<AuditRecord> => {
    world.audits.push(event);
    return {
      id: "audit-1",
      actorId: event.actorId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ?? {},
      createdAt: new Date(),
    };
  };

// ---------------------------------------------------------------------------
// Stub-router harness — records the GET + POST + PATCH superset.
// ---------------------------------------------------------------------------
type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  const record =
    (method: string) =>
    (path: string, ...handlers: RouteHandler[]) =>
      routes.push({ method, path, handlers });
  // Only `.get`/`.post`/`.patch` are needed for this flow; the remaining verbs
  // satisfy the `Router` type and no-op (nothing this flow drives uses them).
  const router = {
    get: record("GET"),
    post: record("POST"),
    patch: record("PATCH"),
    put: record("PUT"),
    delete: record("DELETE"),
  } as unknown as Router;
  return { routes, router };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

const runRoute = async (route: Route, ctx: Partial<RouteContext>) => {
  let result: unknown;
  const routeContext = { params: {}, query: {}, body: undefined, ...ctx } as RouteContext;
  for (const handler of route.handlers) {
    result = await handler(routeContext);
  }
  return result;
};

// ---------------------------------------------------------------------------
// RBAC guard passed as the REAL modules' `requirePermission` dep. Mirrors
// core/server/middleware/rbac.ts requirePermission(): missing user =>
// auth_required (401), missing permission => forbidden (403). Uses the REAL pure
// `hasPermission` (['*'] wildcard) over permissions carried on the crafted ctx.
// The narrow ctx param keeps it assignable to BOTH the settings-local and the
// shared setup RouteHandler shapes.
// ---------------------------------------------------------------------------
const requirePermission =
  (permission: string) => (ctx: { user?: { id?: string; permissions?: string[] } }) => {
    if (!ctx.user?.id) throw new ApiError("auth_required", "Authentication required", 401);
    if (!hasPermission(ctx.user.permissions ?? [], permission)) {
      throw new ApiError("forbidden", "Forbidden", 403);
    }
  };

// ---------------------------------------------------------------------------
// Build one router wired with the REAL install + settings + setup route modules
// over a fresh in-memory world. Only persistence is seamed; validation, key
// resolution, choice enforcement, error mapping and audit-action strings all run
// through the real production handlers.
// ---------------------------------------------------------------------------
const buildFlow = () => {
  const world = makeWorld();
  const { routes, router } = makeRouter();
  const audit = recordAudit(world);

  // ---- PHASE 1: installer (real registerInstallRoutes, fully seamed) --------
  registerInstallRoutes(router, {
    validate, // real strict-schema validator (installAdminSchema)
    isFirstRun: async () => world.users.length === 0, // InstallRouteDeps seam (01-L02)
    createFirstAdmin: async (input: CreateFirstAdminInput): Promise<CreateFirstAdminResult> => {
      // Injected create seam (02-L02). Mirrors the service's fail-closed gate so
      // the route + mapInstallRouteError surface a repeat as 409 install_unavailable.
      if (world.users.length > 0) throw new Error("first_run_unavailable");
      const admin: WorldUser = {
        id: "u1",
        email: input.email,
        name: input.name,
        permissions: ["*"],
      };
      world.users.push(admin);
      return { id: admin.id, email: admin.email, name: admin.name, status: "active", roleId: "r1" };
    },
    logAudit: audit,
  });

  // ---- PHASE 2: Basic/Advanced settings (real registerSettingsRoutes) -------
  const settingsDeps: SettingsRouteDeps = {
    requirePermission,
    validate,
    // Persistence seam: write the validated bulk payload into the in-memory
    // world under the REAL resolved keys, then echo the current snapshot the way
    // the real handler's `listSettings()` return does.
    setSettings: (async (values: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(values)) {
        world.settings.set(resolveSettingsRouteKey(key), value);
      }
      return Object.fromEntries(world.settings);
    }) as SettingsRouteDeps["setSettings"],
    // Design tokens are DB-resolved in prod; stub an empty token bag here.
    getResolvedTokens: (async () => ({})) as SettingsRouteDeps["getResolvedTokens"],
    logAudit: audit,
  };
  registerSettingsRoutes(router as unknown as SettingsRouter, settingsDeps);

  // ---- PHASE 2: starter content (real registerSetupRoutes) ------------------
  const setupDeps: SetupRouteDeps = {
    requirePermission,
    validate,
    previewStarterContent: (async () => ({
      total: 3,
      created: 3,
      updated: 0,
      skipped: 0,
    })) as unknown as SetupRouteDeps["previewStarterContent"],
    // Apply wires the seeded shell into site.* settings; the REAL handler emits
    // the `setup.starter_content.applied` audit itself via the audit seam below.
    applyStarterContent: (async () => {
      world.settings.set("site.homepageId", "page-home-1");
      world.settings.set("site.navigationMenuId", "menu-primary-1");
      world.settings.set("site.footerTemplateId", "tmpl-footer-1");
      return { runId: "run-1", summary: { total: 3, created: 3, updated: 0, skipped: 0 } };
    }) as unknown as SetupRouteDeps["applyStarterContent"],
    logAudit: audit,
  };
  registerSetupRoutes(router as unknown as SetupRouter, setupDeps);

  const run = (method: string, path: string, ctx: Partial<RouteContext> = {}) =>
    runRoute(findRoute(routes, method, path), ctx);

  return { world, run, routes };
};

const adminInput = {
  name: "Ada Admin",
  email: "ada@example.com",
  password: "correct horse staple",
};

describe("onboarding end to end (injected no-users state)", () => {
  test("installer -> session transition -> Basic -> starter -> Advanced -> finalize", async () => {
    const { world, run } = buildFlow();

    // ---- PHASE 1: installer (no-users gate via seam, NOT a truncated table) ---
    // Installer handlers run session-less (ctx.user undefined).
    expect(await run("GET", "/auth/install/status")).toEqual({ available: true });

    const created = (await run("POST", "/auth/install/admin", {
      body: adminInput,
      ip: "203.0.113.9",
      userAgent: "installer",
    })) as { ok: boolean; user: Record<string, unknown> };
    expect(created.ok).toBe(true);
    expect(created.user).toEqual({ id: "u1", email: "ada@example.com", name: "Ada Admin" });
    // No secret is ever echoed by the create response.
    expect(JSON.stringify(created)).not.toContain("password");
    expect(created.user).not.toHaveProperty("passwordHash");
    // Creation audited with the canonical action.
    expect(world.audits.some((a) => a.action === "auth.install.admin.created")).toBe(true);

    // Self-disable: status flips false the instant a user exists.
    expect(await run("GET", "/auth/install/status")).toEqual({ available: false });

    // A second create is rejected 409 install_unavailable AND audited as blocked.
    await expect(
      run("POST", "/auth/install/admin", { body: adminInput, ip: "203.0.113.9" })
    ).rejects.toMatchObject({ status: 409, code: "install_unavailable" });
    expect(world.audits.some((a) => a.action === "auth.install.blocked")).toBe(true);

    // ---- SESSION TRANSITION -------------------------------------------------
    // Installer ran with ctx.user undefined; from here internal routes run with
    // the authenticated first admin (permissions ['*']).
    const ctxAuthed: Partial<RouteContext> = {
      user: { id: world.users[0].id, permissions: ["*"] } as RouteContext["user"],
    };

    // Internal routes fail closed without a session (RBAC boundary).
    await expect(
      run("PATCH", "/settings", { body: { "site.name": "Acme" } })
    ).rejects.toMatchObject({ status: 401, code: "auth_required" });

    // ---- CSRF SEMANTICS (asserted on the real middleware directly) ----------
    // enforceCsrf lives in the httpServer PIPELINE, not in route.handlers, so it
    // is asserted here against core/server/middleware/csrf.ts, not by chain
    // composition. Session-less installer POST is skipped (accepted, no token);
    // a session-bound POST with no token is rejected 403.
    const csrfConfig = { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 };
    // Session-less (installer): accepted with no token.
    await expect(
      enforceCsrf(
        new Request("https://acme.test/auth/install/admin", { method: "POST" }),
        { params: {}, query: {}, body: undefined } as RouteContext,
        csrfConfig
      )
    ).resolves.toBeUndefined();
    // Session-bound POST with no CSRF token: rejected.
    await expect(
      enforceCsrf(
        new Request("https://acme.test/settings", { method: "PATCH" }),
        { params: {}, query: {}, body: undefined, sessionId: "sess-1" } as RouteContext,
        csrfConfig
      )
    ).rejects.toMatchObject({ status: 403, code: "csrf_invalid" });

    // ---- PHASE 2: Basic (incl. the new site.timezone key) -------------------
    await run("PATCH", "/settings", {
      ...ctxAuthed,
      body: {
        "site.name": "Acme",
        "site.timezone": "Europe/Warsaw",
        "site.publicBaseUrl": "https://acme.test",
      },
    });
    expect(world.settings.get("site.name")).toBe("Acme");
    expect(world.settings.get("site.timezone")).toBe("Europe/Warsaw");
    // The REAL bulk handler emits the canonical settings audit action.
    expect(world.audits.some((a) => a.action === "settings.update" && a.targetId === "bulk")).toBe(
      true
    );

    // ---- Starter content (setupRoutes, 06-L02) ------------------------------
    const preview = (await run("POST", "/setup/starter-content/preview", {
      ...ctxAuthed,
      body: { blueprintKey: "default" },
    })) as { summary: { total: number } };
    expect(preview.summary.total).toBeGreaterThan(0);

    await run("POST", "/setup/starter-content/apply", {
      ...ctxAuthed,
      body: { blueprintKey: "default" },
    });
    expect(world.settings.get("site.homepageId")).toBeTruthy();
    // The REAL apply handler emits the canonical starter-content audit action.
    expect(world.audits.some((a) => a.action === "setup.starter_content.applied")).toBe(true);

    // ---- Advanced — strict-schema / unknown-key rejection -------------------
    await expect(
      run("PATCH", "/settings", { ...ctxAuthed, body: { unknownKey: 1 } })
    ).rejects.toMatchObject({ status: 400, code: "settings_key_invalid" });

    // Advanced secret write is not echoed back by the write response.
    const advWrite = (await run("PATCH", "/settings", {
      ...ctxAuthed,
      body: { "auth.sessionTtlDays": 7 },
    })) as Record<string, unknown>;
    expect(JSON.stringify(advWrite)).not.toContain("password");

    // ---- FINALIZE — the wizard install-lock (setup.completed) ----------------
    await run("PATCH", "/settings", { ...ctxAuthed, body: { "setup.completed": true } });
    expect(world.settings.get("setup.completed")).toBe(true);

    // The server-side installer gate is the NO-USERS invariant, NOT setup.completed:
    // with the first admin present the installer stays permanently closed. (The
    // setup.completed lock is a SEPARATE, session-bound wizard gate — asserted
    // independently below and in 08-L02's `shouldShowSetupWizard` Vitest unit.)
    expect(await run("GET", "/auth/install/status")).toEqual({ available: false });
  });

  test("the installer gate is the no-users invariant, independent of the setup.completed lock", async () => {
    // Regression guard for the two ORTHOGONAL disable boundaries (08). Prove the
    // installer status route keys off isFirstRun ALONE — the setup.completed
    // wizard lock neither opens nor closes it.
    const { world, run } = buildFlow();

    // Wizard lock set true but still no users: the installer remains OPEN,
    // because setup.completed does NOT gate the server-side installer.
    world.settings.set("setup.completed", true);
    expect(await run("GET", "/auth/install/status")).toEqual({ available: true });

    // The instant any user exists the installer closes — the no-users invariant
    // is the sole server-side control, regardless of the wizard lock's value.
    world.users.push({ id: "u1", email: "a@b.c", name: "A", permissions: ["*"] });
    expect(await run("GET", "/auth/install/status")).toEqual({ available: false });

    world.settings.set("setup.completed", false);
    expect(await run("GET", "/auth/install/status")).toEqual({ available: false });
  });

  test("starter apply requires BOTH solution-kits:write and settings:write", async () => {
    const { world, run } = buildFlow();
    world.users.push({ id: "u1", email: "a@b.c", name: "A", permissions: ["*"] });

    // Only solution-kits:write (no settings:write) is rejected 403.
    await expect(
      run("POST", "/setup/starter-content/apply", {
        user: { id: "u1", permissions: ["solution-kits:write"] } as RouteContext["user"],
        body: { blueprintKey: "default" },
      })
    ).rejects.toMatchObject({ status: 403, code: "forbidden" });
  });

  test("starter selector must be exactly one of kitId/blueprintKey", async () => {
    const { run } = buildFlow();
    const ctxAuthed = {
      user: { id: "u1", permissions: ["*"] } as RouteContext["user"],
    };
    await expect(
      run("POST", "/setup/starter-content/preview", {
        ...ctxAuthed,
        body: { kitId: "x", blueprintKey: "default" },
      })
    ).rejects.toMatchObject({ status: 400, code: "starter_choice_invalid" });
  });
});
