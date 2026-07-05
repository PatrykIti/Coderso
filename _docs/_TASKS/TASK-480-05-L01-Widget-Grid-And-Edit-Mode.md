# TASK-480-05-L01: Widget Grid + Edit Mode
# FileName: TASK-480-05-L01-Widget-Grid-And-Edit-Mode.md

**Priority:** High
**Category:** Admin UI / Dashboard / Configurable Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-480-03 (cached layout client) · TASK-480-04 (`DashboardWidgetHost`, widget UI registry)
**Status:** ✅ Done
**Started:**
**Completed:** 2026-07-05
**Parent Subtask:** TASK-480-05

---

## Overview

Render the saved Dashboard layout as a responsive grid of `<DashboardWidgetHost>`
and add an **Edit toggle** that turns the grid into a builder: arrange (reorder),
resize (column span / row height), remove, and **Save**. State is a reducer with
lazy init — never sync `setState` in effects. The grid lives inside the
TASK-479-07 Dashboard shell. Add/remove of NEW widgets and the per-widget configure
panel are L02; this leaf owns the grid, the edit-mode lifecycle, dirty-state, and
the Save round-trip.

- **Goal:** `DashboardPage.tsx` hosts a `<DashboardBuilder>` that (1) hydrates the
  layout from the `dashboard:layout` cache and renders each widget via
  `DashboardWidgetHost`, (2) on **Edit**, lets the user reorder/resize/remove
  widgets with both pointer DnD and a keyboard-operable fallback, (3) tracks dirty
  state, (4) **Save** persists via the cached client and (5) **Discard** reverts to
  the last saved layout. No mount-force refetch loop; background revalidation never
  overwrites a dirty draft.
- **Owning module/service:**
  - `core/admin/ui/dashboard/builder/DashboardBuilder.tsx` (new)
  - `core/admin/ui/dashboard/builder/useDashboardBuilder.ts` (new — reducer hook)
  - `core/admin/ui/dashboard/builder/WidgetGrid.tsx` (new — grid + arrange/resize)
  - integration edit into `core/admin/ui/dashboard/DashboardPage.tsx`
- **Source-of-truth docs:**
  - Layout contract: `core/services/dashboard/dashboardWidgetContract.ts`
    (`DashboardLayout`, `DashboardWidget`, `normalizeDashboardLayout`,
    `DEFAULT_DASHBOARD_LAYOUT`) + `dashboardTypes.ts` (types) — owned by TASK-480-02
  - Cached client: `core/admin/services/dashboardClient.ts`
    (`getDashboardLayoutCached`, `saveDashboardLayout`) — TASK-480-03
  - Widget host + registry/catalog:
    `core/admin/ui/dashboard/widgets/DashboardWidgetHost.tsx`,
    `core/admin/ui/dashboard/widgets/registry.tsx` (`DASHBOARD_WIDGET_RENDERERS`
    + `DASHBOARD_WIDGET_CATALOG`) — TASK-480-04
  - Shell/patterns: TASK-479-06 (`PageHeader`, `SectionCard`, `Button`),
    `core/admin/ui/dashboard/DashboardPage.tsx` (TASK-479-07 restyle)
  - Cache contract: `_docs/ADMIN_CACHE.md` (Editors section — dirty-guarded
    background revalidation), `core/admin/utils/cacheBus.ts`
  - Permission accessor used by the shell: `useAdminCan()` →
    `can(permission)` (`core/admin/ui/contexts/AdminAuthContext.tsx`) — `_docs/RBAC_SPEC.md`
- **Out of scope:** Add-widget catalog + configure panel (L02); widget renderer
  internals (TASK-480-04) and route/cache implementation for widget data
  (TASK-480-03; this leaf only consumes `WidgetDataState`);
  schema (480-02) / route + cache-key (480-03) definitions; tests (L03).

---

## Security Contract

- **Endpoint visibility:** `internal` — consumes `/admin/api/dashboard/layout`
  (`GET`/`PUT`) only, through the cached client (never raw `fetch`).
- **Auth model:** session (admin) via shared `apiClient`.
- **RBAC:** the Edit toggle and Save are gated client-side on the dashboard layout
  write permission (`dashboard:write`); when absent, render the grid read-only and
  hide Edit/Save. Widget data reads remain `content:read` (enforced inside the
  hosts / route). Client gating is defence-in-depth; the `PUT` route is the boundary.
- **CSRF:** the layout `PUT` carries the CSRF token via `apiClient` — do not bypass.
- **Rate-limit buckets:** `admin_read` for layout/widget-data GET reads and
  `admin_write` for layout writes/body POSTs (route-enforced).
- **Validation:** the builder emits a `DashboardLayout` already shaped to
  `dashboardLayoutSchema`; the route re-validates and rejects unknown fields. The
  builder must not introduce fields outside the schema (e.g. transient UI flags
  stay in reducer state, never serialized).
- **Secret handling:** layout = widget ids + type + position/size + non-secret
  config; nothing secret-bearing is cached, logged, or sent.

---

## Implementation Pseudocode

### Layout shape consumed (owned by TASK-480-02 — imported, not redefined)

```ts
// Canonical types live in the TASK-480-02 owner (core/services/dashboard).
// Consumers IMPORT them; this leaf never re-declares the widget/layout types.
import type {
  DashboardWidget,
  DashboardWidgetType,     // 9 kebab values (see below)
  DashboardWidgetConfig,
  DashboardLayout,
} from "../../../../services/dashboard/dashboardTypes";

// Shape shown for reference only (owned by TASK-480-02; do NOT redefine here):
//   DashboardWidget = {
//     id: string;                    // stable per-instance id (nanoid/uuid)
//     type: DashboardWidgetType;     // "totals-counters" | "content-type-counts" | "content-over-time"
//                                    //   | "recent-activity" | "storage-usage" | "site-health"
//                                    //   | "security-summary" | "quick-actions" | "content-query"
//     title?: string;                // optional title override
//     config: DashboardWidgetConfig; // discriminated by `kind` (=== type); schema-validated (L02 edits it)
//     position: { x: number; y: number; w: number; h: number }; // per-widget grid geometry (12-col)
//   };
//   DashboardLayout = { version: number; widgets: DashboardWidget[] };
```

### Reducer hook (react-hooks-safe: lazy init, no sync setState in effects)

```ts
// core/admin/ui/dashboard/builder/useDashboardBuilder.ts
type BuilderStatus = "hydrating" | "ready" | "saving" | "error";
type BuilderState = {
  status: BuilderStatus;
  editing: boolean;
  saved: DashboardLayout;   // last persisted (server truth)
  draft: DashboardLayout;   // working copy while editing
  widgetData: Record<string, WidgetDataState>; // keyed by widget instance id
  dirty: boolean;
  remoteUpdate: boolean;    // background cache update arrived while dirty
  error: string | null;
};

type BuilderAction =
  | { type: "hydrated"; layout: DashboardLayout }
  | { type: "enterEdit" }
  | { type: "discard" }                                  // draft = saved, exit edit
  | { type: "moveWidget"; id: string; to: GridPos }      // arrange
  | { type: "resizeWidget"; id: string; size: GridSize } // resize (clamped to min/max from registry)
  | { type: "removeWidget"; id: string }
  | { type: "addWidget"; widget: DashboardWidget }            // dispatched by L02
  | { type: "configureWidget"; id: string; config: DashboardWidgetConfig } // L02
  | { type: "saveStart" }
  | { type: "saveOk"; layout: DashboardLayout }          // server echo becomes new `saved`
  | { type: "saveError"; message: string }
  | { type: "widgetDataLoaded"; states: Record<string, WidgetDataState> }
  | { type: "remoteUpdate"; layout: DashboardLayout };   // cacheBus while editing/clean

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "hydrated":
      // only adopt if not dirty (never clobber an in-progress draft)
      if (state.editing && state.dirty) return { ...state, saved: action.layout, remoteUpdate: true };
      return { ...state, status: "ready", saved: action.layout, draft: action.layout, dirty: false };
    case "enterEdit":
      return { ...state, editing: true, draft: state.saved, dirty: false, remoteUpdate: false };
    case "discard":
      return { ...state, editing: false, draft: state.saved, dirty: false, remoteUpdate: false };
    case "moveWidget":
    case "resizeWidget":
    case "removeWidget":
    case "addWidget":
    case "configureWidget":
      return { ...state, draft: applyDraftEdit(state.draft, action), dirty: true };
    case "saveStart":  return { ...state, status: "saving", error: null };
    case "saveOk":     return { ...state, status: "ready", editing: false, saved: action.layout, draft: action.layout, dirty: false, remoteUpdate: false };
    case "saveError":  return { ...state, status: "error", error: action.message };
    case "widgetDataLoaded":
      return { ...state, widgetData: action.states };
    case "remoteUpdate":
      return state.dirty
        ? { ...state, saved: action.layout, remoteUpdate: true }   // keep draft, warn
        : { ...state, saved: action.layout, draft: action.layout }; // safe to adopt
    default: return state;
  }
}

export function useDashboardBuilder(canWrite: boolean) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    status: "hydrating", editing: false,
    saved: EMPTY_LAYOUT, draft: EMPTY_LAYOUT,   // EMPTY_LAYOUT = DEFAULT_DASHBOARD_LAYOUT shape, 0 widgets
    widgetData: {},
    dirty: false, remoteUpdate: false, error: null,
  }));

  // HYDRATE once: cache-first, background revalidate. No mount-force loop.
  useEffect(() => {
    let active = true;
    getDashboardLayoutCached({ force: false }) // returns cached immediately when present, revalidates in bg
      .then(async (layout) => {
        if (!active) return;
        dispatch({ type: "hydrated", layout });
        const data = await getWidgetDataCached({ force: false, background: true });
        if (active) dispatch({ type: "widgetDataLoaded", states: toWidgetDataStates(data) });
      })
      .catch((err) => { if (active) dispatch({ type: "saveError", message: toMessage(err) }); });
    return () => { active = false; };
  }, []); // deps empty: single hydrate; revalidation comes via cacheBus below, not a re-fetch loop

  // SUBSCRIBE to cacheBus for cross-tab/background updates → remoteUpdate (dirty-guarded in reducer).
  // Real primitive: subscribeCacheEvents(handler) (core/admin/utils/cacheBus.ts); filter by key.
  useEffect(() => {
    const off = subscribeCacheEvents(async (event) => {
      if (event.key !== cacheKeys.dashboardLayout) return;
      const layout = await getDashboardLayoutCached({ force: false });
      dispatch({ type: "remoteUpdate", layout });
    });
    return off;
  }, []);

  const save = useCallback(async () => {
    if (!canWrite) return;
    dispatch({ type: "saveStart" });
    try {
      const echoed = await saveDashboardLayout(state.draft); // PUT via cached client; patches cache + broadcasts update
      dispatch({ type: "saveOk", layout: echoed });
    } catch (err) {
      dispatch({ type: "saveError", message: toMessage(err) });
    }
  }, [canWrite, state.draft]);

  return { state, dispatch, save };
}
```

> `applyDraftEdit` is a pure helper (own file or co-located): clamps `resizeWidget`
> to the widget's `minW/maxW/minH/maxH` from the UI registry, reflows positions on
> remove, and keeps every instance inside the 12-col grid. It NEVER mutates state.

### Grid + arrange/resize (pointer DnD with a keyboard-operable fallback)

```tsx
// core/admin/ui/dashboard/builder/WidgetGrid.tsx
// Read mode: plain responsive CSS grid of hosts.
// Edit mode: each cell wraps the host with a drag handle + resize handle + remove,
// PLUS keyboard controls so arrange/resize work without a pointer (a11y baseline).
export function WidgetGrid({ layout, dataStates, editing, onMove, onResize, onRemove, onConfigure }: WidgetGridProps) {
  return (
    <div
      role={editing ? "application" : undefined}
      aria-label={editing ? "Dashboard layout editor" : undefined}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12"
    >
      {layout.widgets.map((w) => (
        <div
          key={w.id}
          style={{ gridColumn: `span ${w.position.w}`, gridRow: `span ${w.position.h}` }}
          className={cn("relative", editing && "rounded-2xl outline-dashed outline-1 outline-border/60")}
        >
          {editing ? (
            <WidgetChrome
              widget={w}
              // a11y baseline: roving-tabindex toolbar, no pointer required
              onMoveKey={(dir) => onMove(w.id, nextPos(layout, w.id, dir))}   // Arrow keys / move buttons
              onResizeKey={(axis, delta) => onResize(w.id, stepSize(w, axis, delta))} // +/- buttons
              onRemove={() => onRemove(w.id)}
              onConfigure={() => onConfigure(w.id)}   // opens L02 floating panel
              // pointer enhancement: dnd handlers call the SAME onMove/onResize
              dragHandleProps={dndHandle(w.id)}
            />
          ) : null}
          <DashboardWidgetHost
            widget={w}
            state={dataStates[w.id] ?? { status: "loading" }}
            action={editing ? <WidgetActions widget={w} onRemove={onRemove} onConfigure={onConfigure} /> : undefined}
          />{/* TASK-480-04 */}
        </div>
      ))}
    </div>
  );
}
```

> **A11y rule:** pointer DnD (e.g. `@dnd-kit` or native HTML5 DnD) is an
> enhancement only — every arrange/resize/remove action MUST be reachable by
> keyboard (move buttons + arrow keys, size steppers, a focusable remove button
> with `aria-label`), with `aria-grabbed`/live-region announcements during a move.
> Drag handle = `GripHorizontal` (matches the floating-panel pattern). Honor
> `prefers-reduced-motion`.

### Page integration

```tsx
// core/admin/ui/dashboard/DashboardPage.tsx (replace the fixed-card body with the builder)
export function DashboardPage() {
  const can = useAdminCan();                               // real shell permission accessor (AdminAuthContext)
  const canWrite = can("dashboard:write");
  const { state, dispatch, save } = useDashboardBuilder(canWrite);

  return (
    <AdminShell activeHref="/admin">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Dashboard"
          description="Your workspace at a glance."
          actions={
            <DashboardEditBar
              canWrite={canWrite}
              editing={state.editing}
              dirty={state.dirty}
              saving={state.status === "saving"}
              onEdit={() => dispatch({ type: "enterEdit" })}
              onDiscard={() => dispatch({ type: "discard" })}
              onSave={() => void save()}
              onAddWidget={() => dispatch({ /* opens L02 catalog */ })}
            />
          }
        />
        {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
        {state.remoteUpdate ? <RemoteUpdateHint onApply={() => dispatch({ type: "discard" })} /> : null}
        {state.status === "hydrating" ? <DashboardSkeleton /> : (
          <WidgetGrid
            layout={state.editing ? state.draft : state.saved}
            dataStates={state.widgetData}
            editing={state.editing}
            onMove={(id, to) => dispatch({ type: "moveWidget", id, to })}
            onResize={(id, size) => dispatch({ type: "resizeWidget", id, size })}
            onRemove={(id) => dispatch({ type: "removeWidget", id })}
            onConfigure={(id) => {/* L02 */}}
          />
        )}
      </div>
    </AdminShell>
  );
}
```

**Data flow:** mount → `getDashboardLayoutCached({force:false})` (cache-first,
bg revalidate) + `getWidgetDataCached({force:false, background:true})` →
`hydrated` + `widgetDataLoaded` → render hosts with explicit `WidgetDataState`.
Edit → `enterEdit` clones `saved` into `draft`. Each arrange/resize/remove →
pure `applyDraftEdit` → `dirty=true`.
Save → `saveDashboardLayout(draft)` (PUT; client patches `dashboard:layout` cache
+ broadcasts `update`) → `saveOk` adopts the server echo as new `saved`. CacheBus
events → `remoteUpdate` (adopted only when clean; otherwise kept as a hint).

**Error handling:** hydrate/save failures set `error` and render the `Alert`; the
last good `saved` layout stays visible (never blank the dashboard). A `PUT`
rejection (validation/permission) surfaces the mapped client error message; the
draft is preserved so the user can retry. Dirty-navigation away from the page
registers the shared admin dirty-navigation guard while `state.dirty`.

**Regression-test shape (delivered in L03):**

- Read mode renders saved widgets via `DashboardWidgetHost`; no edit chrome.
- Edit toggle → reorder/resize/remove mutate the draft and set dirty.
- Save calls the mocked client once, adopts the echo, clears dirty, exits edit.
- Background cacheBus update while dirty does NOT overwrite the draft (hint shown).
- No `dashboard:write` → no Edit/Save controls; grid is read-only.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-builder.test.tsx`
  (suite authored in L03; this leaf must keep it green for grid/edit/save flows)
- Keep `tests/vitest/ui/dashboard.test.tsx` green (shell host).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — Builder edit-mode lifecycle (Edit/Discard/Save),
  arrange/resize model + a11y fallback, dirty/remote-update semantics.
- `_docs/ADMIN_CACHE.md` — Dashboard builder consumer policy: hydrate-from-cache,
  background revalidate via cacheBus, dirty-guarded adoption, save patches cache.
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-05-L01`.
