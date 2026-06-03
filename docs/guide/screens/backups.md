---
title: "Backups"
audience: "admin"
productArea: "backups"
language: "en"
keywords:
  - backups
  - backup schedule
  - restore
  - download backup
  - retention
---

# Basic

Backups is the recovery-readiness surface for scheduled and on-demand system
snapshots. It is where you manage backup cadence, choose the storage target,
inspect recent backup jobs, and start a manual backup when needed.

In the current UI, this screen includes:
- `Create Backup Now`,
- a `Backup Schedule` card,
- frequency controls:
  `Daily`, `Weekly`, `Monthly`,
- a storage target selector,
- a `Recent Backups` table,
- backup search and pagination controls,
- a storage-retention information notice.

# Medium

Use Backups when you need confidence that data and assets can be recovered after
risky work, migration, or operational failure. The current route is designed
for:
- reviewing whether automatic backups are active,
- adjusting how often backups run,
- checking where backups are stored,
- inspecting recent backup job state,
- triggering a manual snapshot immediately.

In v1, backup execution is metadata-only in the core app. Creating a backup
adds a queued job for the configured external worker/plugin. The UI shows that
worker boundary explicitly; artifact creation, artifact URL publication, and
restore execution are owned by the worker.

This screen combines two kinds of work:
- policy:
  schedule and storage target
- execution:
  recent backup jobs and on-demand backup creation

# Instruction

1. Open `Backups`.
2. Start with the page summary and confirm whether backup management is the
   right surface for the current task.
3. Review `Backup Schedule` first.
4. Check whether auto-backup is active.
5. Choose the frequency that matches the operational risk:
   - `Daily`
   - `Weekly`
   - `Monthly`
6. Review the storage target and change it only when the destination policy
   should really change.
7. Use `Update Schedule` after confirming both frequency and storage target.
8. Move to `Recent Backups`.
9. In the table, review:
   - backup id,
   - size,
   - date created,
   - status,
   - available actions.
10. Treat status carefully:
    queued, running, completed, and failed have different operational meaning.
11. Use table actions only when they are eligible:
    - download is available only after the external worker publishes a secure
      artifact URL,
    - restore is unavailable in v1 until a configured backup worker provides a
      restore implementation,
    - delete removes the selected backup record after confirmation.
12. Use `Create Backup Now` when you need a manual snapshot before a risky
    operation.
13. In the dialog, review what the on-demand backup includes:
    - database snapshot,
    - media assets,
    - settings & tokens.
14. Use `Start Backup` only when the snapshot is intentionally needed now.
15. Review the storage information note and remember that automated backups are
    retained for 30 days in the current UI.

Use this safe backup workflow when you want fewer recovery mistakes:
1. Confirm schedule and storage target.
2. Review recent backup status.
3. Trigger a manual backup before risky work.
4. Download long-term artifacts when retention needs exceed the default window.

# Advanced

- Backup policy and backup execution are related but different decisions. A good
  schedule does not remove the need for a manual backup before a high-risk
  change.
- `Queued` backup state is useful operationally because it tells you the request
  was accepted even when the artifact is not ready yet. If queued jobs stay
  aged, confirm that the external backup worker is running.
- Storage target choice is part of resilience strategy, not just a dropdown
  preference.
- The 30-day retention note matters: long-term recovery expectations should not
  depend only on automated retention.
- Restore and download actions belong to operational recovery planning, not just
  to routine browsing of the table.

# Troubleshooting

- The latest backup is not downloadable:
  check whether its status is complete and whether the external worker has
  published a secure artifact URL.
- Restore is disabled:
  v1 restore requires a configured backup worker; queued, running, failed, and
  artifact-less backups are not restorable from the core UI.
- The table looks empty or too small:
  clear search terms, use pagination, and confirm whether the environment has
  only a small backup history right now.
- The team assumes automated retention is enough:
  use the storage information note to reset that assumption for long-term needs.
- You are unsure whether to wait for schedule or create one manually:
  create a manual backup before the risky change when timing matters.

# Decision Guide

- Choose schedule update vs manual backup:
  update the schedule for policy changes; run a manual backup for immediate
  protection before risky work.
- Choose daily vs weekly vs monthly:
  match the cadence to operational risk and change frequency, not to habit.
- Choose keep-in-system vs download:
  download the artifact only after the worker publishes a secure URL, and use
  external retention policy when requirements exceed the default automated
  window.

# Checklist

1. Confirm auto-backup state and frequency.
2. Confirm the storage target is correct.
3. Review recent backup status before risky work.
4. Run a manual backup when immediate protection is needed.
5. Confirm the external worker completed the job before relying on an artifact.
6. Download important artifacts when longer retention is required.

# Security

- Backups is an authenticated admin surface and should only be used by users
  with recovery, infrastructure, or high-trust operational permissions.
- Restore, download, and delete actions can affect business continuity and data
  exposure, so they should be treated as controlled operational actions.
- Backups can contain sensitive data and configuration, so exported artifacts
  should be handled like protected system material.
- Selecting `settings & tokens` affects backup scope only; the UI and audit log
  record option keys, not secret values.
