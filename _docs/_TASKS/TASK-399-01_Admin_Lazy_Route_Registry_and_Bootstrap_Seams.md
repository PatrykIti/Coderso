# TASK-399-01: Admin Lazy Route Registry and Bootstrap Seams
# FileName: TASK-399-01_Admin_Lazy_Route_Registry_and_Bootstrap_Seams.md

**Priority:** High
**Category:** Admin UI + Bundle Performance + Routing
**Estimated Effort:** Large
**Dependencies:** TASK-399
**Status:** To Do

---

## Overview

Create the pure route-component registry and bootstrap-safe seams needed before
`AdminApp` can stop statically importing protected admin pages.

This leaf owns the non-behavioral extraction work:

- a typed helper for lazy-loading named React exports;
- route component descriptors that keep preload/load functions stable at module
  scope;
- pure Settings default/value exports that `AdminApp` can import without pulling
  Settings page components into the entry chunk;
- a pure assistant runtime cache helper so `AdminApp` does not import the full
  assistant panel only to clear runtime state.

## Source Findings

- `React.lazy` requires a default export, while admin pages use named exports.
- `AdminApp` currently imports Settings values/types from Settings page modules;
  leaving those imports in place would keep Settings UI in the entry chunk even
  if the routes become lazy.
- `AdminApp` imports `clearAssistantRuntimeStateCache` from
  `AssistantPanel`; that helper should live in a tiny pure module.
- Lazy route descriptors must be module-scope constants so React does not see a
  new component identity on every render.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/app/adminRouteComponents.tsx` | New lazy route helper and authenticated page route descriptors. |
| `core/admin/ui/settings/settingsValues.ts` | New pure owner for Settings default values and exported value types used by `AdminApp`. |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | Import/export Settings values from the pure owner. |
| `core/admin/ui/settings/AssistantSettingsCard.tsx` | Import/export Assistant settings values from the pure owner. |
| `core/admin/ui/settings/AssistantSettingsPage.tsx` | Consume pure Settings value types. |
| `core/admin/ui/assistant/assistantRuntimeStateCache.ts` | New pure owner for assistant runtime cache clearing. |
| `core/admin/ui/assistant/AssistantPanel.tsx` | Import cache helper from the pure owner and preserve public export if existing tests/calls need it. |
| `tests/vitest/admin/adminRouteComponents.test.tsx` | New tests for lazy named exports and preload caching. |

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
  supportEmail: string;
  setupCompleted: boolean;
  // keep existing fields exactly
};

export const GENERAL_SETTINGS_DEFAULT_VALUES: GeneralSettingsValues = {
  // existing defaults moved without behavior changes
};
```

Assistant cache owner shape:

```ts
const ASSISTANT_RUNTIME_STATE_CACHE_KEY = "coderso.assistant.runtimeState";

export function clearAssistantRuntimeStateCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ASSISTANT_RUNTIME_STATE_CACHE_KEY);
}
```

Data flow:

- `AdminApp` imports pure Settings defaults and cache helpers.
- Page modules import the same pure defaults/types.
- Lazy route descriptors import page modules only inside dynamic loader
  functions.

Error handling:

- Missing named exports throw machine-readable `admin_route_export_missing:*`
  errors so route registry tests fail clearly.
- Pure cache helpers no-op when `window` is absent.
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
- Existing Settings/Assistant targeted Vitest tests if imports move.
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
- Named-export adaptation is tested and fails clearly for missing exports.
- No protected admin page module is imported by the route registry outside a
  dynamic loader.
