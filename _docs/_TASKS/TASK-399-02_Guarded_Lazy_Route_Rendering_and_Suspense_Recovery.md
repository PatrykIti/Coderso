# TASK-399-02: Guarded Lazy Route Rendering and Suspense Recovery
# FileName: TASK-399-02_Guarded_Lazy_Route_Rendering_and_Suspense_Recovery.md

**Priority:** High
**Category:** Admin UI + Routing + RBAC + Resilience
**Estimated Effort:** Large
**Dependencies:** TASK-399-01
**Status:** Done (2026-06-04)

---

## Overview

Refactor `AdminApp` route definitions so protected route components are rendered
only after route-level auth/RBAC checks pass. Add the Suspense boundary and
chunk-load recovery path needed for dynamic route imports.

The key contract is that denied routes must not import or mount the denied page
module. Static `element` values are not enough because JSX creation can happen
before the route is authorized. Route definitions need a render function that is
called after `canAccessRoute(route)` has passed.

This leaf changes the route table shape for the full table, but only migrates a
minimal protected sample into dynamic imports: one propless route such as
`/backups` and one prop-passing route such as `/settings`. `TASK-399-03` owns
the remaining protected route inventory.

## Source Findings

- `AdminApp` currently stores `element: React.ReactNode` in route definitions.
- Users/Roles and Settings routes pass live props from `AdminApp` state.
- `AccessDenied` is rendered after `resolveRoute`; that gate should remain
  before any protected route component render.
- Dynamic import failures from stale deploys or missing assets otherwise
  white-screen React without a local recovery boundary.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/app/AdminApp.tsx` | Change route definitions from `element` to guarded `render(ctx)` functions across the table; migrate one simple protected route and one prop-passing protected route to lazy descriptors. |
| `core/admin/app/AdminRouteErrorBoundary.tsx` | New small error boundary for dynamic import failures and reload affordance. |
| `tests/vitest/admin/AdminRouteErrorBoundary.test.tsx` | New focused tests for route chunk failure UI and reset behavior. |
| `tests/vitest/admin/adminApp.test.tsx` | Cover denied routes not invoking lazy loaders, setup wizard not invoking target loaders, Suspense fallback, SSR bootstrap, and prop-passing route behavior. |

## Implementation Pseudocode

```tsx
type RouteRenderContext = {
  authPermissions: string[];
  settingsState: SettingsState;
  settingsSaving: boolean;
  saveGeneralSettings: (values: GeneralSettingsValues) => Promise<void>;
  saveAssistantSettings: (values: AssistantSettingsValues) => Promise<void>;
};

type RouteDefinition = {
  pattern: string;
  permission?: string;
  anyPermissions?: string[];
  render: (ctx: RouteRenderContext) => React.ReactNode;
};

type RouteMatch = {
  params: Record<string, string>;
  permission?: string;
  anyPermissions?: string[];
  render: (ctx: RouteRenderContext) => React.ReactNode;
};

const route = resolveRoute(canonicalRelativePath, routes);
if (isProtected && authState === "checking") return <Loading />;
if (isProtected && authState !== "authenticated") return redirectToLogin();
if (isProtected && !canAccessRoute(route)) {
  return { ...route, render: () => <AccessDenied /> };
}
if (shouldShowSetupWizard(...)) return <SetupWizard ... />;

const routeElement = match.render(routeRenderContext);

return (
  <AdminRouteErrorBoundary resetKey={canonicalRelativePath}>
    <Suspense fallback={<Loading />}>{routeElement}</Suspense>
  </AdminRouteErrorBoundary>
);
```

Error boundary shape:

```tsx
class AdminRouteErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert">
        <h1>Admin route failed to load</h1>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
```

Data flow:

- Auth bootstrap resolves before protected route rendering.
- `resolveRoute` returns metadata and a render callback, not a pre-created page.
- `canAccessRoute` checks permission metadata.
- Setup wizard routing is decided before the protected route render callback is
  invoked, so incomplete setup does not load the target page chunk.
- Only allowed routes call `render(ctx)`, which creates a lazy route component.
- Suspense displays the existing `Loading` UI while the route chunk loads.

Error handling:

- Dynamic-import failure renders a bounded error state with a manual reload.
- The boundary must not auto-reload in a loop.
- The boundary hides stack traces, generated chunk URLs, and query strings from
  visible UI copy.
- The boundary resets when `canonicalRelativePath` changes.
- Unknown routes still render `NotFound`.
- Denied routes still render `AccessDenied` and do not trigger lazy loader
  promise creation.

## Security Contract

- Endpoint visibility: no endpoints added or changed.
- Auth model: protected route rendering remains blocked until authenticated.
- RBAC: route render callbacks must not run before permission checks.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: unchanged.
- Anti-abuse: no public write path.
- Secret handling: route-load errors must not print stack traces, chunk URLs
  with sensitive query strings, tokens, or settings payloads to the UI.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx`
- Add/adjust tests for:
  - denied route does not call the route loader;
  - setup wizard route does not call the target route loader;
  - protected-route `renderToString` bootstrap/loading path does not call lazy
    route loaders;
  - allowed lazy route shows fallback then page;
  - `/login`, `/2fa`, `/reset`, `/reset/confirm`, and `/preview` remain eager
    and do not show lazy fallback;
  - Users/Roles receive `authPermissions`;
  - Settings routes receive the same save/loading/error props;
  - settings clients are not called for users without `settings:read`.
- `bun run test:vitest -- tests/vitest/admin/AdminRouteErrorBoundary.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- Changelog entry when this leaf is closed, either standalone or through the
  parent TASK-399 closure changelog.

## Acceptance Criteria

- `RouteDefinition` no longer requires pre-created page `element` nodes for
  protected route pages.
- Auth/RBAC guards execute before lazy route component render.
- Suspense fallback is scoped inside admin providers and does not remove theme
  token style or toaster.
- Dynamic import failure is recoverable without exposing sensitive details.
- The error boundary offers a manual reload button, never loops reloads, and
  resets on route changes.
- Existing AdminApp tests remain green after async route rendering adjustments.
- `TASK-399-02` leaves the full route migration to `TASK-399-03`; only the
  selected simple and prop-passing protected routes are lazy in this leaf.
