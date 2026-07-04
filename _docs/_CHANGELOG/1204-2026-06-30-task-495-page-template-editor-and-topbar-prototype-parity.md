# 1204. TASK-495 Page/Template Editor & Top-Bar Prototype-Parity Remediation

**Date:** 2026-06-30
**Version:** Unreleased
**Tasks:** TASK-495 (01 + 02 + 03); related TASK-479 (**supersedes** the keep-decision of 479-06-L04, **fulfills** the right-dock contract of 479-08-L02)

## Summary

A post-TASK-479 live prototype-parity comparison (`_docs/_PROTOTYPE/` on `:5180`
vs the shipped admin on `:5173`) surfaced two parity gaps; both are now closed,
UI-only (no data/route/RBAC/cache change). The page and page-template editors are
brought to prototype parity and the global TopBar drops the theme-name switcher.
The `mode:"menu"` visual menu designer (not covered by the prototype) is untouched
— every new chrome path is gated `editorHost.mode !== "menu"`.

## Key Changes

### TopBar (TASK-495-01)
- Removed the "Soft Violet" `<AdminThemeSwitcher/>` from the global TopBar right
  cluster (import + the single JSX mount). The cluster now matches the prototype:
  Create · color-mode toggle · host `{actions}` · notifications · user menu. Theme
  management stays fully reachable via the sidebar **Visual → "Admin UI Theme"** →
  `/admin/themes` (`themes:read`); the `AdminThemeSwitcher` component file itself is
  kept (only un-mounted).
- Updated 3 tests: inverted the two suites that asserted the switcher present
  (`admin/topbar-color-mode-toggle`, `ui-integration/admin-shell/topbar`) to assert
  it **absent** while keeping color-mode-toggle coverage, and deleted a now-dead
  switcher mock in `ui/admin-breadcrumbs.test.tsx`.
- **Supersedes** the keep-decision of TASK-479-06-L04 (whose pseudocode said KEEP
  the theme-profile dropdown). L04's status is left unchanged; the supersession is
  recorded here per the task contract.

### Page/Page-Template editor chrome + right rail (TASK-495-02)
- De-overloaded the editor top bar: drained the fat `topbarActions` out of the
  global TopBar (top-bar breadcrumb kept) into an in-content `PageHeader`
  [Page settings · History · Preview · Save draft · Publish] plus a "Page builder"
  sub-toolbar (doc-status `StatusBadge` + Unsaved pill, relocated Undo/Redo,
  `DeviceSwitcher`, Layers, Panel toggle).
- Re-docked the dark `bg-slate-950` bottom-center floating panel to a light,
  right-pinned, collapsible rail (`bg-popover`/`text-foreground`, vertical
  re-stack, internal scroll, header close + top-right reopen chip) — fulfilling the
  unmet `panelPosition="right"` contract of TASK-479-08-L02.
- Added a "Save only" (no-publish) badge keyed on `!editorHost.publish` (the
  page-template host is savable but omits publish).
- **Branched (did NOT globally delete)** the drag + `--page-editor-toolbar-clearance`
  plumbing so the shared `menu` host keeps its legacy draggable bottom panel
  byte-identically; the page/page-template branch simply stops referencing it.

### Page/Page-Template editor visual parity (TASK-495-03)
- Fixed dark-mode: canvas frame `bg-white`→`bg-card`, and canvas CTA/ghost/add-beside
  literals → adaptive tokens threaded via a `tone: "dark"|"light"` Context. P1 token
  swaps are **shared + light-pixel-safe** and also fix the menu dark-mode white slab.
- Wrapped the sub-toolbar + canvas in one `rounded-2xl border bg-card shadow-card`
  card (separation) with the `PageHeader` floating above; narrowed the right rail
  340→280px (`paddingRight` 360→300).

## Process / drift findings (preserved)
- ≥5-round **sequential** pre-implementation drift audits per subtask.
- Post-implementation audit caught + fixed a HIGH where the right rail occluded the
  `PageHeader` CTAs.
- The dark→light relight was **deeper than first scoped**: it reaches every
  `editorControls` primitive that hardcoded inline dark Tailwind, not just the button
  CTAs. The owner chose the full tone-based relight (a `tone` Context threaded through
  `ToolbarSubpanel` into every control primitive) over a button-only recolor.

## Docs / contracts
- No `PAGE_MODEL.md` / `PREVIEW_SPEC.md` / `DESIGN_TOKENS.md` contract edits were
  required — this is a control-placement + visual restyle only (GAP A is a
  presentational un-mount; `/admin/themes` + `themes:read` are unaffected). Stated
  per the subtasks' Documentation-Updates sections.

## Validation
- `bun --cwd core lint`, `bun --cwd core lint:types` — clean.
- ~176 vitest tests across the admin top-bar + page-editor suites (new assertions:
  in-content `PageHeader`, the page-builder sub-toolbar, the right-docked panel, a
  non-button-control relight guard, the "Save only" no-publish badge, and the menu
  legacy-chrome guard; no `data-page-editor-*` hook assertion weakened).
- `bun run gates:coderso` — 5/5 (functional / ux / performance / security / reliability).
- Runtime-smoked: Pages + Page-Templates editors (`:5173`) match the prototype
  (`:5180`); menu designer unchanged. Real-input playwright check of swatch/URL/
  inline-mark focus in the re-docked panel.
