---
title: "Import Export"
audience: "admin"
productArea: "operations"
language: "en"
keywords:
  - import export
  - data portability
  - export data
  - import data
  - recent imports
---

# Basic

Import & Export is the data portability surface for packaging configuration out
of the system and bringing structured bundles back in. It is where you choose
what to export, upload import files, preview importable data, and monitor recent
import runs.

In the current UI, this screen includes:
- a topbar `Activity Log` action,
- `Export Data` cards for:
  `Content Types`, `Pages`, `Media`,
- `Import Data` with a dropzone and file browser,
- a `Recent Imports` table with status and progress.

# Medium

Use Import & Export when data or configuration needs to move in a controlled,
reviewable way instead of through ad-hoc edits. The current route is designed
for:
- exporting targeted bundles by surface,
- previewing what an import will affect before applying it,
- uploading supported portable files,
- tracking recent import attempts and their status.

This is not only a download screen. It combines:
- export scope selection,
- import intake,
- preview/apply workflow,
- run history monitoring.

# Instruction

1. Open `Import & Export`.
2. Start with `Export Data` when the goal is to take configuration or content
   out of the system.
3. Choose the export card that matches the target scope:
   - `Content Types`
   - `Pages`
   - `Media`
4. Review the available options inside the card before downloading.
   Examples in the current UI include:
   - field definitions,
   - validation rules,
   - page hierarchy,
   - SEO metadata,
   - binary files,
   - alternative text.
5. Use `Download` only after confirming the correct scope and options.
6. Move to `Import Data` when the goal is to bring a file into the system.
7. Review the supported file guidance in the dropzone:
   `.json`, `.csv`, and `.zip` up to 50MB.
8. Use `Browse Files` or drag a file into the dropzone.
9. Treat the import preview as the decision point before applying changes.
10. In preview mode, review the summary counts and warnings before using
    `Apply Import`.
11. Move to `Recent Imports` to monitor validation or upload progress.
12. In the table, review:
    - file name,
    - type,
    - status,
    - progress,
    - date.
13. Use the history view to understand whether an import is still in progress,
    already completed, or failed.

Use this safe import/export order when you want fewer data-movement mistakes:
1. Confirm whether the goal is export or import.
2. Choose the correct scope.
3. Review options or preview.
4. Apply only after the scope looks correct.
5. Check recent imports for status and outcome.

# Advanced

- Export cards are intentionally scoped by surface. They help avoid treating all
  data movement as one giant undifferentiated bundle.
- Import preview is the high-value checkpoint in this route because it shows the
  likely impact before mutation.
- Recent Imports is part of the workflow, not only historical decoration. It is
  where operational follow-up happens after upload.
- A failed import is still useful evidence because it tells you the bundle or
  validation contract needs attention before retry.
- Topbar `Activity Log` suggests that import/export work should be treated as a
  trackable operational action rather than a casual convenience feature.

# Troubleshooting

- You are unsure what to export:
  choose the narrowest card that still covers the real use case.
- The import file is rejected:
  check the supported format and whether the bundle matches the expected
  structure.
- Preview shows warnings:
  review them before applying the import instead of treating them as noise.
- A run is stuck or uncertain:
  check `Recent Imports` for status and progress before retrying blindly.

# Decision Guide

- Choose export vs import:
  use export when moving data out; use import when introducing a prepared bundle
  into the environment.
- Choose narrow export vs broad export:
  prefer the narrowest useful scope to reduce accidental portability mistakes.
- Choose preview vs apply:
  preview first whenever the route offers it; apply only after the scope and
  warnings make sense.

# Checklist

1. Confirm the goal is export or import.
2. Confirm the selected card or file matches the real scope.
3. Review options or preview before mutation.
4. Apply or download only after checking the scope carefully.
5. Review `Recent Imports` for final status.

# Security

- Import & Export is an authenticated admin surface and should only be used by
  users with high-trust data-management permissions.
- Exported bundles can contain sensitive configuration and structure data, so
  they should be handled as controlled artifacts.
- Imports can change broad system scope, so preview and warnings should be
  treated as guardrails, not optional hints.
