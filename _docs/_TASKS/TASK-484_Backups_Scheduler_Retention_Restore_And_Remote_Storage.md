# TASK-484: Backups — Scheduler, Retention, Restore & Remote Storage
# FileName: TASK-484_Backups_Scheduler_Retention_Restore_And_Remote_Storage.md

**Priority:** High
**Category:** Tools / Backups
**Estimated Effort:** Large
**Dependencies:** None hard. Builds on the shipped backups v1 surface
(`core/services/backups/backupService.ts`, `core/server/routes/backupRoutes.ts`,
`backups` + `backup_schedules` tables). The TASK-479 admin reskin only restyles
the existing Backups screen; this task adds the missing **behaviour** behind it.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Business Goal

Backups currently look complete in the admin UI but are **non-functional past a
manual one-off**. A code-grounded discovery pass confirmed five gaps in
`core/services/backups/backupService.ts`:

1. **The schedule never runs.** `backup_schedules` stores `enabled` / `frequency`
   / `retentionDays`, but the repo has **no scheduler or cron** — only the
   in-process webhook queue (`core/server/jobs/webhooksDelivery.ts`). A
   "scheduled daily" backup is configured and then silently never executes.
2. **Retention is dead.** `retentionDays` (default 30) is persisted and validated
   (`assertRetentionDays`, lines 144-148) but **nothing ever prunes** old
   backups, so artifacts and rows accumulate forever.
3. **Restore is a hard stub.** `restoreBackup()` (lines 366-373) validates the
   row then unconditionally `throw new Error("backup_restore_unsupported")`.
   There is no way to actually restore a backup.
4. **Remote storage is ignored.** `createBackupArtifact()` (lines 239-269)
   **always** `writeFile`s to the local FS under `BACKUP_DIR` /
   `storage/backups`, even when `storageDriver` is `s3` / `azure`.
5. **No storage usage/quota.** `size_bytes` is stored per row but there is no
   aggregate usage source or quota signal, so an operator cannot see how much
   space backups consume.

This task makes the backup feature real: a **scheduler/worker** that runs due
backups and advances `next_run_at`; **retention pruning**; a **transactional
restore** from the JSON artifact; **remote artifact storage** that honours
`storageDriver`; and a **storage usage/quota** source surfaced to admin.

---

## Scope

### In scope

- New `next_run_at` + `last_run_at` columns on `backup_schedules`, and an
  `artifact_key` column on `backups` (for robust remote-artifact deletion) — with
  **full Drizzle migration artifacts** (SQL + `meta/<idx>_snapshot.json` +
  `meta/_journal.json`).
- An in-process **backup scheduler job** (`core/server/jobs/backupScheduler.ts`)
  modelled on `webhooksDelivery.ts`, started from the shared server bootstrap
  seam `startHttpServer()` in `core/server/httpServer.ts` (which both
  `core/server/dev.ts` and `core/server/prod.ts` call — `dockerStart.ts` is the
  Docker-only entry and just imports `./prod`, so anchoring there would leave
  the scheduler dead in local dev and non-docker deployments), single-flight
  guarded (in-process flag + Postgres advisory lock, mirroring
  `runStartupMigrations`), and gated behind an env flag so multiple dev
  instances sharing the remote test DB do not all tick.
- A pure `computeNextRunAt(frequency, from)` calculator and a
  `markScheduleRun()` service helper that persists `last_run_at` + the recomputed
  `next_run_at`.
- **Retention pruning** (`pruneExpiredBackups(retentionDays)`) invoked after each
  scheduled run and via an internal `POST /backups/prune` trigger.
- **Restore** (`restoreBackup(id, { confirm })`) — reads the JSON artifact
  (local file or remote URL), strict-parses it, and restores transactionally
  (settings via the existing `importConfig`, snapshot tables via guarded
  delete+insert). Removes `backup_restore_unsupported`.
- **Remote artifact storage** — `createBackupArtifact` branches on
  `storageDriver`, reusing the existing media storage adapters
  (`core/services/media/storage/*`) to upload to s3/azure and store the public
  URL + storage key; `deleteBackup` extended to remove remote objects.
- **Storage usage/quota** source (`getBackupStorageUsage()`) surfaced via
  `GET /backups/usage`, with an optional total-bytes quota signal.

### Out of scope

- Backing up the **actual media file bytes** — the artifact intentionally stores
  the media library metadata + URLs only (see the note in `createBackupArtifact`,
  lines 256-260); a media-bytes archive is a separate task.
- Multi-region / cross-account backup replication, point-in-time WAL backups, or
  external backup vendors.
- Admin UI changes beyond surfacing the new `next_run_at` / usage data — the
  existing `core/admin/ui/backups/*` screen (already reskinned under TASK-479)
  consumes the new fields; no new builder UI is added here.
- Changing the artifact schema version/format beyond additive validation
  (artifact stays `version: 1`).

### What TASK-479 reskin already covers vs what this task adds

TASK-479 only **restyles** the existing Backups screen (`BackupsPage.tsx`,
`BackupScheduleCard.tsx`, `BackupsTable.tsx`, `BackupNowDialog.tsx`) to the new
admin token language and renders today's fields. It adds **no** scheduling,
retention, restore, remote-storage, or usage behaviour. TASK-484 is the
**feature counterpart** that makes the schedule actually execute, prunes by
retention, implements restore, honours `storageDriver`, and adds a usage source.

---

## Parallel-Stream Coordination (pinned facts — binding for every subtask/leaf)

TASK-484 runs concurrently with **TASK-482** (setup wizard, worktree
`/home/coder/project/Coderso-task-482`) and **TASK-483** (analytics, worktree
`/home/coder/project/Coderso-task-483`) on sibling branches; this task lives in
`/home/coder/project/Coderso-task-484` (branch `feature/task-484`).

- **Pinned migration index: `0065` — NOT `0064`.** The current max migration in
  this worktree is `0063_yummy_glorian.sql`, but TASK-483 OWNS `0064`
  (analytics tables) and merges FIRST. **Sync precondition (TASK-484-01):**
  before 484-01 authors its migration and runs `db:migrate`, the orchestrator
  syncs TASK-483's `0064` artifacts (SQL + `meta/0064_snapshot.json` +
  `meta/_journal.json` entry) into this worktree so the journal stays gapless.
  TASK-484's own artifacts are `0065_*.sql` + `meta/0065_snapshot.json` +
  journal entry `idx: 65`. This is deterministic — no renumbering races.
- **Pinned changelog number: `1222`** (closure creates
  `_docs/_CHANGELOG/1222-*.md`). Numbers `1219` (TASK-510, in flight in the
  shared main tree — may be absent from this worktree's checkout; do NOT
  reallocate it), `1220` (TASK-482) and `1221` (TASK-483) are RESERVED by
  parallel streams and must not be reallocated.
- **Forbidden paths for TASK-484:** `core/services/analytics/**` (traffic
  files), analytics route modules, `core/admin/ui/setup/**`, auth/install
  route surfaces, and `usersService` first-admin logic. Never edit these.
- **Shared surfaces — additive-only, own-section/own-lines edits; never
  restructure:** `core/server/routes/index.ts` (`registerBackupRoutes` is
  already wired at :17/:102 — no edit should be needed; if one ever is, touch
  only the backup wiring lines), the security-gate test expectations
  under `tests/security/` (append backup-specific tests only),
  `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md` (own
  section only — TASK-483 also adds a DATA_MODEL section), and
  `core/db/schema.ts` (TASK-484 touches ONLY the `backup_schedules` /
  `backups` tables; TASK-483 separately adds analytics tables — do not
  reserve or restructure anything beyond 484's own additions).
- **Shared remote test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). See Testing Requirements
  for the mandatory fixture-scoping / cleanup / non-destructive-restore rules.
- **Land order:** 01 → 02 → 03 → 04 → 05 → 06, strictly sequential, single
  writer per source file.
- **Board/changelog discipline:** ONLY the closure leaf (TASK-484-06-L02)
  edits `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`, touching only
  TASK-484 rows and its own statistics deltas. Implementation subtasks never
  touch them.

---

## Security Contract (overview)

Per-leaf Security Contracts are authoritative; this is the umbrella summary.

- **Endpoint visibility:** `internal` — every backup route is under `/admin/api/*`
  (mounted via `core/server/routes/index.ts` → `registerBackupRoutes`). No public
  surface is added.
- **Auth model:** admin session cookie (httpOnly), same as the existing backup
  routes. The scheduler job runs **server-side with no request actor** (system
  context); its writes are audit-logged with `actorId: null`.
- **RBAC:** reads require `backups:read`; writes (manual create, restore, prune,
  schedule update) require `backups:write`. No new permission is introduced.
- **CSRF:** required on every internal write (`enforceCsrf`,
  `core/server/middleware/csrf.ts`); the scheduler is not request-driven so CSRF
  is N/A for its internal writes.
- **Rate-limit bucket:** `admin_read` for reads, `admin_write` for writes
  (`core/server/middleware/rateLimit.ts`).
- **Validation:** schema-first, reject-unknown (`additionalProperties: false`).
  New request schemas live in `core/server/validation/backupSchemas.ts`
  (the established location for this domain); domain enums/types/normalizers stay
  in `core/services/backups/backupTypes.ts` + `backupService.ts`; routes
  re-use/validate, never re-declare.
- **Anti-abuse:** all surfaces are internal (no public writes), so the public
  nonce + HMAC/reCAPTCHA evaluators do not apply. Restore is gated behind an
  explicit `confirm` flag; prune is idempotent and capped by retention.
- **Secret/PII handling:** artifact paths are redacted to clients
  (`redactArtifactPath`); restore reuses `importConfig`, which goes through the
  encrypted settings seam; storage credentials are read only via
  `getStorageSettingsInternal()` and never written to artifacts, the client
  cache, or logs (`sanitizeBackupError` already strips cwd + backup-dir paths).

---

## Sub-Tasks

| Subtask | Title | Effort | Status |
|---------|-------|--------|--------|
| TASK-484-01 | Schema & Schedule Run-Metadata (DB foundation) | Medium | ✅ Done |
| TASK-484-02 | Scheduler & Worker (run due backups) | Large | ✅ Done |
| TASK-484-03 | Retention Pruning | Medium | ✅ Done |
| TASK-484-04 | Restore Implementation | Large | ✅ Done |
| TASK-484-05 | Remote Artifact Storage | Medium | ✅ Done |
| TASK-484-06 | Storage Usage, Docs & Closure | Medium | ✅ Done |

**Subtask intent (one line each):**

- **01 — Schema foundation:** add `next_run_at` + `last_run_at` to
  `backup_schedules` and `artifact_key` to `backups`, wire the types/`mapSchedule`,
  and add the pure `computeNextRunAt` calculator + `markScheduleRun` helper. Full
  migration artifacts. (Foundation — sequenced first so the scheduler has a
  column to advance.)
- **02 — Scheduler & Worker:** in-process tick job that finds the due schedule,
  runs `createBackup({ kind: "scheduled" })`, persists `last_run_at` + recomputed
  `next_run_at`, and triggers retention; started from `startHttpServer()`
  (`core/server/httpServer.ts`) so it runs in dev and prod alike;
  single-flight via in-process flag + advisory lock; env-flag gated.
- **03 — Retention pruning:** `pruneExpiredBackups(retentionDays)` deletes
  expired terminal backups (reusing `deleteBackup` artifact cleanup) and is
  invoked post-run + via an internal trigger route.
- **04 — Restore:** read + strict-parse the JSON artifact and restore
  transactionally (settings via `importConfig`, snapshot tables via guarded
  delete+insert), gated behind `confirm`; remove the stub.
- **05 — Remote artifact storage:** `createBackupArtifact` honours
  `storageDriver`, uploading to s3/azure via the reused media storage adapters
  and storing URL + key; `deleteBackup` removes remote objects.
- **06 — Usage, docs & closure:** `getBackupStorageUsage()` + `GET /backups/usage`
  with an optional quota signal; sync DATA_MODEL / CMS_API / SECURITY_SPEC /
  MEDIA_SPEC; final gate matrix.

> **Ordering note (intentional adaptation of the discovery-pass numbering):** the
> discovery pass listed schema/migration last and scheduler first. Because the
> scheduler must read/advance `next_run_at`, the schema leaf is sequenced **first
> (01)** for dependency-correctness; usage/quota moves to **06**. The set of areas
> is unchanged.

---

## Testing Requirements

Lanes follow dependency shape, per `_docs/TESTING_STRATEGY.md`. The DB-backed
and runtime/route work is the Bun lane (`tests/unit/backups/*`,
`tests/integration/routes/*`, `tests/integration/runtime/*`,
`tests/security/*`) — matching the existing
`tests/unit/backups/backupService.test.ts` and
`tests/integration/routes/backups.test.ts` (both `bun:test`). The one **pure**
unit (`computeNextRunAt` — no `Bun.*`, no DB) goes to the **Vitest** lane
(`tests/vitest/backups/computeNextRunAt.test.ts`, run via
`bun run test:vitest`), per the TESTING_STRATEGY lane table ("Pure domain …
`core/services/*` without `Bun.*`" → Vitest). Only the DB-backed
schedule-wiring / `markScheduleRun` coverage stays in the Bun backups unit
folder. Load DB env first: `set -a && source .env && set +a`.

**Shared remote test DB discipline (mandatory for every DB-backed test):** the
`.env` `DATABASE_URL` points at the ONE shared render.com Postgres used by all
three parallel streams and the owner.

- Every DB-backed test uses **uniquely scoped fixtures** (e.g. UUID-suffixed
  names) and deletes **only rows it created** in `afterEach`/`finally`;
  truncating or deleting whole shared tables is forbidden.
- **Restore tests must NEVER execute the destructive delete+insert path against
  the shared DB.** The restore implementation must expose a scoped seam for
  tests (dry-run mode and/or an injected fixture-scoped target), and the tests
  assert validation/confirmation/transactionality through that seam only.
- **Scheduler tests** must restore any schedule they enabled back to disabled
  and release the Postgres advisory lock in `finally` blocks — a leaked enabled
  schedule would fire real backups from every dev server sharing the DB.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/backups` (service: schedule metadata, `markScheduleRun`,
  prune, restore, remote-storage routing, usage).
- `bun run test:vitest` covering `tests/vitest/backups/computeNextRunAt.test.ts`
  (pure next-run calculator).
- `bun test tests/integration/routes/backups.test.ts` (route registration, RBAC,
  reject-unknown, `mapBackupError`, restore-confirm, prune, usage — this is
  where the per-route visibility/permission/CSRF behaviour is asserted; the
  existing `tests/security/codersoSecurityGate.test.ts` has no route-bucket
  registry — it covers forms/booking access evaluators, submission nonces and
  rate-limit defaults).
- `bun test tests/integration/runtime/backupScheduler.test.ts` (NEW, created by
  TASK-484-02-L02 — due/not-due tick behaviour, advisory-lock single-flight,
  disabled-schedule cleanup; also a line in the 06-L02 closure gate matrix).
- `bun test tests/security/codersoSecurityGate.test.ts` stays green; if backup
  hardening assertions are added there (e.g. prune/usage/restore-confirm
  contracts), they are **appended** as new backup-specific tests only — never a
  restructure of the shared file.
- DB migration applies cleanly (`0065` — after the TASK-483 `0064` artifacts
  have been synced in, see Parallel-Stream Coordination) and the three
  artifacts exist (`0065_*.sql` + `meta/0065_snapshot.json` + journal
  entry `idx: 65`).

State explicitly in each closeout if a DB lane was skipped (e.g. no database
available) and why.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` — `backup_schedules.next_run_at` / `last_run_at` and
  `backups.artifact_key`; the scheduler/retention lifecycle.
- `_docs/CMS_API.md` — update **Backups (v1)** section: restore is now supported
  (with `confirm`), new `POST /backups/prune`, `GET /backups/usage`, and the
  remote-storage `artifactPath` (public URL) behaviour.
- `_docs/SECURITY_SPEC.md` — scheduler runs as a system actor (no request CSRF),
  restore confirmation gate, and that backups remain non-LLM-executable.
- `_docs/MEDIA_SPEC.md` — note that backup artifacts reuse the media storage
  drivers for s3/azure (and still do **not** archive media bytes).
- `_docs/_TASKS/README.md` — edited ONLY by the closure leaf TASK-484-06-L02
  at closure (TASK-484 rows + this stream's own statistics deltas only);
  implementation subtasks never touch it (see Parallel-Stream Coordination).
- `_docs/_CHANGELOG/` — task-linked entry on closure (cross-link `TASK-484` + the
  closing leaf id). **Pinned to changelog number `1222`**
  (`_docs/_CHANGELOG/1222-*.md`); `1219`/`1220`/`1221` are reserved by the
  parallel TASK-510/482/483 streams and must not be reallocated (see
  Parallel-Stream Coordination).

---

## Notes

- The webhook queue (`core/server/jobs/webhooksDelivery.ts`) is the **pattern
  reference** for an in-process worker, but the scheduler is **time-driven**
  (interval tick reading `next_run_at`), not event-enqueued.
- The scheduler is intentionally **in-process** (KISS/YAGNI) — no new cron daemon
  or queue service. Multi-instance safety uses a Postgres advisory lock exactly
  like `runStartupMigrations` (`STARTUP_MIGRATIONS_LOCK_NAMESPACE/KEY`).
- Restore restores **metadata + settings**, not media bytes — this is a hard
  property of the existing artifact format and must be documented, not silently
  implied as a full DR restore.

---

## Closure Checklist

- [x] All TASK-484-01..06 subtasks `✅ Done` / `⏭️ Superseded` / `❌ Cancelled`.
- [x] Migration `0065` committed with `0065_*.sql` + `meta/0065_snapshot.json` +
      `_journal.json` entry (`idx: 65`), authored only after TASK-483's `0064`
      artifacts were synced into this worktree (journal gapless).
- [x] `restoreBackup` no longer throws `backup_restore_unsupported`; restore is
      transactional and confirmation-gated.
- [x] Scheduled backups run and advance `next_run_at`; retention prunes; s3/azure
      artifacts upload; usage/quota surfaced.
- [x] DATA_MODEL / CMS_API / SECURITY_SPEC / MEDIA_SPEC synced to shipped code.
- [x] Bun service + route + runtime-scheduler
      (`tests/integration/runtime/backupScheduler.test.ts`) + security lanes and
      the Vitest `computeNextRunAt` spec green (or skips justified); board +
      changelog synced (changelog entry `1222`, closure leaf TASK-484-06-L02
      only).
