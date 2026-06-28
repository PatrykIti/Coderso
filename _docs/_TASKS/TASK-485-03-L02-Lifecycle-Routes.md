# TASK-485-03-L02: Lifecycle write routes (plugins:manage, CSRF)
# FileName: TASK-485-03-L02-Lifecycle-Routes.md

**Parent Subtask:** TASK-485-03
**Priority:** High
**Category:** Store / Plugins / Admin API
**Estimated Effort:** Medium
**Dependencies:** TASK-485-03-L01 (`pluginLifecycleService` + schemas + errors).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Expose the lifecycle service over internal admin write routes so the
  page can install/update/uninstall/toggle/set-policy. Routes are
  orchestration-only and re-use the L01 schemas + error mapping.
- **Owning module(s) to create-or-extend:**
  - **Extend** `core/server/routes/pluginsRoutes.ts` — add the write routes, add
    a `validate` dep, and extend the local `Router` type with `put` (uninstall is
    modeled as `POST /plugins/:name/uninstall`, so no `delete` verb is needed; it
    currently exposes only `get`/`post`).
  - **Create** `core/server/validation/pluginSchemas.ts` — **re-export** the L01
    schemas (`installPluginSchema`, `updatePolicySchema`) for the `validate` dep.
  - **Extend** `core/server/routes/index.ts` — pass `validate` into
    `registerPluginsRoutes` (currently only `requirePermission`).
  - **Reuse** `core/server/errorHandler.ts` (`ApiError`).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/STORE_SPEC.md`.
- **Out of scope:** the lifecycle logic (L01), tests (L03), the catalog (subtask
  02). **No DB migration** (L01 reuses existing tables).

---

## Security Contract

- **Endpoint visibility:** `internal` — all under `/admin/api/plugins/*`:
  - `POST /plugins/install` `{ name, version }`
  - `POST /plugins/:name/update` `{ version, force? }`
  - `POST /plugins/:name/uninstall`
  - `POST /plugins/:name/enabled` `{ enabled }`
  - `PUT  /plugins/:name/policy` `{ policy }`
- **Auth model:** session cookie.
- **RBAC:** every write → `requirePermission("plugins:manage")`. (The existing
  `GET /plugins` stays on `plugins:read`; catalog browse stays on `store:browse`.)
- **CSRF:** **required** on all of the above (state-changing) via the central CSRF
  middleware; the admin client calls them with `apiRequest(..., { withCsrf:true })`.
  Routes must not opt out.
- **Rate-limit bucket:** `admin`. Install/update perform an external download —
  the downloader already caps size (`PLUGIN_MAX_SIZE_MB`) and timeout
  (`PLUGIN_DOWNLOAD_TIMEOUT_MS`); the route adds no unbounded work.
- **Validation:** `validate(installPluginSchema, ctx.body)` /
  `validate(updatePolicySchema, ctx.body)` — `.strict()` reject-unknown at the
  boundary; the service re-normalizes (defense in depth). `name`/`version` path
  params validated by the same regex posture as the catalog routes.
- **Anti-abuse:** internal authenticated writes — the `plugins:manage` gate +
  CSRF + `admin` rate-limit are the controls (no public nonce/HMAC/captcha needed;
  those apply to public writes per `_docs/SECURITY_SPEC.md`).
- **Secret/PII handling:** responses return only the secret-free plugin record /
  `{ ok:true }`; never the integrity/signature/store URL. Errors carry a stable
  code; never echo raw upstream bodies.

---

## Implementation Pseudocode

```ts
// core/server/validation/pluginSchemas.ts
export { installPluginSchema, updatePolicySchema }
  from "../../services/plugins/pluginLifecycleService"; // schema owner (L01)
```

```ts
// core/server/routes/pluginsRoutes.ts  (additions)
import { ApiError } from "../errorHandler";
import { logAudit } from "../../services/audit/auditService";
import {
  installPlugin, updatePlugin, uninstallPlugin, setEnabled, setPolicy,
  PluginLifecycleError,
} from "../../services/plugins/pluginLifecycleService";
import { installPluginSchema, updatePolicySchema } from "../validation/pluginSchemas";

export type PluginsRouteDeps = {
  requirePermission: (permission: string) => PluginsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;   // NEW
};
export type Router = {
  get: (p: string, ...h: PluginsRouteHandler[]) => void;
  post: (p: string, ...h: PluginsRouteHandler[]) => void;
  put: (p: string, ...h: PluginsRouteHandler[]) => void;    // NEW
};

function mapLifecycleError(e: unknown): ApiError | null {
  if (e instanceof PluginLifecycleError) return new ApiError(e.code, "Plugin lifecycle error", e.status, e.detail);
  return null;
}
async function withLifecycleErrors<T>(fn: () => Promise<T>) {
  try { return await fn(); } catch (e) { const m = mapLifecycleError(e); if (m) throw m; throw e; }
}

export function registerPluginsRoutes(router: Router, deps: PluginsRouteDeps) {
  const { requirePermission, validate } = deps;

  // ... existing GET /plugins (plugins:read) and POST /plugins/manifest/validate ...

  router.post("/plugins/install", requirePermission("plugins:manage"), async (ctx) =>
    withLifecycleErrors(async () => {
      validate(installPluginSchema, ctx.body);
      const { name, version } = ctx.body as { name: string; version: string };
      const plugin = await installPlugin(name, version, ctx.user?.id ?? null);
      return { item: plugin };
    }));

  router.post("/plugins/:name/update", requirePermission("plugins:manage"), async (ctx) =>
    withLifecycleErrors(async () => {
      const body = (ctx.body ?? {}) as { version: string; force?: boolean };
      const plugin = await updatePlugin(ctx.params.name, body.version, { actorId: ctx.user?.id ?? null, force: body.force });
      return { item: plugin };
    }));

  router.post("/plugins/:name/uninstall", requirePermission("plugins:manage"), async (ctx) =>
    withLifecycleErrors(async () => { await uninstallPlugin(ctx.params.name, ctx.user?.id ?? null); return { ok: true }; }));

  router.post("/plugins/:name/enabled", requirePermission("plugins:manage"), async (ctx) =>
    withLifecycleErrors(async () => {
      const { enabled } = (ctx.body ?? {}) as { enabled: boolean };
      const row = await setEnabled(ctx.params.name, Boolean(enabled), ctx.user?.id ?? null);
      return { item: row };
    }));

  router.put("/plugins/:name/policy", requirePermission("plugins:manage"), async (ctx) =>
    withLifecycleErrors(async () => {
      validate(updatePolicySchema, ctx.body);
      const { policy } = ctx.body as { policy: string };
      const next = await setPolicy(ctx.params.name, policy as any, ctx.user?.id ?? null);
      return { policy: next };
    }));
}
```

```ts
// core/server/routes/index.ts  (change the existing call)
registerPluginsRoutes(router, {
  requirePermission: deps.requirePermission,
  validate: deps.validate,        // NEW
});
```

**Data flow:** request → `plugins:manage` + CSRF + rate-limit → `validate` →
lifecycle service (verified pipeline / fs / DB / audit) → secret-free result.
**Error handling:** `withLifecycleErrors` maps `PluginLifecycleError` → `ApiError`
(`store_signature_invalid`/400, `store_checksum_mismatch`/400,
`plugin_incompatible`/409, `plugin_update_skipped`/409, `plugin_not_found`/404,
`plugin_install_failed`/502); Zod reject-unknown → 400; unmapped → global handler.

**Regression-test shape (Bun, L03):** each route registered with `plugins:manage`;
unknown body field rejected (400); install with a tampered checksum →
`store_checksum_mismatch`; update blocked by policy → `plugin_update_skipped`/409;
CSRF required (central middleware test asserts the write bucket).

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane (mandatory):** extend
  `tests/integration/routes/pluginsRoutes.test.ts` (registration + RBAC arg +
  reject-unknown + error mapping) and assert CSRF requirement via
  `tests/security/codersoSecurityGate.test.ts`. Load env first:
  `set -a && source .env && set +a`.
- State in the closeout if any command was skipped or could not run.
