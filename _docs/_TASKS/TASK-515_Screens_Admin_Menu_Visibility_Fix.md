# TASK-515: Screens — Admin Left-Menu Visibility Bug & Fixes — Pinned Custom Screens Silently Dropped From The Sidebar Unless They Have A Writable-Binding Editor

# FileName: TASK-515_Screens_Admin_Menu_Visibility_Fix.md

**Parent Task:** TASK-515 (board umbrella)
**Priority:** High
**Category:** Admin UI / Navigation / Custom Screens / Bug Fix
**Estimated Effort:** Small
**Dependencies:** TASK-468 (custom screens V4 model + `capabilities.ts` mode/editor resolution), TASK-474 (custom-screen list card + workspace/entries route parity), TASK-479-14 (soft-card list restyle + `resolveCustomScreenSidebarShortcutState`-derived "In sidebar" badge). Rides the existing validated `GET /custom-screens` read path — NO new route, RBAC, endpoint, schema column, or migration.
**Status:** ⏳ To Do

---

## Overview

**Owner-reported BUG:** custom screens the user explicitly marks *"show in the admin left main menu"* (the `showInSidebar` toggle) do **NOT** appear in the sidebar, even when the screen is **Active**. Root cause is a **third, undocumented gate** layered on top of the user's intent: the sidebar-shortcut path silently requires the screen to also be an **editor-mode** screen (`capabilities.supportsDedicatedEditor === true` — i.e. it must have blocks **AND at least one WRITABLE binding**). A read-only **dashboard** screen (blocks + read-only bindings) or a **collection-only** screen is dropped from the menu with no error and no feedback — directly contradicting the owner mandate of *maximum configuration flexibility*.

### Root cause — traced from model → nav builder → rendered sidebar (file:line evidence)

The `showInSidebar` flag is correctly authored, validated, persisted and returned:

1. **Schema (present).** `core/db/schema.ts:736-737` — `custom_screens.show_in_sidebar boolean NOT NULL DEFAULT false` + `sidebar_label text`, with `custom_screens_sidebar_idx` (`:752`). **No column is missing — no migration is needed.**
2. **Write path (correct).** `customScreenCreateSchema`/`customScreenUpdateSchema` allow-list `showInSidebar`/`sidebarLabel` (`core/services/customScreens/customScreenSchemas.ts:2562-2570, 2588-2596`) and `normalizeCustomScreenSidebarConfig` (`:2101-2111`) normalizes them; the create drawer (`CustomScreenCreateDrawer.tsx:57-86`) and editor (`CustomScreenEditorPage.tsx:240-301`) both wire the toggle + label.
3. **Read path (correct).** `listCustomScreens()` (`core/services/customScreens/customScreenService.ts:173-179` → `mapCustomScreenRecord` `:142-148`) returns `showInSidebar`, `sidebarLabel`, `blocks`, `bindings`, and a computed `capabilities` object per row; `GET /custom-screens` (`core/server/routes/customScreenRoutes.ts:106-111`) returns `{ items }`; the admin client `listCustomScreenShortcutsCached` (`core/admin/services/customScreenShortcutsClient.ts:112-132`) validates + normalizes them and `AdminShell` (`core/admin/ui/layouts/AdminShell.tsx:206-245`) feeds them to the nav builder.
4. **THE BUG — the nav builder over-filters.** `buildCustomScreenShortcutNavItems` (`core/admin/ui/navigation/sidebarConfig.ts:144-160`) filters with **three** predicates:
   ```ts
   screen.status === "active" && screen.showInSidebar === true && supportsDedicatedCustomScreenEditor(screen)
   ```
   The third — `supportsDedicatedCustomScreenEditor` (`sidebarConfig.ts:133-142`) — resolves to `capabilities.supportsDedicatedEditor`, which (`core/services/customScreens/capabilities.ts`) is `true` only when `mode === "editor"`, i.e. **hasBlocks && hasWritableBindings**. A pinned Active *dashboard* screen (read-only bindings) or *collection-only* screen is therefore dropped.
5. **The list page mirrors the same wrong gate.** `resolveCustomScreenSidebarShortcutState` (`core/admin/ui/custom-screens/customScreenListModel.ts:55-71`) returns `"requires_editor_setup"` for `status==="active" && supportsDedicatedEditor !== true`, so those cards render **without** the "In sidebar" badge (`CustomScreenTable.tsx:89, 124-128`) and with the "Entries" (not "Open") button (`:167`) — the same lie, on the list surface.

**LIVE-VERIFIED** against `coderso-a.localhost:5173` (`GET /admin/api/custom-screens`, session `wf515author`, 2026-07-05): of four Active + `showInSidebar:true` screens, only the ONE editor-mode screen ("House Projects", 1 writable binding, `mode:editor`) appears in the sidebar; three `mode:dashboard` screens (`182ed1c0`, `12b86d5f`, `a3f06199`, 10 read-only bindings each, all `showInSidebar:true`, all Active) are silently absent. Screenshot: `_docs/_workflows/_smoke/wf515-admin-custom-screens.png` (only "House Projects" under "PUBLISHED SCREENS"). Prototype reference (`_docs/_workflows/_smoke/wf515-proto-custom-screens.png`, `http://localhost:5180/#/advanced/custom-screens`): every published screen shows the green "In sidebar" badge regardless of editor capability — the prototype has NO editor-capability gate on sidebar publication.

### The fix (minimal, correct)

**Drop the `supportsDedicatedEditor` gate from the sidebar-shortcut path.** Any screen that is **Active AND `showInSidebar:true`** appears in the left menu, linking to its **entries list** (`/advanced/custom-screens/:id/entries` — `buildCustomScreenWorkspacePath`, `core/admin/ui/custom-screens/routeParams.ts:28-34`). The entries/list view is valid for **every** screen mode (it lists the bound content type's entries; the per-entry *dedicated editor* is a separate concern handled by `rowClickMode`/classic-editor fallback on the entries page — it never gated the list route). The `status === "active"` gate is **retained** (draft = unpublished; the create drawer already documents "draft won't show", `CustomScreenCreateDrawer.tsx:207-209`).

### Prototype-fidelity note

The current list card (`CustomScreenTable.tsx:120-170`) already faithfully reproduces the prototype `CustomScreensPage.tsx` structure (PageHeader, soft card grid, "In sidebar" `success`/`PanelLeft` badge, blocks/bindings meta, Edit + Open/Entries footer). The ONLY fidelity defect is the badge/button being suppressed for non-editor pinned screens — which this fix corrects (badge + "Open" now show for every Active + pinned screen, matching the prototype's unconditional "In sidebar" badge). No new markup, tokens, or layout work is required.

---

## Gap summary (prototype vs current)

| Aspect | Prototype (`:5180`) | Current admin (`:5173`) | Action |
|---|---|---|---|
| Pin screen to left menu | "In sidebar" badge on every published screen; no editor requirement | Pinned Active screen appears ONLY if it is editor-mode (writable binding); dashboard/collection-only silently dropped | **515-01** remove the `supportsDedicatedEditor` gate |
| List-card "In sidebar" badge | Shown for all published | Suppressed for pinned non-editor screens (`"requires_editor_setup"`) | **515-01** collapse state to `"visible"` for Active+pinned |
| Entries link target | Open | `/…/entries` (works for all modes) — already correct | keep |
| Card layout / tokens | soft cards, badge, meta, dual footer | matches | keep (no fidelity work) |

## Schema-extension plan

**NONE.** `show_in_sidebar` + `sidebar_label` already exist (`schema.ts:736-737`) with an index. No DDL, no snapshot/journal, no `schemaVersion` bump, no route/RBAC change. This is a pure client-side read-filter correction.

---

## Sub-Tasks

| ID | Title | File | Status |
|----|-------|------|--------|
| TASK-515-01 | Sidebar Visibility Root-Cause Fix (nav builder + list-model state) + regression tests | `TASK-515-01-Sidebar-Visibility-Root-Cause-Fix.md` | ⏳ To Do |
| TASK-515-02 | Screens Sidebar — Live Smoke, Docs & Closure | `TASK-515-02-Screens-Sidebar-Tests-Docs-Closure.md` | ⏳ To Do |

### Land order & single-writer ownership (strictly sequential — each lands green before the next opens)

1. **515-01 (the fix + focused regression tests)** — **sole writer of** `core/admin/ui/navigation/sidebarConfig.ts` and `core/admin/ui/custom-screens/customScreenListModel.ts`. Removes the editor gate from `buildCustomScreenShortcutNavItems`; collapses `resolveCustomScreenSidebarShortcutState` so `status==="active" && showInSidebar` → `"visible"` (prunes the now-dead `"requires_editor_setup"` member from `CustomScreenSidebarShortcutStateV3`). Adds regression unit tests. Verifies existing tests stay green.
2. **515-02 (closure)** — the ≥5-scenario **live playwright SMOKE**, docs, changelog **1223** (verify fresh at closure), board/Statistics rows → Done. Authors NO production code and NO `sidebarConfig.ts`/`customScreenListModel.ts` edits.

Single-writer map: **`sidebarConfig.ts` = 515-01**, **`customScreenListModel.ts` = 515-01**, **regression unit tests = 515-01**, **live smoke + docs + changelog + board = 515-02**. Every production file has exactly one owner. `CustomScreenTable.tsx` and `CustomScreenEntriesPage.tsx` need **no source edits** (they already read `sidebarShortcutState === "visible"` — the fix flows through them), but this flow-through is NOT behavior-neutral on the entries page: because `CustomScreenEntriesPage.tsx:213` derives `isSidebarPublished` from the same corrected state, a newly-visible dashboard/collection-only screen's page-header badge flips grey "Not in sidebar" → green "Published / In sidebar" (`:641-651`) — an intended parity effect that 515-02 must assert (see Hard Invariant #6), not an invisible inheritance. If 515-01 elects to prune the union member and the TS compiler flags a narrowed switch/exhaustiveness in either consumer, that surgical follow-through is 515-01's (documented in its file), still under a single sequential land.

---

## Security Contract

**Read-path client filter correction only — no route/RBAC/endpoint/schema/migration touched.** Verified against source:

- **Route (existing, unchanged).** `GET /custom-screens` (`customScreenRoutes.ts:106`) is already `requirePermission("content:read")`-gated and returns the full record set. This task changes ONLY how the already-authorized client renders that list; no new endpoint/method/RBAC bucket, no payload-shape change.
- **No privilege widening.** The sidebar nav item and the entries route it targets are both already `content:read`-gated (`sidebarConfig.ts:158` `permission: "content:read"`; `AdminShell.tsx:159` `canReadCustomScreens = canAccess("content:read")`). Making an *already-authorized, already-listed, already-pinned* screen visible in the menu exposes nothing the user could not already reach via the Screens list "Entries" button. RBAC surface is byte-unchanged.
- **No new validated keys.** `showInSidebar`/`sidebarLabel` are already in the create/update allow-lists and the client validator (`customScreenShortcutsClient.ts:60-85`); no schema-first/reject-unknown addition is required and none is made.
- **No cache contract change.** The `cacheKeys.customScreensList` memory-backed cache and its `subscribeCacheEvents` invalidation (`AdminShell.tsx:220-228`) are unchanged; the fix operates purely on the derived nav items computed from the cached list.
- **Fail-safe read.** The nav builder continues to `.filter` defensively (a malformed/absent `showInSidebar` normalizes to `false` at `customScreenShortcutsClient.ts:83`), so the change cannot surface an unintended screen.

No auth/nonce/HMAC/reCAPTCHA change: no write path is added or loosened.

---

## Hard Invariants (each a named guard in 515-01/02)

1. **Pinned Active screens ALWAYS appear — regardless of editor capability.** `buildCustomScreenShortcutNavItems` emits a nav item for every `status==="active" && showInSidebar===true` screen (dashboard, collection-only, and editor modes alike); the item targets `/…/:id/entries`.
2. **Draft screens NEVER appear.** The `status === "active"` gate is retained; a pinned Draft screen stays out of the menu (matches the create-drawer contract + prototype).
3. **List-card badge parity.** `resolveCustomScreenSidebarShortcutState` returns `"visible"` for every Active+pinned screen so the "In sidebar" badge + "Open" button render for all modes (prototype fidelity); `showInSidebar===false` → `"hidden"`; draft+pinned → `"configured_after_activation"` (unchanged).
4. **Dead-state pruned cleanly.** `"requires_editor_setup"` is removed from `CustomScreenSidebarShortcutStateV3` (no code produces it); consumers referencing only `"visible"` compile unchanged.
5. **No behavior change for editor-mode or unpinned screens** — existing green tests (`advanced-modules.test.ts` — incl. the existing builder test `buildCustomScreenShortcutNavItems returns only active sidebar screens` at `:155`, whose only Active+pinned fixture `screen-b` is editor-mode so it stays emitted, keeping `toHaveLength(1)` — plus `custom-screen-list-restyle.test.tsx`, `custom-screens-list-wave.test.tsx`, `admin-shell-nav.test.tsx`) stay green (editor-mode active+pinned was already `"visible"`; unpinned still `"hidden"`).
6. **Entries-page header badge flips to "Published / In sidebar" for newly-visible screens (EXPECTED PARITY EFFECT, not a no-op inheritance).** `CustomScreenEntriesPage.tsx:213` derives `isSidebarPublished = sidebarShortcutState === "visible"` from the SAME `resolveCustomScreenSidebarShortcutState(screen)` this fix corrects, so for an Active + `showInSidebar` **dashboard/collection-only** screen the page-header badge (`:641-648`) changes from the grey `secondary` "Not in sidebar" Badge to the green `success` "Published" Badge, and the meta text (`:651`) gains the `"In sidebar · "` prefix. This is the desired, on-message result (the page now truthfully reflects that the screen IS in the sidebar) — `CustomScreenEntriesPage.tsx` still needs **no source edit** (it reads the state for free), but the effect is intentional and MUST be asserted in the 515-02 smoke, not treated as "nothing else changes". Editor-mode + unpinned + draft screens' badges are unchanged.
7. **NO schema/route/RBAC/migration/`schemaVersion` change.**

---

## Acceptance Criteria (measured LIVE, not synthetic-only)

1. **The reported bug is fixed.** On `coderso-a.localhost:5173`, a screen that is Active + "show in left menu" appears under "Published screens" in the sidebar **even with only read-only bindings / no writable editor** — verified with the three live `mode:dashboard` screens that are currently absent.
2. **Draft pinned screen stays hidden.** Setting a screen to Draft removes it from the sidebar; re-activating restores it (no refresh required beyond the existing cache-event invalidation).
3. **List-card fidelity.** Every Active+pinned card shows the green "In sidebar" badge + "Open" button (matching the prototype), including dashboard/collection-only screens.
4. **Navigation works + entries-page badge parity.** Clicking a newly-visible sidebar item lands on that screen's entries list and renders it correctly for a read-only/dashboard screen, AND the entries-page header shows the green `success` "Published" badge with the "In sidebar · " meta prefix (`CustomScreenEntriesPage.tsx:641-651`) — no longer the grey "Not in sidebar" badge. The 515-02 smoke scenario that opens the entries page asserts this badge/text, not merely that the list renders.
5. **No regression** for editor-mode, unpinned, or draft screens.
6. Full gates green: `bun --cwd core lint`, `bun --cwd core lint:types`, root `tsc -p tsconfig.json --noEmit`, `test:bun`, full vitest, `gates:coderso`.

---

## Coordination / changelog pin

- **Changelog (closure only): 1223** (verify it is still the next free number at closure).
- Board rows (parent + 2 children) and Statistics are added by the orchestrator — this task does **not** edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*`.
- Isolate implementation on a separate worktree; scope commits to files this task owns.

---

## Affected Files (grounded)

- `core/admin/ui/navigation/sidebarConfig.ts` — remove `supportsDedicatedCustomScreenEditor` (`:133-142`) from the `buildCustomScreenShortcutNavItems` filter (`:144-160`) so the predicate becomes `status==="active" && showInSidebar===true`; delete the now-unused helper + any now-unused imports (`CustomScreenShortcutRecord.capabilities`/`blocks`/`bindings` are still typed on the record, only the helper is removed). (515-01)
- `core/admin/ui/custom-screens/customScreenListModel.ts` — remove the `"requires_editor_setup"` branch from `resolveCustomScreenSidebarShortcutState` (`:66-68`) so Active+pinned → `"visible"`; prune `"requires_editor_setup"` from `CustomScreenSidebarShortcutStateV3` (`:14-17`) and repoint `CustomScreenListRow.sidebarShortcutState` (`:25`) to the base union. (515-01)
- `tests/vitest/admin/advanced-modules.test.ts` — NEW unit test exercising `buildCustomScreenShortcutNavItems` directly (dashboard/collection-only Active+pinned → emitted; draft+pinned → dropped; unpinned → dropped), co-located beside the existing builder test at `:155` (this file already imports the builder; `admin-shell-nav.test.tsx` never imports it — it only feeds pre-built items to `SidebarNav`). (515-01)
- `tests/vitest/ui/custom-screens-list-wave.test.tsx` (or a focused list-model test) — NEW case: Active + `showInSidebar` + read-only-binding (dashboard) screen → `resolveCustomScreenSidebarShortcutState === "visible"` + card shows "In sidebar". (515-01)
- live playwright smoke + `_docs/*` docs + `_docs/_CHANGELOG/` (1223) + board/Statistics. (515-02)
