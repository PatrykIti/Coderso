# TASK-479-27-L04: Access Logs Restyle
# FileName: TASK-479-27-L04-Access-Logs-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-27
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Access Logs screen to match the prototype: a **stat row**
(requests / blocked / unique IPs / failed logins), a restyled **FilterBar**, and
a soft `rounded-2xl` **DataTable** with time / ip / location / method+path /
status columns (method + status tone badges). Bind every visual to REAL access-log
records; preserve filtering, cursor pagination, the export contract, the
revoke-access action, the details drawer, and `adminPaths` navigation.

- **Goal:** A monitoring-grade, violet-accented Access Logs table with method and
  status-code tone badges and a real derived stat row — without changing data,
  the revoke action, export, or navigation helpers.
- **Owning module/service:** `core/admin/ui/security/AccessLogsPage.tsx` (+
  `AccessLogsTable.tsx`, `AccessLogDetailsDrawer.tsx`), reusing
  `core/admin/ui/shared/{PageHeader,ExportDialog,ConfirmActionDialog}.tsx`, the
  TASK-479-06-L02 pattern library (`StatCard`, `DataTable`, `FilterBar`,
  `Pagination`) and `core/admin/components/ui/{badge,button,select}.tsx`.
- **Source-of-truth docs:** `_docs/AUDIT_SPEC.md` (access-log surface),
  `_docs/RBAC_SPEC.md`, `_docs/DESIGN_TOKENS.md`. **Ports from:**
  `_docs/_PROTOTYPE/src/pages/admin/AccessLogsPage.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/{StatCard,DataTable,FilterBar,Pagination}.tsx`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `accessLogsClient` (`listAccessLogs`,
  `exportAccessLogs`, `revokeAccessFromLog`, `AccessLogQuery`), the export
  contract, the cursor pagination, `resolveTruthfulCountCopy`, the
  `resolveAdminBasePath`/`resolveAdminHref` navigation, `useOptionalAdminRouter`,
  or the details-drawer/revoke confirm logic. No new endpoints. The prototype's
  hard-coded `ROWS` + fabricated stat deltas/sparks are illustrative — derive the
  stat row from REAL data (or omit a stat when no real source exists); never ship
  invented totals.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listAccessLogs`; export stays
on `exportAccessLogs`; the revoke action stays on `revokeAccessFromLog` behind its
existing `ConfirmActionDialog` + RBAC + admin CSRF. IP/location/agent render
exactly as today; navigation stays on `resolveAdminHref`/`AdminLink` (never a
hand-built href); no new fields enter client cache, logs, or debug payloads.

---

## Implementation Pseudocode

Concrete shapes — port the prototype's stat row + table but bind it to REAL data
in `AccessLogsPage.tsx` (`items: AccessLogRecord[]`, `query: AccessLogQuery`,
`pageState`, `isLoading`, `error`, export/revoke handlers, the details drawer
state). **Keep all existing hooks, filters, cursor pagination, export, revoke, and
the `useOptionalAdminRouter` wiring untouched**; only the stat row, FilterBar, and
table visuals change.

### 1) Header + stat row (derived from REAL data — never fabricated)

```tsx
// PORT layout from prototype pages/admin/AccessLogsPage.tsx:
//   PageHeader -> StatCard row -> FilterBar -> DataTable -> Pagination.
// Derive stats ONLY from real data. The list is cursor-paged, so a precise
// "24h requests" total may not be available client-side. PREFER a real summary
// field if the API returns one; otherwise OMIT the stat or label it from
// resolveTruthfulCountCopy. NEVER fabricate "38,420 / +6.2%".
const stats = useMemo(() => ({
  blocked:   items.filter((r) => r.status === 401 || r.status === 403).length,
  failed:    items.filter((r) => r.path.includes("login") && r.status >= 400).length,
  uniqueIps: new Set(items.map((r) => r.ip)).size,
}), [items]);
<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {summary?.requests24h != null ? <StatCard label="Requests · 24h" value={fmt(summary.requests24h)} icon={<Activity />} /> : null}
  <StatCard label="Blocked (page)"      value={String(stats.blocked)}   icon={<ShieldAlert />} />
  <StatCard label="Unique IPs (page)"   value={String(stats.uniqueIps)} icon={<Globe />} />
  <StatCard label="Failed logins (page)" value={String(stats.failed)}   icon={<KeyRound />} />
</div>
// Label page-scoped stats honestly ("(page)") when they are not a real 24h
// aggregate. No spark/delta unless a real trend source exists.
```

### 2) DataTable columns (time / ip / location / request / status)

```tsx
// Restyle AccessLogsTable.tsx (or render via the shared DataTable) using REAL
// AccessLogRecord fields. Method + status tone badges port the prototype helpers:
const methodVariant = (m: string) => m === "GET" ? "info" : m === "POST" ? "soft" : m === "DELETE" ? "destructive" : "warning";
const statusTone   = (c: number) => c < 300 ? "text-success" : c < 400 ? "text-info" : c < 500 ? "text-warning" : "text-destructive";
const columns: Column<AccessLogRecord>[] = [
  { key: "time",     header: "Time",     render: (r) => <span className="text-sm text-muted-foreground">{formatTime(r.createdAt)}</span> },
  { key: "ip",       header: "IP",       render: (r) => <span className="font-mono text-sm">{r.ip}</span> },
  { key: "location", header: "Location", render: (r) => <span className="text-sm">{r.location ?? "Unknown"}</span> },
  { key: "request",  header: "Request",  render: (r) => (
      <span className="flex items-center gap-2">
        <Badge variant={methodVariant(r.method)} className="font-mono">{r.method}</Badge>
        <span className="font-mono text-sm text-muted-foreground">{r.path}</span>
      </span>) },
  { key: "status",   header: "Status", align: "right", render: (r) =>
      <span className={`font-mono text-sm font-semibold tabular-nums ${statusTone(r.status)}`}>{r.status}</span> },
];
// Row click keeps the existing AccessLogDetailsDrawer open behavior; the revoke
// action inside the drawer stays on revokeAccessFromLog + ConfirmActionDialog.
// Confirm real field names (createdAt/location/method/path/status/ip) against
// AccessLogRecord; use the real fields, do not invent.
```

### 3) FilterBar + pagination (preserve)

```tsx
// Restyle the filter controls to the prototype FilterBar look (search + Selects in
// rounded-xl pills). KEEP controlled props bound to the REAL AccessLogQuery and the
// existing advanced-filter Sheet. Pagination ports the prototype look but DRIVES the
// existing cursor state + resolveTruthfulCountCopy total.
```

**Data flow:** unchanged. `listAccessLogs(query)` → `items` + `nextCursor` →
table; FilterBar mutates `query` → reload; stat row + method/status tone are
render-time derivations of `items` (no new fetch, no setState-in-effect); revoke
stays behind the confirm dialog; navigation stays on `resolveAdminHref`.

**Error handling:** unchanged — keep the existing error surface, loading/empty
states, the revoke confirm, and the truthful-count copy. The restyle must not
swallow or relocate any error surface.

**React-hooks / cache rules to honor (call out in PR):** stat + tone derivations
are pure render-time / `useMemo` (no sync setState in effects); cursor pagination
state machine is untouched; no mount-force refetch added; nav stays on
`resolveAdminHref`/`AdminLink` — do not hand-build any href.

**Regression-test shape (delivered in L05):** table renders one row per real record
with time/ip/location/method+path/status and method+status tone badges; stat row
reflects derived page-scoped counts (no fabricated 24h totals); row click opens the
details drawer; revoke stays behind confirm; pagination drives cursor state.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/access-logs.test.tsx tests/vitest/ui/access-logs-table.test.tsx tests/vitest/admin/accessLogsClient.test.ts`
- The new restyle suite from L05 (`tests/vitest/ui-integration/admin-screens-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/security/access-logs`; confirm filtering,
  the stat row, table rows, method/status badges, cursor pagination, the details
  drawer, revoke, and Export all behave as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-27-L04`.
- `_docs/AUDIT_SPEC.md` / `_docs/RBAC_SPEC.md` — only if a user-visible label
  changes; document no behavior change.
