# TASK-006-01: Dashboard UI
# FileName: TASK-006-01_Dashboard_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-006, TASK-007, TASK-014, TASK-024
**Status:** To Do

---

## Overview

Build the admin dashboard UI using the existing HTML prototype. Focus on the
layout, card system, and table composition. Data wiring can start with mocked
view models and later connect to real endpoints.

## Reference UI

- `_docs/UI/admin_panel/1-dashboard/code.html`
- `_docs/UI/admin_panel/1-dashboard/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Page header (title, subtitle, primary/secondary actions).
- Stats row (3 cards: visitors, page views, storage).
- Recent edits table.
- Site health card (progress bars).
- Security status card.

## Shadcn Components

- `Button`, `Card`, `Table`, `Badge`, `Progress`, `Avatar`, `Separator`, `Tooltip`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/dashboard/DashboardPage.tsx` | create | screen composition |
| `core/admin/ui/dashboard/StatCard.tsx` | create | metric card component |
| `core/admin/ui/dashboard/RecentEditsTable.tsx` | create | table wrapper |
| `core/admin/ui/dashboard/SiteHealthCard.tsx` | create | progress summary |
| `core/admin/ui/dashboard/SecurityStatusCard.tsx` | create | status list |
| `core/admin/ui/layouts/AdminShell.tsx` | use | shared wrapper |
| `core/admin/ui/navigation/sidebarConfig.ts` | update | add dashboard route |

## Data + State

- `GET /pages?sort=updatedAt&limit=5` for recent edits.
- `GET /media/usage` (or derived) for storage usage.
- `GET /audit-logs?limit=5` for security summary.
- Use a `DashboardViewModel` interface to keep UI independent of API DTOs.

## Unit Tests

- `tests/unit/ui/dashboard.test.tsx` renders page and key sections.
- `tests/unit/ui/stat-card.test.tsx` formats value + delta.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-ui.md`

