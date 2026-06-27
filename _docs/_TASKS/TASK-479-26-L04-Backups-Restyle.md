# TASK-479-26-L04: Backups Restyle
# FileName: TASK-479-26-L04-Backups-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Backups screen to the prototype: a `PageHeader` (Database icon +
"Create backup" action), a **schedule card** (enable Switch + Frequency/Retention
Selects — all from the real `BackupSchedule`) beside a **status card** showing real
fields (backups-stored count + storage driver + worker health), and a soft `rounded-2xl`
backups `DataTable` with date/size/type/status + **Restore / Download / Delete** row
actions. All backup data loading, the create/restore/download/delete flows, the schedule
save, and the cache contract stay byte-for-byte the same. The prototype's
**storage-usage quota** (used/total GB + %) and the **next-run** line have NO backing
(`BackupSchedule` has no `nextRunAt`; `backupsClient` exposes no usage/quota) and are
dropped/flagged feature-incomplete.

- **Goal:** `core/admin/ui/backups/BackupsPage.tsx` (+ `BackupScheduleCard.tsx`,
  `BackupsTable.tsx`, `BackupNowDialog.tsx`) looks like
  `_docs/_PROTOTYPE/src/pages/tools/BackupsPage.tsx` while preserving the existing
  backup logic and the `cacheKeys.backupSchedule` + `backups:list:*` contract.
- **Owning module/service:** `core/admin/ui/backups/BackupsPage.tsx`,
  `core/admin/ui/backups/BackupScheduleCard.tsx`,
  `core/admin/ui/backups/BackupsTable.tsx`, `core/admin/ui/backups/BackupNowDialog.tsx`.
  `PageHeader`, `SectionCard`, `DataTable`, and `StatusBadge` (whose mapping must cover
  the real `BackupStatus` enum `queued`/`running`/`complete`/`failed`) are
  **created/ported by TASK-479-06-L02**; `Switch`/`Select`/`Button` are the 06-L01
  `@/components/ui/*` restyles.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/BackupsPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard,DataTable,StatusBadge}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{switch,select,progress,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `backupsClient` (`getCachedBackups`,
  `getCachedBackupSchedule`, `listBackupsCached`, `getBackupScheduleCached`, the
  create/restore/download/delete + schedule-save calls), to `cacheKeys.backupSchedule`
  or the `backups:list:*` keys, to `subscribeCacheEvents` background revalidation, to
  the `ConfirmActionDialog` destructive flow, to the `BackupNowDialog`, or to RBAC.
  `backupsClient` exposes NO storage-usage/quota and `BackupSchedule` has NO `nextRunAt`,
  so the prototype's "6.2 GB of 20 GB" quota gauge and next-run line are dropped/flagged
  feature-incomplete (need new backend fields), not fabricated; the status card derives
  only from real fields (`BackupListResult.total`, `schedule.storageDriver`, `worker`).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `BackupsPage.tsx` (the lazy-init
`useState(() => ({getCachedBackups({page:1,limit}), getCachedBackupSchedule()}))`, the
list/schedule hydrate effects, the `subscribeCacheEvents(cacheKeys.backupSchedule ||
"backups:list:*")` background revalidation, the page-change handlers that re-read
`getCachedBackups({page,limit,query})`, and the create/restore/delete dialog state).

```tsx
// BackupsPage.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader (icon + action) — keep the "Create backup" Button wired to the existing
//    BackupNowDialog open handler.
<PageHeader title="Backups"
  description="Keep automatic snapshots of your content and restore in one click."
  icon={<Database />}
  actions={<Button className="gap-1.5" onClick={openCreate}><Plus className="size-4" /> Create backup</Button>} />

// 2) Schedule + status grid (grid-cols-1 lg:grid-cols-3 gap-4):
//    - BackupScheduleCard.tsx → shared SectionCard "Automatic backups" (lg:col-span-2),
//        bound to the real `BackupSchedule` ({ enabled, frequency, retentionDays,
//        storageDriver }):
//          enable Switch (checked = schedule.enabled, onCheckedChange = existing save),
//          Frequency Select (daily|weekly|monthly) + Retention control (the real
//          `retentionDays` number) — value/onValueChange = the existing
//          `updateBackupSchedule` handlers.
//        DROP the "Next backup scheduled for …" line: there is no `nextRunAt` on
//        `BackupSchedule` (flag feature-incomplete; do NOT compute a fake next run).
//        Keep every existing onChange/save call — only the layout/classes change.
//    - Status card → shared SectionCard from REAL fields only: backups-stored count
//        (`BackupListResult.total`), storage driver (`schedule.storageDriver`:
//        local|s3|azure), and worker health (`BackupListResult.worker`:
//        healthy/queuedCount/message). DROP the prototype's used/total-GB figure + the
//        <Progress> quota bar — `backupsClient` has no storage-usage data; flag the quota
//        gauge feature-incomplete (needs a backend usage/quota field).

// 3) BackupsTable.tsx — restyle wrapper to the prototype DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card") with columns over the
//    EXISTING `BackupItem` rows (real fields only):
//      - Backup: rounded-xl Calendar tile + `createdAt` ("<date> · <time>").
//      - Size: muted tabular-nums from `sizeBytes` (em-dash when null).
//      - Type: from the real `kind` — <Badge variant="secondary">Scheduled</Badge> |
//        <Badge variant="soft">Manual</Badge> (the enum is `manual` | `scheduled`, NOT
//        "Auto").
//      - Status: shared <StatusBadge status={row.status} /> over the real `BackupStatus`
//        enum `queued` | `running` | `complete` | `failed` (note: `complete`, NOT
//        "completed").
//      - Actions (right): keep the EXISTING handlers —
//          <Button variant="ghost" size="sm" onClick={onRestore}><RotateCcw/> Restore>,
//          <Button variant="ghost" size="icon-sm" onClick={onDownload} aria-label="Download backup">,
//          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete backup"
//                  className="…hover:text-destructive">.
//        Restore/Delete still route through the existing ConfirmActionDialog; Download
//        keeps its existing download call.
```

**Data flow:** `getCachedBackups({page:1,limit})` / `getCachedBackupSchedule()` lazy
init → `listBackupsCached` / `getBackupScheduleCached` hydrate +
`subscribeCacheEvents` background revalidation → schedule card + status card + table
rows; create/restore/delete go through the existing dialogs + client calls →
`refresh({background:true})`. The restyle changes none of these edges.

**Navigation/href constraint (preserve):** Backups actions are in-page dialogs +
download calls (no admin route hrefs to build). Keep `activeHref="/admin/backups"` and
the AdminShell breadcrumbs `["Admin","Backups"]` exactly. Do NOT hand-build any URL.

**Error handling:** Keep the destructive `Alert` (backups API error) with its existing
condition; restyle the card only. The restore/delete `ConfirmActionDialog` and the
`BackupNowDialog` keep their copy + conditions. Keep the loading + empty states (restyle
to the soft dashed `EmptyState` card). The failed-backup row keeps its `StatusBadge`
"failed". No new error surfaces.

**React-hooks/cache rules:** The status-card count + worker health derive at render from
the real list/schedule/worker data — no effect, no synchronous `setState` in an effect,
no fabricated GB figures. Do not add a mount effect that force-refetches; the existing hydrate effects +
cacheBus subscription are the only data effects (no dirty-state overwrite, no refetch
loop). The schedule Switch/Selects keep their existing save handlers (no optimistic
overwrite that drops a pending save).

**Regression-test shape:** see L07 — render `BackupsPage` with a seeded
`getCachedBackups` + `getCachedBackupSchedule`; assert: header + "Create backup" opens
`BackupNowDialog`, the schedule card renders the Switch + Frequency/Retention controls
from seeded `BackupSchedule` data (NO next-run line), the status card renders the seeded
backups-stored count + storage driver + worker health (NO used/total quota Progress), the
table renders date/size/type(kind)/status rows (status `complete`/`failed`/…),
Restore/Download/Delete buttons are present and wired (Delete opens
`ConfirmActionDialog`), and the wrapper carries the rounded-2xl/card classes.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-backups-restyle.test.tsx`
  (new suite in L07)
- Re-run the existing backups suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx tests/vitest/admin/backupsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L04`.
- If the shared `SectionCard`/`StatusBadge`/`Progress` mapping is introduced/changed for
  Backups, note it alongside the TASK-479-06 shell notes so the other Tools screens reuse it.
