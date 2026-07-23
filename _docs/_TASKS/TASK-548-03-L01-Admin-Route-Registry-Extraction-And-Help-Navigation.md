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
- `core/admin/services/authClient.ts`;
- `core/admin/utils/adminPaths.ts`;
- new `tests/vitest/admin/admin-route-registry.test.tsx`;
- the route-extraction assertions in `tests/vitest/admin/adminApp.test.tsx`;
- strict raw permission-state assertions in
  `tests/vitest/admin/authClient.test.ts`;
- Help path-helper assertions in `tests/vitest/admin/adminPaths.test.ts`.

It must not edit `core/admin/ui/navigation/sidebarConfig.ts`, add a Help route
module, build Help UI, or touch TASK-547 files. L02 may add the paired
`core/admin/app/routes/help.admin-route-descriptor.ts` and
`core/admin/app/routes/help.admin-route.tsx` without editing L01-owned files.

### Read-only dependencies

`core/admin/services/authClient.ts` imports the existing exact
`listPermissionIds` export from the Bun-free
`core/services/admin/permissionsCatalog.ts`. That catalog and its tests are
read-only dependencies, not writer ownership for this leaf. No browser-local
permission list or duplicate catalog may be introduced.

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
`visibility` separately preserves public login/reset and public token-gated
`/preview` versus authenticated routes. `/preview` remains
`visibility: "public"` with `permissionRequirement: null`; its existing preview
token validation is unchanged and remains the authorization boundary. Non-null
permissions are non-empty, unique, sorted and catalog-validated.
`capabilityIds` uses the exact bounded, sorted, catalog-backed field from
TASK-548-01.

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
- every `AdminRouteRender` context preserves the existing normalized
  `authPermissions` array and additionally carries the fail-closed raw state as
  `authPermissionSnapshot: { state: "ready"; permissions: readonly string[] } |
  { state: "missing" | "malformed" }`; L02 passes that exact structural value to
  its Bun-free action resolver. A live full-access role preserves the canonical
  ready sentinel `permissions: ["*"]`; `*` may not be combined with another
  permission, duplicated or used in an authored route requirement;
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

## Pre-Loss Permission State Contract

`core/admin/services/authClient.ts` owns this exact scalar, `AuthUser` field and
normalization helper:

```ts
export type AdminPermissionSnapshotStateV1 =
  | "ready"
  | "missing"
  | "malformed";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  permissionSnapshot: AdminPermissionSnapshot | null;
  permissionSnapshotState: AdminPermissionSnapshotStateV1;
};

export function normalizeAdminPermissionSnapshotWithStateV1(
  value: unknown
): Pick<AuthUser, "permissionSnapshot" | "permissionSnapshotState">;
```

The helper classifies the untouched raw `permissionSnapshot` before any
filtering, sorting or deduplication. Absent/null is `missing`. A non-object,
missing/non-array `permissions`, any non-string/unknown permission, duplicate,
or wildcard mixed with another value is `malformed`, returns
`permissionSnapshot: null`, and therefore stays fail-closed for `canAdmin`.
Only an exact sole-member `["*"]` is the live full-access sentinel. Otherwise
every permission must occur in a `ReadonlySet` built from the exact
`listPermissionIds()` result and be unique. A `ready` result may sort that
validated array deterministically only after classification, but never filters
or deduplicates it, and retains the existing normalized roles contract.

`normalizeAuthUser` copies both returned fields. `AdminApp` derives its action
context structurally: a ready user supplies
`{ state: "ready", permissions: user.permissionSnapshot.permissions }`; a
missing/malformed state supplies the same state without permissions, and an
impossible ready/null pairing degrades to `{ state: "malformed" }`. This leaf
does not declare or import a duplicate `DocsAdminPermissionSnapshotV1`;
TASK-548-03-L02 remains the sole named renderer-type/evaluator owner and proves
the structural handoff. This browser normalization seam changes no server
authentication or endpoint: existing Admin/Assistant APIs remain authenticated
by the Admin session cookie and protected by server RBAC.

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
export type AdminHelpPathInput =
  | {
      query?: string;
      docId?: never;
      locale?: never;
      sectionId?: never;
    }
  | {
      docId: string;
      locale: string;
      sectionId?: string;
      query?: string;
    };

export function adminHelpPath(input?: AdminHelpPathInput): string;
export function adminHelpPath(input: unknown = {}): string {
  const normalized = normalizeAdminHelpPathInputV1(input);
  return appendBoundedHelpQuery("/help", normalized);
}
```

**Data flow:** eager build-owned route modules → strict normalization and stable
sort → one registry → canonical path match → existing RBAC guard → lazy render.

**Error handling:** invalid URI components return no match rather than throwing
the Admin shell; duplicate/malformed definitions fail deterministically during
module normalization; unknown paths render the existing 404. Help query values
are bounded and `URLSearchParams`-encoded. The Help-input normalizer is
reject-unknown: empty/root and query-only input produce `/help` or
`/help?q=...`; a document input requires non-empty bounded `docId` and canonical
BCP-47 `locale` together; `sectionId` is allowed only with that full tuple.
Every unknown or partial identity combination throws
`admin_help_path_input_invalid`. The result remains route-relative and is
resolved by existing `resolveAdminHref`/`AdminLink`, so custom Admin base paths
retain their current semantics without a hard-coded `/admin`.

**Regression-test shape:**

- pin the complete pre-extraction path/permission/order inventory;
- prove the Bun-free descriptor imports without React/Vite/runtime effects and
  has the exact same IDs, patterns, order, visibility and normalized
  null/allOf/anyOf requirement plus `capabilityIds` as every React binding;
- prove public `/preview` normalizes to null, remains public, and preserves
  exact valid-token success plus missing/invalid/expired-token denial parity
  before and after extraction; public login/reset and authenticated routes
  remain independently classified;
- inventory every discovered `*.admin-route.tsx` module and prove its same-stem
  pure `*.admin-route-descriptor.ts` pair exists, its exported `descriptors`
  alias has reference identity with the imported named pure constant, its module
  namespace contains exactly `descriptors`/`bindings`, and it has one binding
  per route ID;
- prove literal and parameter routes still resolve with decoded params;
- prove duplicate ids/orders/patterns and empty `anyPermissions` reject;
- prove an invalid encoded path does not crash;
- render existing guarded/settings routes through `AdminApp`;
- prove empty and query-only Help input yields `/help` and encoded
  `/help?q=...`; prove document links encode required `docId` plus canonical
  BCP-47 `locale`, optional `sectionId`, and query; use the same
  `docId`/`sectionId` in two locales and prove distinct hrefs;
- reject unknown keys and every partial localized identity, including lone
  `docId`, locale or `sectionId`, `docId + sectionId`, and
  `locale + sectionId`; pass valid route-relative output through
  `resolveAdminHref` for default and custom Admin bases;
- classify raw permissions before normalization; prove non-string, an unknown
  catalog ID such as `unknown:permission`, duplicate and mixed-wildcard arrays
  are `malformed` and fail `canAdmin`; prove catalog membership comes from the
  exact `listPermissionIds` import rather than a browser-local list;
  absent/null is `missing`, canonical unique arrays are `ready`, and exact
  `["*"]` remains unchanged;
- preserve live `permissions: ["*"]` as the sole full-access sentinel while
  rejecting duplicate or mixed wildcard snapshots before route rendering;
- prove the footer still points to the existing external Docs URL in this leaf;
- line-count `AdminApp.tsx`, registry/core route modules, and touched tests.

## Sub-Tasks

- [ ] Extract route types, matcher, registry, and current definitions.
- [ ] Add the exact Bun-free descriptor contract/core snapshot and bind React
  rendering by stable route ID.
- [ ] Add deterministic module/duplicate/precedence validation.
- [ ] Add strict discriminated, runtime-validated canonical Help path helpers
  without activating Help.
- [ ] Preserve raw permission validity through the exact `authClient.ts` state
  seam before building the structural route action snapshot.
- [ ] Preserve AdminApp SSR, lazy route, RBAC, settings, and 404 parity.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/authClient.test.ts \
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
  core/admin/services/authClient.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/authClient.test.ts \
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
- Canonical Help href helpers are reject-unknown, enforce the full localized
  identity tuple, preserve query-only root Help and are bounded/base-path safe.
- The raw permission state reaches AdminApp before lossy normalization;
  malformed snapshots fail closed and sole `["*"]` remains full access.
- No `/admin/help` route or local Help link is visible until L02 lands.

## Documentation Updates Required

Hand the canonical registry, permission-aware navigation, and route-test
contract to TASK-548-07; this leaf edits no shared closeout documentation.
