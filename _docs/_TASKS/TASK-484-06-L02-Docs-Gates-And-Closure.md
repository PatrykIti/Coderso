# TASK-484-06-L02: Docs sync, gate matrix & closure
# FileName: TASK-484-06-L02-Docs-Gates-And-Closure.md

**Parent Subtask:** TASK-484-06
**Priority:** Medium
**Category:** `backups` / `docs-closure`
**Estimated Effort:** Small
**Dependencies:** TASK-484-01..06-L01 (all behaviour shipped). Final leaf of the
task.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Sync all source-of-truth docs to the shipped backup behaviour and run
  the final gate matrix for task closure. No new code/behaviour — documentation
  + verification only.
- **Owning module(s) to create-or-extend:** `_docs/DATA_MODEL.md`,
  `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, `_docs/MEDIA_SPEC.md`,
  `_docs/_TASKS/README.md` (this closure leaf is the **single writer** of the
  task board and changelog for the TASK-484 stream — implementation subtasks
  never touch them), and the pinned changelog entry
  `_docs/_CHANGELOG/1222-*.md` on closure.
- **Shared-surface scoping (pinned):** `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md` and `_docs/DATA_MODEL.md` are shared surfaces that
  the parallel TASK-482/483 streams also edit additively. All doc edits here
  are **additive and confined to backup-owned sections/lines**: CMS_API
  `## Backups (v1)` (line 2919), a **new** backups section in `DATA_MODEL.md`
  (the file currently has no backups section at all — author it as a clean
  standalone section, not interleaved with TASK-483's new analytics section),
  and backup-specific lines in SECURITY_SPEC/MEDIA_SPEC. Do not restructure or
  reflow sections owned by TASK-482/483. Board/changelog edits touch **only
  TASK-484 rows and this stream's own statistics deltas** — never rows/entries
  owned by TASK-482/483/510.
- **Source-of-truth docs:** all four above (this leaf edits them).
- **Out of scope:** any further feature work; the usage source (L01).

---

## Security Contract

Docs/closure leaf — no route, no code, no data path. Security-relevant
**documentation** updates only:

- **Endpoint visibility / Auth / RBAC / CSRF / Rate-limit:** n/a (no executable
  change). The docs must accurately state the contracts shipped by the other
  leaves (scheduler = system actor / no CSRF; restore = `backups:write` + CSRF +
  `confirm`; prune = `backups:write` + CSRF; usage = `backups:read`).
- **Validation / Anti-abuse:** document that scheduler input is server-owned and
  restore requires confirmation.
- **Secret/PII handling:** confirm the docs state that artifacts never contain
  storage credentials and that `artifact_key` is server-internal (never returned
  to clients), and that restore keeps secrets encrypted via `importConfig`.

---

## Implementation Pseudocode

(Editorial — concrete doc edits, not code.)

1. **`_docs/DATA_MODEL.md`** — author a **new** backups section (the file has
   no backups coverage today) documenting `backup_schedules` incl.
   `next_run_at` / `last_run_at` and `backups` incl. `artifact_key`; describe
   the scheduler/retention lifecycle (enabled + due → run → advance
   `next_run_at` → prune by `retention_days`). Keep it a self-contained
   additive section placed next to — never interleaved with — TASK-483's new
   analytics section.
2. **`_docs/CMS_API.md`** — update the **Backups (v1)** section (≈ line 2919):
   - restore is now supported and requires `{ "confirm": true }`;
   - new `POST /backups/prune` (`backups:write`);
   - new `GET /backups/usage` (`backups:read`) with the usage shape;
   - remote artifacts return a public-URL `artifactPath` (drops the
     "local JSON artifact only" caveat for s3/azure);
   - note restore restores metadata + settings, **not media bytes**.
3. **`_docs/SECURITY_SPEC.md`** — scheduler runs as a system actor (no request /
   CSRF), `actorId: null` audit; restore confirmation gate; backups remain
   non-LLM-executable (the existing note ≈ line 513 stays true).
4. **`_docs/MEDIA_SPEC.md`** — backup artifacts reuse the media storage drivers
   for s3/azure and still do **not** archive media file bytes.
5. **Board + changelog** — as the stream's single writer of
   `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`: flip **only** TASK-484
   row statuses plus this stream's own statistics deltas, and create the
   pinned entry `_docs/_CHANGELOG/1222-*.md` cross-linking `TASK-484` + this
   leaf id and the `0065` migration tag. Changelog numbers `1219` (TASK-510,
   in flight in the shared main tree — may be absent from this worktree's
   checkout), `1220` (TASK-482) and `1221` (TASK-483) are **reserved** by
   parallel streams and must not be reallocated even if absent from the
   checkout.

**Regression-test shape:** N/A (docs). The verification is the gate matrix below
plus a grep check that the docs no longer claim restore is unsupported.

---

## Testing Requirements

Closure gate matrix (record results in the closeout). Load env:
`set -a && source .env && set +a`.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/backups`
- `bun run test:vitest` — covers `tests/vitest/backups/computeNextRunAt.test.ts`
  (the pure calculator's Vitest lane, per the root Testing Requirements).
- `bun test tests/integration/routes/backups.test.ts`
- `bun test tests/integration/runtime/backupScheduler.test.ts`
- `bun test tests/security/codersoSecurityGate.test.ts`
- Migration `0065` applies cleanly; artifacts present (`0065_*.sql` +
  `meta/0065_snapshot.json` + `meta/_journal.json` entry idx 65).
  Precondition: TASK-483's `0064` analytics artifacts (owned by the parallel
  TASK-483 stream, which merges first) must already be synced into this
  worktree so the journal stays gapless before this gate runs.
- Grep gate: `_docs/CMS_API.md` no longer states backup restore is unsupported;
  `restoreBackup` no longer throws `backup_restore_unsupported`.

State explicitly if any DB lane was skipped (no database) and why.

---

## Closure Checklist

- [x] DATA_MODEL / CMS_API / SECURITY_SPEC / MEDIA_SPEC synced to shipped code.
- [x] All TASK-484-01..06 leaves terminal.
- [x] Gate matrix recorded; board synced (TASK-484 rows + own statistics
      deltas only); changelog `_docs/_CHANGELOG/1222-*.md` created; `0065`
      migration tag cross-linked (0064 belongs to TASK-483).
