# Dashboard Widgets Spec (TASK-480)

Admin Dashboard widgets are configurable admin panels for `/admin`. They are not
Page Builder widgets, not public runtime widgets, and do not use `core/widgets/*`.

## Layout Contract

`DashboardLayout` v1:

- `version: 1`
- `widgets: DashboardWidget[]`
- max widgets: `24`

`DashboardWidget`:

- `id`
- `type`
- optional `title`
- `config.kind` matching `type`
- `position: { x, y, w, h }` on a 12-column admin grid

Writes reject unknown fields and over-limit widgets. Stored legacy/corrupt rows
fall back to the default layout on read.

## Widget Types

Canonical types:

- `totals-counters`
- `content-type-counts`
- `content-over-time`
- `recent-activity`
- `storage-usage`
- `site-health`
- `security-summary`
- `quick-actions`
- `content-query`

Traffic KPIs use existing TASK-483 analytics aggregates:

- `totals-counters.config.source: "cms" | "traffic"`
- `content-over-time.config.source: "content" | "traffic"`

No dashboard widget fabricates traffic data. Missing analytics resolves to empty
or unavailable widget data.

## Admin UX

The dashboard builder lives on canonical `/admin`. Users with `dashboard:write`
can enter edit mode, add widgets from the catalog, configure the selected widget
in a non-modal side panel, and save or reset the per-user layout. Panels can be
rearranged and resized two ways: **pointer drag-and-drop** (drag the grip to
reorder, drag the corner handle to resize) and a **keyboard-operable toolbar** of
icon controls (move/wider/narrower/taller/shorter) so every action is reachable
without a pointer. Read-only users with `content:read` see the resolved dashboard
data without the customize controls.

## Builder Architecture

The admin builder ships as flat modules under `core/admin/ui/dashboard/`:

- `DashboardBuilder.tsx` — the builder shell: inline `useReducer` state
  (`layout`/`savedLayout`/`data`/`editMode`/`dirty`/`selectedId`/`remoteStale`/…),
  hydrate-then-revalidate load, the responsive 12-column grid, the inline
  add-widget catalog, the native-pointer drag/resize wiring, and the inline
  non-modal `ConfigPanel`. No mount-force refetch loop; a background cache update
  arriving while the draft is dirty raises a "changed elsewhere" hint instead of
  clobbering the draft.
- `dashboardLayoutArrange.ts` — pure `moveWidget`/`resizeWidget`/
  `sortWidgetsByPosition` helpers shared by pointer DnD and the toolbar nudges;
  geometry is clamped to the server contract (`x∈[0,11]`, `w≤12-x`, `h≤12`) so a
  dragged draft round-trips through `normalizeDashboardLayout` unchanged.
- `widgetRegistry.ts` — the exhaustive typed renderer registry
  `DASHBOARD_WIDGET_RENDERERS` (`{ [T in DashboardWidgetType]: WidgetRenderer<T> }`,
  omitting a type is a compile error), the `DASHBOARD_WIDGET_CATALOG` metadata
  (`label`/`description`/`icon`/`defaultConfig`/`defaultLayout`/`configFields`),
  and `isWidgetDataEmpty`.
- `widgetRenderers.tsx` — the 9 per-type renderer components + `UnavailableWidget`.
- `DashboardWidgetHost.tsx` — dispatches through the registry and owns the edit
  chrome (toolbar + drag grip + resize handle).
- `WidgetConfigForm.tsx` — the schema-driven control renderer that turns a
  widget type's `configFields` descriptors into controls and writes every change
  back through `normalizeDashboardWidgetConfig` (reject-unknown preserved).

## API and Security

Endpoints:

- `GET /admin/api/dashboard` legacy aggregate read
- `GET /admin/api/dashboard/layout`
- `PUT /admin/api/dashboard/layout`
- `POST /admin/api/dashboard/layout/reset`
- `GET /admin/api/dashboard/widget-data`
- `POST /admin/api/dashboard/widget-data`

Security:

- Internal admin only, session auth.
- Reads require `content:read`.
- Save/reset require `dashboard:write`.
- `PUT`/`POST` require CSRF.
- Rate limits use shared `admin_read`/`admin_write` buckets.
- No nonce/HMAC/reCAPTCHA; there is no public write endpoint.

## Cache

Saved layout and saved widget-data reads use:

- `dashboard:layout`
- `dashboard:widgetData`

Save/reset update layout cache and invalidate widget-data cache through
`cacheBus`. Draft preview batches (`POST /dashboard/widget-data`) are never
stored in localStorage.
