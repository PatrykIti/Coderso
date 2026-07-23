---
title: "Storage Settings"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - storage settings
  - s3
  - azure blob
  - local storage
  - upload policy
---

# Basic

Storage Settings is the asset-storage configuration surface for deciding where
files are stored and how uploads are delivered. It is where you choose the
active storage provider, configure provider-specific credentials, define upload
policies, and review storage-security signals.

In the current UI, this route includes:
- provider cards:
  `Local Storage`, `Amazon S3`, `Azure Blob`
- provider-specific configuration panels,
- `Test Connection`,
- upload policy fields,
- a storage security summary,
- an auto-save toggle and `Save changes`.

# Medium

Use Storage Settings when the asset backend or upload policy needs to change at
the environment level. The current route is designed for:
- switching between local and cloud providers,
- configuring provider-specific credentials and locations,
- reviewing note panels for filesystem, IAM, or access policy expectations,
- setting shared upload defaults such as max size and MIME restrictions.

This is not a media-library screen. It is the infrastructure and delivery layer
underneath media handling across the CMS.

# Instruction

1. Open `Settings > Storage`.
2. Start with the provider cards and confirm which backend should be active:
   - `Local Storage`
   - `Amazon S3`
   - `Azure Blob`
3. Review the active provider panel before editing fields.
4. For `Local Storage`, review the storage root and filesystem note.
5. For `Amazon S3`, review:
   - access key,
   - secret key,
   - bucket name,
   - region,
   - custom endpoint.
6. For `Azure Blob`, review:
   - account name,
   - account key,
   - container name,
   - connection string.
7. Review `Test Connection`. In the current UI it is disabled and explains that
   provider test feedback is not wired yet.
8. Move to `Upload Policies`.
9. Review the shared fields:
   - storage file URL override (legacy adapter compatibility only),
   - max upload size,
   - allowed MIME types.
10. Choose the upload-size unit carefully (`KB`, `MB`, `GB`) before saving.
11. Read the migration note:
    changing the storage driver does not migrate existing files.
12. Review `Security Summary` before assuming credentials are fully configured.
13. Use `Save changes` when the provider, credentials, and upload policy are
    coherent together.

Use this safe storage workflow when you want fewer asset-delivery mistakes:
1. Confirm the active provider.
2. Configure provider-specific fields.
3. Review the provider note.
4. Review upload policies.
5. Wait for the connection-test contract before relying on provider validation.
6. Save deliberately.

# Advanced

- Provider choice is an infrastructure decision, not just a dropdown. It affects
  delivery model, credentials, and operational ownership.
- The migration note is one of the most important warnings on the page because a
  driver switch does not backfill existing assets automatically.
- Security summary is useful even when values are `Missing`, because it quickly
  shows which secrets still need configuration.
- `Storage File URL (Override)` is retained adapter/storage compatibility
  configuration. Media records still render through the stable core proxy
  `/media/<encoded-key>`; the override neither replaces that route nor controls
  its public/internal access mode.
- `Test Connection` should be treated as an operational validation step, not as
  a replacement for understanding the provider configuration itself. It is
  intentionally unavailable in the current UI until backend provider feedback is
  wired.

# Troubleshooting

- Uploads still fail after changing provider:
  review provider credentials and the migration note before assuming existing
  files moved automatically.
- Media proxy access or host behavior is wrong:
  check Media Library delivery access settings and the configured site hosts.
  The storage URL override cannot replace or bypass the core media proxy.
- Cloud storage is configured but still feels incomplete:
  review the security summary and the provider-specific note panel.
- The size policy blocks uploads unexpectedly:
  confirm both the numeric value and the selected size unit.

# Decision Guide

- Choose local vs cloud storage:
  use local when self-hosted simplicity is enough; use cloud when scalability or
  external delivery control is required.
- Choose S3 vs Azure:
  follow the team’s infrastructure and operations context rather than treating
  them as interchangeable cosmetic options.
- Choose save vs connection test:
  save when you are still drafting config; test connection when the current
  values should already work.

# Checklist

1. Confirm the correct storage provider is selected.
2. Confirm the required credentials and target fields are complete.
3. Confirm upload policy values are intentional.
4. If a legacy adapter requires the file URL override, confirm it without
   treating it as the public media URL or an access-control setting.
5. Confirm the migration caveat is understood.
6. Save changes deliberately.

# Navigation And Drafts

- Settings section links use in-app navigation on desktop and mobile.
- If this screen has unsaved edits, moving to another Settings section,
  browser Back/Forward, or refresh/close prompts before the draft is discarded.
- Choose cancel/keep editing when you need to preserve the current draft.

# Security

- Storage Settings is an authenticated admin surface and should only be used by
  high-trust administrators responsible for infrastructure and asset delivery.
- Access keys, secret keys, and connection strings are sensitive infrastructure
  secrets and should be handled as such.
- Provider switches and delivery changes can affect the whole media system, so
  they should be treated as operationally sensitive configuration.
