# TASK-006-08: Design Tokens UI
# FileName: TASK-006-08_Design_Tokens_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-007, TASK-024
**Status:** Done (2026-01-26)

---

## Overview

Replace the placeholder settings UI with the design tokens editor layout from
the HTML prototype. Keep JSON editing as the primary flow and add preview
panels for tokens.

## Reference UI

- `_docs/UI/admin_panel/8-design-tokens-editor/code.html`
- `_docs/UI/admin_panel/8-design-tokens-editor/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Settings sidebar + breadcrumbs.
- Left JSON editor pane.
- Right preview pane with tabs (typography, buttons, forms).

## Shadcn Components

- `Tabs`, `Textarea`, `Card`, `Badge`, `Button`, `Input`, `Checkbox`,
  `Switch`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/SettingsPage.tsx` | update | use new layout |
| `core/admin/ui/settings/DesignTokensEditor.tsx` | update | JSON editor UI |
| `core/admin/ui/settings/DesignTokensPreview.tsx` | create | preview cards |
| `core/admin/ui/layouts/SettingsShell.tsx` | use | wrapper |

## Data + State

- `GET /settings` for tokens + settings values.
- `PATCH /settings` for saving tokens.
- Local JSON validation with error feedback.

## Unit Tests

- `tests/unit/ui/design-tokens-editor.test.tsx` renders editor + error state.
- `tests/unit/ui/design-tokens-preview.test.tsx` renders preview tabs.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-design-tokens-ui.md`
