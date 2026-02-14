# 212-2026-02-14 - Runtime preview FOUC dev modules

Date: 2026-02-14
Version: Unreleased
Tasks: TASK-053-05

## Key Changes
- CMS/Site: Hide preview body until `window.load` even when styles are injected by dev module scripts.
- Tests: Added coverage for preview hide behavior when CSS is provided via dev modules.
- Docs: Clarified preview CSS loading behavior for dev module scripts.
