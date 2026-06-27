# TASK-479-27-L03: Audit Logs Restyle
# FileName: TASK-479-27-L03-Audit-Logs-Restyle.md

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

Restyle the real Audit Logs screen to match the prototype: a soft `SectionCard`
holding an **avatar timeline list** (actor / action / target / category badge /
ip / relative time) with a connecting rail, a restyled **FilterBar** (category +
date-range selects), and the existing **Export** action. Bind every row to REAL
audit records; preserve cursor pagination, the export contract, the details
drawer, and the truthful-count copy.

- **Goal:** A calm, scannable audit timeline with category-tone badges and a
  violet target highlight — without changing audit data, classification, export,
  or pagination semantics.
- **Owning module/service:** `core/admin/ui/audit/AuditList.tsx` (+
  `AuditTable.tsx`, `AuditFilters.tsx`, `AuditDetailsDrawer.tsx`), reusing
  `core/admin/ui/shared/{PageHeader,ExportDialog}.tsx` and the TASK-479-06-L02
  pattern library (`SectionCard`, `FilterBar`, `Pagination`) plus
  `core/admin/components/ui/{avatar,badge,button,select}.tsx`.
- **Source-of-truth docs:** `_docs/AUDIT_SPEC.md`, `_docs/DESIGN_TOKENS.md`.
  **Ports from:** `_docs/_PROTOTYPE/src/pages/admin/AuditLogsPage.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/{SectionCard,FilterBar,Pagination}.tsx`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `auditClient` (`listAuditLogs`,
  `exportAuditLogs`, `AuditLogQuery`), the export contract
  (`auditExportContract`, `auditExportColumnLabels`), the classification helpers
  (`resolveAuditCategory`, `resolveAuditSeverity`), the cursor pagination
  (`AuditCursor`/`AuditPageState`), `resolveTruthfulCountCopy`, the
  `copyAuditEntryJson` action, or the details drawer logic. No new endpoints. The
  prototype's hard-coded `EVENTS` + `pick(RELATIVE_TIMES)` are illustrative — bind
  to real records and render real timestamps; never fabricate events or counts.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listAuditLogs`; export stays
on `exportAuditLogs` through the existing `ExportDialog` + `auditExportContract`
(admin CSRF). IP/actor/target render exactly as today; no new fields enter client
cache, logs, or debug payloads, and no PII beyond what the audit record already
exposes is surfaced.

---

## Implementation Pseudocode

Concrete shapes — port the prototype's timeline but bind it to REAL records in
`AuditList.tsx` (`items: AuditLog[]`, `query: AuditLogQuery`, `pageState`,
`isLoading`, `error`, export handlers). **Keep all existing hooks, the cursor
pagination, the filters, the export flow, and the details drawer untouched**;
only the list rendering + chrome change. Decide whether the timeline replaces or
augments `AuditTable.tsx` — prefer a restyled list view that REUSES the same row
data + row-click → `AuditDetailsDrawer`.

### 1) Header + export + filters (`AuditList.tsx` — JSX)

```tsx
// PORT layout from prototype pages/admin/AuditLogsPage.tsx:
//   PageHeader(Export action) -> FilterBar(category + date-range) -> SectionCard(timeline) -> Pagination.
<PageHeader title="Audit logs"
  actions={<Button variant="outline" onClick={openExport} className="gap-1.5"><Download className="size-4" /> Export</Button>} />

// AuditFilters.tsx -> restyle to the prototype FilterBar look (search + Selects in
// rounded-xl pills). KEEP controlled props bound to the REAL AuditLogQuery
// (category, dateRange, status, severity, search) + onChange — do NOT add filters
// the query does not support.
```

### 2) Timeline list (REAL records → prototype rail)

```tsx
// Render real `items`; the connector rail + avatar + category badge port the
// prototype. Category tone maps from the REAL resolveAuditCategory(record), NOT a
// local CATEGORY map. Relative time uses the REAL record timestamp formatter
// already in this module (do not use prototype `pick(RELATIVE_TIMES)`).
<SectionCard title="Activity" description="Most recent events first">
  <div className="relative">
    {items.map((entry, index) => (
      <button key={entry.id} type="button" onClick={() => openDetails(entry)}
        className="relative flex w-full items-start gap-4 pb-6 text-left last:pb-0">
        {index < items.length - 1
          ? <span className="absolute bottom-1 left-[13px] top-9 w-px bg-border" aria-hidden /> : null}
        <Avatar name={entry.actorName ?? entry.actorId} size="sm" className="relative z-10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-sm font-medium text-foreground">{entry.actorName ?? entry.actorId}</span>
            <span className="text-sm text-muted-foreground">{entry.action}</span>
            <span className="text-sm font-medium text-primary">{entry.targetLabel}</span>
            <Badge variant={categoryVariant(resolveAuditCategory(entry))}>{resolveAuditCategory(entry)}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
            <span className="font-mono">{entry.ip}</span><span>·</span><span>{formatTime(entry.createdAt)}</span>
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-xs sm:flex">
          <span className="font-mono text-muted-foreground">{entry.ip}</span>
          <span className="text-muted-foreground">{formatTime(entry.createdAt)}</span>
        </div>
      </button>
    ))}
  </div>
</SectionCard>
// categoryVariant() maps AuditCategory -> Badge variant (created=success,
// updated=info, deleted=destructive, login/auth=secondary). Confirm real field
// names (actorName/targetLabel/ip/createdAt) against AuditLog/AuditRecord; use the
// real fields, do not invent.
```

### 3) Pagination (preserve cursor semantics)

```tsx
// Restyle to the prototype Pagination look but DRIVE the existing cursor state
// (pageState.cursor / previousCursors). Keep resolveTruthfulCountCopy for the
// total/label — never show a fabricated exact total when the API returns a
// cursor-bounded/approximate count.
<Pagination ... onNext={goNextCursor} onPrev={goPrevCursor} total={truthfulCount} />
```

**Data flow:** unchanged. `listAuditLogs(query)` → `items` + `nextCursor` →
timeline; FilterBar mutates `query` → reload; Export opens `ExportDialog` →
`exportAuditLogs`; row click → `AuditDetailsDrawer`. Category tone + relative time
are render-time derivations of each real record (no new fetch, no
setState-in-effect).

**Error handling:** unchanged — keep the existing error surface, the loading/empty
states, and the truthful-count copy. Keep `copyAuditEntryJson` available from the
details drawer. The restyle must not swallow or relocate any error surface.

**React-hooks / cache rules to honor (call out in PR):** category/time derivations
are pure render-time (no sync setState in effects); cursor pagination state machine
is untouched; no mount-force refetch added.

**Regression-test shape (delivered in L05):** timeline renders one row per real
record with actor/action/target/category badge/ip/time; category tone derives from
`resolveAuditCategory`; row click opens the details drawer; Export opens the
existing dialog; pagination drives cursor state with truthful-count copy.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/audit-list.test.tsx tests/vitest/ui/audit-list-wave.test.tsx tests/vitest/ui/audit-table-wave.test.tsx tests/vitest/ui/audit-details.test.tsx tests/vitest/ui/audit-entry-actions.test.ts`
- The new restyle suite from L05 (`tests/vitest/ui-integration/admin-screens-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/audit`; confirm filtering, the timeline,
  category badges, cursor pagination, the details drawer, and Export all behave as
  before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-27-L03`.
- `_docs/AUDIT_SPEC.md` — only if a user-visible label changes (e.g. timeline copy
  or category labels); document no behavior change.
