# 152-2026-02-04 - Widget favorites user settings

Date: 2026-02-04
Version: Unreleased
Tasks: TASK-049-04

## Summary
- Persisted widget favorites per user in settings and wired the widgets library.

## Key Changes
- CMS/Settings: added `widgets.favorites` user setting with validation and limits.
- Admin/UI: widgets library now loads and saves favorites per user.
- Tests: added coverage for favorites validation.
