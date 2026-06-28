# TASK-484-06-L02: Docs sync, gate matrix & closure
# FileName: TASK-484-06-L02-Docs-Gates-And-Closure.md

**Parent Subtask:** TASK-484-06
**Priority:** Medium
**Category:** `backups` / `docs-closure`
**Estimated Effort:** Small
**Dependencies:** TASK-484-01..06-L01 (all behaviour shipped). Final leaf of the
task.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Sync all source-of-truth docs to the shipped backup behaviour and run
  the final gate matrix for task closure. No new code/behaviour — documentation
  + verification only.
- **Owning module(s) to create-or-extend:** `_docs/DATA_MODEL.md`,
  `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, `_docs/MEDIA_SPEC.md`, the task
  board (orchestrator-synced — do not hand-edit `_docs/_TASKS/README.md`), and a
  `_docs/_CHANGELOG/` entry on closure.
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

1. **`_docs/DATA_MODEL.md`** — add `backup_schedules.next_run_at` /
   `last_run_at` and `backups.artifact_key`; describe the scheduler/retention
   lifecycle (enabled + due → run → advance `next_run_at` → prune by
   `retention_days`).
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
5. **Board + changelog** — flip statuses; add a `_docs/_CHANGELOG/` entry
   cross-linking `TASK-484` + this leaf id and the `0064` migration tag.

**Regression-test shape:** N/A (docs). The verification is the gate matrix below
plus a grep check that the docs no longer claim restore is unsupported.

---

## Testing Requirements

Closure gate matrix (record results in the closeout). Load env:
`set -a && source .env && set +a`.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/backups`
- `bun test tests/integration/routes/backups.test.ts`
- `bun test tests/integration/runtime/backupScheduler.test.ts`
- `bun test tests/security/codersoSecurityGate.test.ts`
- Migration `0064` applies cleanly; artifacts present.
- Grep gate: `_docs/CMS_API.md` no longer states backup restore is unsupported;
  `restoreBackup` no longer throws `backup_restore_unsupported`.

State explicitly if any DB lane was skipped (no database) and why.

---

## Closure Checklist

- [ ] DATA_MODEL / CMS_API / SECURITY_SPEC / MEDIA_SPEC synced to shipped code.
- [ ] All TASK-484-01..06 leaves terminal.
- [ ] Gate matrix recorded; board + changelog synced; `0064` migration tag
      cross-linked.
