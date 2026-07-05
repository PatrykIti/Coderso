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
in a non-modal side panel, move/resize panels with icon controls, and save or
reset the per-user layout. Read-only users with `content:read` see the resolved
dashboard data without the customize controls.

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
