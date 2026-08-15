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
- a storage-retention information notice,
- an **Import** action (upload a `.cbk` archive + passphrase to restore),
- a **passphrase** requirement on Create — every backup is encrypted, so you set
  a passphrase when creating a backup and must supply the same passphrase to
  import it (the passphrase is never saved by the system),
- a **Users & roles (RBAC matrix)** opt-in section on Create, with a
  sensitivity warning.

# Medium

Use Backups when you need confidence that data and assets can be recovered after
risky work, migration, or operational failure. The current route is designed
for:
- reviewing whether automatic backups are active,
- adjusting how often backups run,
- checking where backups are stored,
- inspecting recent backup job state,
- triggering a manual snapshot immediately,
- importing a `.cbk` archive to restore a full backup (including media file
  bytes) with the passphrase that encrypted it,
- planning recovery around the passphrase: the same passphrase is the only way
  to decrypt a backup, so it must be kept safe outside the system — a lost
  passphrase makes the archive unrecoverable.

Backups are executed by the CMS itself (v2), not an external worker: creating a
backup produces a compressed, encrypted `.cbk` archive. `Settings & tokens`,
`Users & roles (RBAC matrix)`, and other sensitive sections travel only inside
the encrypted archive. Scheduled full backups run unattended and read the
passphrase from `BACKUP_ENCRYPTION_PASSPHRASE`; if that value is not set, the
scheduled run fails closed rather than create an unencrypted archive.

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
   Note: scheduled full backups run unattended, so an operator must set
   `BACKUP_ENCRYPTION_PASSPHRASE` in the environment — otherwise scheduled runs
   fail closed (they never create an unencrypted archive).
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
    - download is available for completed backups (a `.cbk` archive),
    - restore-by-id applies only to legacy v1 `.json` rows; a v2 `.cbk` backup
      is restored by downloading it and using Import,
    - delete removes the selected backup record after confirmation.
12. Use `Create Backup Now` when you need a manual snapshot before a risky
    operation.
13. In the dialog, set a **passphrase** (required) and review what the backup
    includes:
    - database snapshot,
    - media assets,
    - settings & tokens,
    - Users & roles (RBAC matrix) — opt-in, encrypted-only, and sensitive
      because it includes user accounts and role assignments.
14. Use `Start Backup` only when the snapshot is intentionally needed now, and
    store the passphrase somewhere safe — it is never saved by the system and
    is the only way to decrypt the archive.
15. To restore, use **Import**: upload the `.cbk` file, enter the passphrase,
    confirm, and (if the archive contains them) opt into restoring users.
    Enable maintenance mode first if prompted.
16. Review the storage information note and remember that automated backups are
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
  aged, confirm that the scheduler or job runner is running.
- Storage target choice is part of resilience strategy, not just a dropdown
  preference.
- The 30-day retention note matters: long-term recovery expectations should not
  depend only on automated retention.
- Restore and download actions belong to operational recovery planning, not just
  to routine browsing of the table.
- Every backup is encrypted: plan the passphrase lifecycle (who holds it, how it
  is shared, what happens when the operator leaves) before relying on backups
  for recovery. A lost passphrase is a lost backup.

# Troubleshooting

- The latest backup is not downloadable:
  check whether its status is complete. Queued, running, failed, and
  artifact-less backups are not downloadable.
- Import fails:
  confirm the file is a Coderso `.cbk` archive, the passphrase is the one used
  at create time, and maintenance mode is enabled if the system prompts for it.
  A wrong passphrase or a corrupt file is rejected before any data changes.
- A v2 backup has no restore action:
  v2 encrypted backups restore via download → Import, not by restore-by-id.
  Legacy v1 `.json` rows still restore in place.
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
- Choose keep-in-system vs download vs import:
  download a completed `.cbk` when you need an off-system copy; use Import to
  restore a full backup into the CMS with its passphrase; use external
  retention policy when requirements exceed the default automated window.

# Checklist

1. Confirm auto-backup state and frequency.
2. Confirm the storage target is correct.
3. Review recent backup status before risky work.
4. Run a manual backup when immediate protection is needed.
5. Confirm the backup completed before relying on its archive.
6. Store the passphrase somewhere safe — it is the only way to decrypt.
7. Download important artifacts when longer retention is required.

# Security

- Backups is an authenticated admin surface and should only be used by users
  with recovery, infrastructure, or high-trust operational permissions.
- Restore, import, download, and delete actions can affect business continuity
  and data exposure, so they should be treated as controlled operational
  actions.
- Backups can contain sensitive data and configuration, so exported artifacts
  should be handled like protected system material. Every `.cbk` is encrypted
  (AES-256-GCM); the passphrase, not the file, is what keeps the contents
  private.
- Selecting `settings & tokens` or `Users & roles (RBAC matrix)` affects backup
  scope only; the UI and audit log record option keys, not secret values. User
  accounts and role assignments travel only inside the encrypted archive.
