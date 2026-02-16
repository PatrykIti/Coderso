# 222-2026-02-16 - Settings UI polish and content type editor fix

Date: 2026-02-16
Version: Unreleased
Tasks: TASK-006-04, TASK-006-18, TASK-006-19, TASK-006-39, TASK-042-03, TASK-101-01

## Key Changes
- Admin/UI: Split Assistant settings into its own Settings tab and simplified General to Site Identity + Branding.
- Admin/UI: Aligned Security save/auto-save controls with Site settings; added inline IP allowlist add action + tooltip.
- Admin/UI: Webhooks and Integrations headers now match API Keys layout with primary actions.
- Admin/UI: Storage defaults to `./storage/media` and max upload size now supports KB/MB/GB units.
- CMS/Content: Fixed Content Type Editor render loop that could crash when opening an editor.
- Docs: Added cache TTL tooltip copy and documented the local media default path.
