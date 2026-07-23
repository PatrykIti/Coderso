# TASK-548-03-L01: Admin Route Registry Extraction and Help Navigation
# FileName: TASK-548-03-L01-Admin-Route-Registry-Extraction-And-Help-Navigation.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-03
**Priority:** High
**Category:** Admin Routing / Navigation / Modularity
**Estimated Effort:** Large
**Dependencies:** TASK-548-02
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Extract the route types, matching, and inline route definitions from the
1,237-line `core/admin/app/AdminApp.tsx` into a deterministic typed route-module
registry. Preserve exact behavior and leave every touched human-authored source
and test file below 1,000 lines.

This leaf also adds canonical **path-building helpers** for Help, but it does not
register `/admin/help` and does not change the current external Docs footer.
TASK-548-03-L02 adds a route module and changes the link atomically, so no
intermediate state contains a visible broken Help link.

## Exclusive Ownership

This leaf is the only writer for:

- `core/admin/app/AdminApp.tsx`;
- new Bun-free `core/admin/app/adminRouteDescriptorContract.ts`;
- new `core/admin/app/adminRouteRegistry.tsx`;
- new Bun-free
  `core/admin/app/routes/core.admin-route-descriptor.ts`;
- new `core/admin/app/routes/core.admin-route.tsx`;
- `core/admin/utils/adminPaths.ts`;
- new `tests/vitest/admin/admin-route-registry.test.tsx`;
- the route-extraction assertions in `tests/vitest/admin/adminApp.test.tsx`;
- Help path-helper assertions in `tests/vitest/admin/adminPaths.test.ts`.

It must not edit `core/admin/ui/navigation/sidebarConfig.ts`, add a Help route
module, build Help UI, or touch TASK-547 files. L02 may add the paired
`core/admin/app/routes/help.admin-route-descriptor.ts` and
`core/admin/app/routes/help.admin-route.tsx` without editing L01-owned files.

## Canonical Route Descriptor Contract

`core/admin/app/adminRouteDescriptorContract.ts` owns:

```ts
type AdminRouteDescriptorV1 = {
  schema: "coderso.admin-route-descriptor@v1";
  routeId: string;
  moduleId: string;
  moduleOrder: number;
  routeOrder: number;
  pattern: string;
  visibility: "public" | "authenticated";
  permissionRequirement: DocsPermissionRequirementV1 | null;
  capabilityIds: string[];
};

export function normalizeAdminRouteDescriptorsV1(
  value: unknown
): readonly AdminRouteDescriptorV1[];
```

The complete current core snapshot is the named
`CORE_ADMIN_ROUTE_DESCRIPTORS_V1` export from the Bun-free
`core/admin/app/routes/core.admin-route-descriptor.ts`; it imports no React,
TSX, Vite, DB or runtime adapter. L02 owns the named
`HELP_ADMIN_ROUTE_DESCRIPTORS_V1` export at the paired pure path. TASK-548-06
explicitly imports those pure constants and the generic owner normalizer; this
leaf invents no aggregate coverage helper or parallel list.

Current `permission` becomes one-entry `allOf`; `anyPermissions` becomes
`anyOf`; neither becomes null. Null means no extra catalog permission, while
`visibility` separately distinguishes login/reset public routes from
authenticated routes such as `/preview`. Non-null permissions are non-empty,
unique, sorted and catalog-validated. `capabilityIds` uses the exact bounded,
sorted, catalog-backed field from TASK-548-01.

Each `*.admin-route.tsx` imports its paired exact named pure descriptor constant
and exposes that same array reference only through the identity alias
`descriptors`, plus `bindings` keyed by `routeId`. It does not re-export the
named pure constant and has no default/extra export. The registry discovers all
TSX pairs, aggregates every module's `descriptors` and `bindings`, then validates
parity and duplicates. TASK-548-06 consumes only the named constants directly
from pure descriptor files and never imports TSX or executes `import.meta.glob`.

## Route Module Contract

Use Vite's current typed `import.meta.glob` support to discover only
`./routes/*.admin-route.tsx` render modules. Normalize the eager module record
and pair it with the pure descriptor before use:

- `adminRouteRegistry.tsx` owns the React-coupled
  `AdminRouteRenderModuleV1` shape: `{ descriptors: readonly
  AdminRouteDescriptorV1[]; bindings: Readonly<Record<string,
  AdminRouteRender>> }`;
- each module exports exactly one non-empty `descriptors` array imported from
  its pure pair plus one exact `bindings` record; these are the only module
  exports, with no default or extra namespace key;
- sort by `moduleOrder`, `moduleId`, `routeOrder`, then `routeId`;
- require one consistent `moduleOrder` for each repeated `moduleId`, reject one
  `moduleOrder` assigned to different module IDs, and reject duplicate route
  IDs, per-module route orders, or normalized route patterns;
- keep static paths before potentially overlapping parameter paths;
- reject malformed patterns, empty permission arrays, and a descriptor that
  tries to mark a protected Admin surface public;
- reject missing/extra bindings or ID/pattern/order/visibility/permission drift
  between pure descriptors and React bindings;
- build the registry once outside React render, not on every navigation;
- inject/render the existing `NotFound` outcome only after no route matches.

The core module contains the current route list in its current precedence. The
registry is repository-owned build input, not a plugin/runtime extension
surface.

## Security Contract

- **Endpoint visibility:** no endpoint or live Help route changes.
- **Auth/RBAC:** all current protected/public route classification and
  `permission`/`anyPermissions` behavior remains byte-for-behavior compatible.
  Missing/malformed permission snapshots continue to fail closed.
- **CSRF/rate limit:** no request contract changes.
- **Validation:** route modules are exact-shape, duplicate-free, deterministic,
  and fail the build/tests on invalid definitions.
- **Anti-abuse:** no public write; nonce/HMAC/reCAPTCHA are not applicable.
- **Navigation:** new helpers only construct canonical local Help hrefs through
  `resolveAdminHref`; no raw redirect or arbitrary URL input is introduced.

## Implementation Pseudocode

```tsx
// adminRouteRegistry.tsx
export type AdminRouteRenderModuleV1 = {
  descriptors: readonly AdminRouteDescriptorV1[];
  bindings: Readonly<Record<string, AdminRouteRender>>;
};

const discovered = import.meta.glob<AdminRouteRenderModuleV1>(
  "./routes/*.admin-route.tsx",
  { eager: true }
);

export function normalizeAdminRouteModules(
  modules: Record<string, AdminRouteRenderModuleV1>
): AdminRouteDefinition[] {
  const pairedModules = Object.entries(modules).map(([source, value]) =>
    assertAdminRouteModule(source, value)
  );
  const descriptors = pairedModules.flatMap((module) => module.descriptors);
  const bindings = mergeRouteBindings(pairedModules);
  const normalized = normalizeAdminRouteDescriptorsV1(descriptors);
  assertEveryDescriptorHasExactlyOneBinding(normalized, bindings);
  assertEveryBindingHasExactlyOneDescriptor(bindings, normalized);
  assertUniqueModuleIdsOrdersRouteIdsAndPatterns(normalized);
  return bindAndSortAdminRoutes(normalized, bindings);
}

export function resolveAdminRoute(
  path: string,
  routes: readonly AdminRouteDefinition[]
): AdminRouteMatch | null {
  for (const route of routes) {
    const params = matchAdminRoute(route.pattern, path);
    if (params) return { ...route, params };
  }
  return null;
}

// adminPaths.ts
export const adminHelpPath = (input?: {
  docId?: string;
  sectionId?: string;
  query?: string;
}) => appendBoundedHelpQuery("/help", input);
```

**Data flow:** eager build-owned route modules → strict normalization and stable
sort → one registry → canonical path match → existing RBAC guard → lazy render.

**Error handling:** invalid URI components return no match rather than throwing
the Admin shell; duplicate/malformed definitions fail deterministically during
module normalization; unknown paths render the existing 404. Help query values
are bounded and `URLSearchParams`-encoded.

**Regression-test shape:**

- pin the complete pre-extraction path/permission/order inventory;
- prove the Bun-free descriptor imports without React/Vite/runtime effects and
  has the exact same IDs, patterns, order, visibility and normalized
  null/allOf/anyOf requirement plus `capabilityIds` as every React binding;
- prove authenticated `/preview` normalizes to null and remains accessible to
  an authenticated empty-permission snapshot, while public login/reset
  visibility remains independently classified;
- inventory every discovered `*.admin-route.tsx` module and prove its same-stem
  pure `*.admin-route-descriptor.ts` pair exists, its exported `descriptors`
  alias has reference identity with the imported named pure constant, its module
  namespace contains exactly `descriptors`/`bindings`, and it has one binding
  per route ID;
- prove literal and parameter routes still resolve with decoded params;
- prove duplicate ids/orders/patterns and empty `anyPermissions` reject;
- prove an invalid encoded path does not crash;
- render existing guarded/settings routes through `AdminApp`;
- prove Help helper output respects custom Admin base paths and encodes
  `docId`, `sectionId`, and query values;
- prove the footer still points to the existing external Docs URL in this leaf;
- line-count `AdminApp.tsx`, registry/core route modules, and touched tests.

## Sub-Tasks

- [ ] Extract route types, matcher, registry, and current definitions.
- [ ] Add the exact Bun-free descriptor contract/core snapshot and bind React
  rendering by stable route ID.
- [ ] Add deterministic module/duplicate/precedence validation.
- [ ] Add bounded canonical Help path helpers without activating Help.
- [ ] Preserve AdminApp SSR, lazy route, RBAC, settings, and 404 parity.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts \
  tests/vitest/ui/admin-shell-nav.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
wc -l core/admin/app/AdminApp.tsx \
  core/admin/app/adminRouteDescriptorContract.ts \
  core/admin/app/adminRouteRegistry.tsx \
  core/admin/app/routes/core.admin-route-descriptor.ts \
  core/admin/app/routes/core.admin-route.tsx \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts
git diff --check
```

Every count must be at most 1,000. Re-run a named failing test alone before
classifying it.

## Acceptance Criteria

- `AdminApp.tsx` and every new/touched module or test is below 1,000 physical
  lines.
- The extracted registry has deterministic, tested discovery and fails closed
  on duplicates or malformed modules.
- The pure descriptor snapshot is the sole route metadata source, is consumable
  by TASK-548-06 through the named core/help constants plus generic normalizer
  without TSX/Vite, and has exact React binding parity.
- Every existing route, parameter, permission, render context, lazy component,
  settings guard, alias, SSR outcome, and 404 remains equivalent.
- Canonical Help href helpers exist and are bounded/base-path safe.
- No `/admin/help` route or local Help link is visible until L02 lands.

## Documentation Updates Required

Hand the canonical registry, permission-aware navigation, and route-test
contract to TASK-548-07; this leaf edits no shared closeout documentation.
