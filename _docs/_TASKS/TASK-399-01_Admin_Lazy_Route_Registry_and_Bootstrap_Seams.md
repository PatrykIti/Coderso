# TASK-399-01: Admin Lazy Route Registry and Bootstrap Seams
# FileName: TASK-399-01_Admin_Lazy_Route_Registry_and_Bootstrap_Seams.md

**Priority:** High
**Category:** Admin UI + Bundle Performance + Routing
**Estimated Effort:** Large
**Dependencies:** TASK-399
**Status:** To Do

---

## Overview

Create the pure route-component helper and bootstrap-safe seams needed before
`AdminApp` can stop statically importing protected admin pages.

This leaf owns the non-behavioral extraction work:

- a typed helper for lazy-loading named React exports;
- route component descriptor helpers plus a small smoke descriptor set that keep
  preload/load functions stable at module scope;
- pure Settings default/value exports that `AdminApp` can import without pulling
  Settings page components into the entry chunk;
- a pure assistant runtime state cache helper so `AdminApp` does not import the
  full assistant panel only to clear runtime state.

## Source Findings

- `React.lazy` requires a default export, while admin pages use named exports.
- `AdminApp` currently imports Settings values/types from Settings page modules;
  leaving those imports in place would keep Settings UI in the entry chunk even
  if the routes become lazy.
- `AdminApp` imports `clearAssistantRuntimeStateCache` from `AssistantPanel`.
  The real cache is in-memory state in that module (`runtimeStateCache`,
  `runtimeStatePromise`, `loadAssistantRuntimeStateCached`,
  `clearAssistantRuntimeStateCache`), so this task must move the real state
  owner instead of introducing a localStorage-only shim.
- Lazy route descriptors must be module-scope constants so React does not see a
  new component identity on every render.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/app/adminRouteComponents.tsx` | New lazy route helper/types plus a small smoke descriptor set; the full protected inventory belongs to `TASK-399-03`. |
| `core/admin/ui/settings/settingsValues.ts` | New pure owner for Settings default values, exported value types, and the composite `SettingsValues`/`defaultSettingsValues` used by `AdminApp`. |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | Import/export Settings values from the pure owner. |
| `core/admin/ui/settings/AssistantSettingsCard.tsx` | Import/export Assistant settings values from the pure owner. |
| `core/admin/ui/settings/AssistantSettingsPage.tsx` | Consume pure Settings value types. |
| `core/admin/ui/assistant/assistantRuntimeStateCache.ts` | New pure owner for assistant runtime cache clearing. |
| `core/admin/ui/assistant/AssistantPanel.tsx` | Import cache helper from the pure owner and preserve public export if existing tests/calls need it. |
| `tests/vitest/admin/adminRouteComponents.test.tsx` | New tests for lazy named exports, preload caching, and loader import timing. |
| `tests/vitest/ui/assistant-panel-interaction.test.tsx` | Targeted regression if assistant cache imports move. |
| `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx` | Request/import budget smoke for the admin shell if current coverage does not already prove it. |

## Implementation Pseudocode

```tsx
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type LazyRouteComponent<Props = Record<string, never>> = {
  Component: LazyExoticComponent<ComponentType<Props>>;
  preload: () => Promise<{ default: ComponentType<Props> }>;
};

export function lazyNamedRoute<Props>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string
): LazyRouteComponent<Props> {
  let promise: Promise<{ default: ComponentType<Props> }> | null = null;
  const load = () => {
    promise ??= loader().then((module) => {
      const component = module[exportName];
      if (typeof component !== "function") {
        throw new Error(`admin_route_export_missing:${exportName}`);
      }
      return { default: component as ComponentType<Props> };
    });
    return promise;
  };
  return { Component: lazy(load), preload: load };
}

export const DashboardRoute = lazyNamedRoute(
  () => import("@/ui/dashboard/DashboardPage"),
  "DashboardPage"
);
```

Pure Settings owner shape:

```ts
export type GeneralSettingsValues = {
  siteName: string;
  siteLocale: string;
};

export const GENERAL_SETTINGS_DEFAULT_VALUES: GeneralSettingsValues = {
  // existing defaults moved without behavior changes
};

export type SettingsValues = GeneralSettingsValues &
  AssistantSettingsValues & {
    publicBaseUrl: string;
    authSessionTtlDays: number;
    authResetTtlMinutes: number;
    setupCompleted: boolean;
  };
```

Assistant cache owner shape:

```ts
let runtimeStateCache: AssistantRuntimeStatePayload | null = null;
let runtimeStatePromise: Promise<AssistantRuntimeStatePayload> | null = null;

export function clearAssistantRuntimeStateCache() {
  runtimeStateCache = null;
  runtimeStatePromise = null;
}

export function loadAssistantRuntimeStateCached(deps = defaultDeps) {
  if (runtimeStateCache) return Promise.resolve(runtimeStateCache);
  runtimeStatePromise ??= deps.load().then((payload) => {
    runtimeStateCache = payload;
    return payload;
  });
  return runtimeStatePromise;
}
```

Data flow:

- `AdminApp` imports pure Settings defaults and cache helpers.
- Page modules import the same pure defaults/types.
- `AssistantPanel` imports `loadAssistantRuntimeStateCached` and
  `clearAssistantRuntimeStateCache` from the pure owner and may re-export the
  clear helper for backward compatibility.
- Lazy route descriptors import page modules only inside dynamic loader
  functions.

Error handling:

- Missing named exports throw machine-readable `admin_route_export_missing:*`
  errors so route registry tests fail clearly.
- Assistant cache helpers avoid browser storage, keep the existing in-memory
  cache/promise semantics, and no-op clear only by resetting module state.
- Moving defaults must not change persisted values, validation, or settings
  update payloads.

## Security Contract

- Endpoint visibility: no endpoints added or changed.
- Auth model: unchanged; this task only moves browser modules.
- RBAC: unchanged; route guards are implemented in later leaves.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: unchanged Settings payload validation.
- Anti-abuse: no public write path.
- Secret handling: Settings defaults and assistant cache helpers must not expose
  provider keys, API-key secrets, storage credentials, session ids, or raw
  assistant messages in browser cache.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/adminRouteComponents.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/assistant-panel-interaction.test.tsx`
  if assistant cache imports move.
- `bun run test:vitest -- tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
  if this smoke lane does not already cover the shell import budget.
- Existing Settings targeted Vitest tests if value/default imports move.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- Changelog entry when this leaf is closed, either standalone or through the
  parent TASK-399 closure changelog.

## Acceptance Criteria

- `AdminApp` can import Settings defaults/types from a pure module.
- `AdminApp` can clear assistant runtime state without importing
  `AssistantPanel`.
- Lazy route descriptors cache a single promise per route component.
- `preload()` and `React.lazy()` share the same cached promise.
- Named-export adaptation is tested and fails clearly for missing exports.
- Route helper tests prove loader functions are not called at registry import
  time.
- No protected admin page module is imported by the route registry outside a
  dynamic loader.
- This leaf creates the seam but is not expected to shrink the admin entry
  chunk until `TASK-399-02` / `TASK-399-03` migrate route usage.
