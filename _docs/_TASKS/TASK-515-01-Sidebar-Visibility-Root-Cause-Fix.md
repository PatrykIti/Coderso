# TASK-515-01: Sidebar Visibility Root-Cause Fix — Drop The Editor-Capability Gate From The Custom-Screen Sidebar Shortcut Path

# FileName: TASK-515-01-Sidebar-Visibility-Root-Cause-Fix.md

**Parent Task:** TASK-515 (`TASK-515_Screens_Admin_Menu_Visibility_Fix.md`)
**Priority:** High
**Category:** Admin UI / Navigation / Custom Screens / Bug Fix
**Estimated Effort:** Small
**Dependencies:** none within TASK-515 (this is the keystone; 515-02 depends on it).
**Status:** ✅ Done

---

## Goal

Fix the reported bug: custom screens marked *"show in the admin left main menu"* (`showInSidebar`) do not appear unless they also happen to be **editor-mode** screens (blocks + a writable binding). Remove that undocumented editor-capability gate from **both** sidebar-shortcut code paths so **any Active + pinned screen** appears in the left menu (linking to its entries list) and shows the "In sidebar" badge on the list card — matching the prototype and the owner's maximum-configuration-flexibility mandate. Retain the `status === "active"` gate (draft = unpublished).

## Owned files (single writer)

- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `tests/vitest/admin/advanced-modules.test.ts` (add one builder test beside the existing `buildCustomScreenShortcutNavItems` test at `:155`; existing tests unchanged)
- one list-model regression case in `tests/vitest/ui/custom-screens-list-wave.test.tsx` (or a new focused `tests/vitest/ui/custom-screen-sidebar-shortcut-state.test.ts`)

`CustomScreenTable.tsx` / `CustomScreenEntriesPage.tsx` are **not** owned/edited — they read `sidebarShortcutState === "visible"` and inherit the fix. The only exception: if pruning the union member makes the TS compiler flag an exhaustive switch/narrowing in either consumer, apply the surgical follow-through here (none is expected — both use a plain `=== "visible"` equality, see `CustomScreenTable.tsx:89`, `CustomScreenEntriesPage.tsx:213`).

---

## Execution-ready contract

### A. `sidebarConfig.ts` — remove the editor gate from the nav builder

Current (`:144-160`):
```ts
export const buildCustomScreenShortcutNavItems = (
  screens: CustomScreenShortcutRecord[]
): NavItem[] =>
  screens
    .filter(
      (screen) =>
        screen.status === "active" &&
        screen.showInSidebar === true &&
        supportsDedicatedCustomScreenEditor(screen)   // <-- THE BUG: over-filters
    )
    .map((screen) => ({
      label: screen.sidebarLabel?.trim() || screen.name,
      href: `/admin/advanced/custom-screens/${encodeURIComponent(screen.id)}/entries`,
      icon: LayoutGrid,
      permission: "content:read",
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
```

Fixed:
```ts
export const buildCustomScreenShortcutNavItems = (
  screens: CustomScreenShortcutRecord[]
): NavItem[] =>
  screens
    // A pinned Active screen ALWAYS gets a sidebar shortcut, regardless of editor
    // capability. The shortcut targets the entries LIST view, which is valid for
    // every screen mode (collection-only / dashboard / editor); the per-entry
    // dedicated editor is a separate concern handled on the entries page.
    .filter((screen) => screen.status === "active" && screen.showInSidebar === true)
    .map((screen) => ({
      label: screen.sidebarLabel?.trim() || screen.name,
      href: `/admin/advanced/custom-screens/${encodeURIComponent(screen.id)}/entries`,
      icon: LayoutGrid,
      permission: "content:read",
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
```

Then **delete** the now-unused helper `supportsDedicatedCustomScreenEditor` (`:133-142`). Leave the `CustomScreenShortcutRecord` type import intact (still used for the parameter). Do NOT remove `capabilities`/`blocks`/`bindings` from the record type in `customScreenShortcutsClient.ts` (out of scope; other surfaces may read them) — only the local helper is dead.

**Data flow:** `AdminShell` (`:237-245`) already passes the cached shortcut list into this builder and appends the result after the "advanced" group via `appendNavItemsAfterGroup`; no AdminShell edit is needed.

### B. `customScreenListModel.ts` — collapse the list-card state + prune the dead union member

Current (`:14-17`, `:55-71`):
```ts
export type CustomScreenSidebarShortcutState = "visible" | "configured_after_activation" | "hidden";
export type CustomScreenSidebarShortcutStateV3 =
  | CustomScreenSidebarShortcutState
  | "requires_editor_setup";
...
export const resolveCustomScreenSidebarShortcutState = (
  screen: CustomScreenRecord
): CustomScreenSidebarShortcutStateV3 => {
  const capabilities = screen.capabilities ?? resolveCustomScreenCapabilities({ ... });
  if (!screen.showInSidebar) return "hidden";
  if (screen.status === "active" && capabilities.supportsDedicatedEditor !== true) {
    return "requires_editor_setup";                    // <-- THE BUG (list mirror)
  }
  if (screen.status === "active") return "visible";
  return "configured_after_activation";
};
```

Fixed:
```ts
export type CustomScreenSidebarShortcutState = "visible" | "configured_after_activation" | "hidden";
// V3 kept as an alias for source compatibility; the "requires_editor_setup" member
// is removed — no code produces it after the sidebar visibility fix (TASK-515).
export type CustomScreenSidebarShortcutStateV3 = CustomScreenSidebarShortcutState;
...
export const resolveCustomScreenSidebarShortcutState = (
  screen: CustomScreenRecord
): CustomScreenSidebarShortcutStateV3 => {
  if (!screen.showInSidebar) return "hidden";
  if (screen.status === "active") return "visible";     // any mode -> visible
  return "configured_after_activation";                 // pinned but still draft
};
```

Notes:
- The `capabilities`/`resolveCustomScreenCapabilities` computation in this function becomes **unused** for state resolution — remove the local `const capabilities = …` block (and the `resolveCustomScreenCapabilities` import if `resolveCustomScreenModeLabel` no longer needs it — it DOES at `:42-53`, so KEEP the import; only drop the now-dead local in `resolveCustomScreenSidebarShortcutState`).
- `CustomScreenListRow.sidebarShortcutState` (`:25`) stays typed `CustomScreenSidebarShortcutStateV3` (now === base) — no consumer change.
- Keep `resolveCustomScreenModeLabel` (`:42-53`) untouched — the "Workspace ready / Preview only / Setup required" mode label is a legitimately separate capability signal and is NOT the sidebar gate.

### C. Error handling / edge cases

- Malformed record: `customScreenShortcutsClient.ts:83` normalizes an absent/invalid `showInSidebar` to `false` → filtered out (fail-safe). No change.
- Empty list / permission-denied: `AdminShell` passes `[]` when `!canReadCustomScreens` (`:242`); builder returns `[]`. No change.
- Duplicate labels: sort is stable enough via `localeCompare`; unchanged.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Lane: Vitest (Bun-free — pure model/UI).** These modules are pure client TS/TSX with no Bun/DB/`Bun.serve` dependency, so they belong in the Vitest lane. Run `bun --cwd core lint:types` **and** root `tsc -p tsconfig.json --noEmit` (the union prune is a type change; per the typecheck-scope gotcha, the root tsc covers the tests/ tree that `--cwd core` misses).

1. **`tests/vitest/admin/advanced-modules.test.ts` — NEW test `buildCustomScreenShortcutNavItems includes pinned Active screens of every mode`, co-located beside the existing builder test at `:155`:**
   - import `buildCustomScreenShortcutNavItems` from `sidebarConfig` (this file already imports it at `:10`, so no new import wiring — this is its natural home; `admin-shell-nav.test.tsx` never imports the builder, it only feeds pre-built items to `SidebarNav`).
   - fixtures (as `CustomScreenShortcutRecord[]`): (a) Active + `showInSidebar` + **dashboard** (`capabilities.supportsDedicatedEditor:false`, read-only bindings) → **emitted**, href `/admin/advanced/custom-screens/<id>/entries`; (b) Active + `showInSidebar` + **collection-only** (no blocks/bindings, `supportsDedicatedEditor:false`) → **emitted**; (c) Active + `showInSidebar` + **editor** → **emitted** (regression baseline); (d) Active + `showInSidebar:false` → **dropped**; (e) **draft** + `showInSidebar:true` → **dropped**.
   - assert emitted labels honor `sidebarLabel?.trim() || name` and are sorted.
   - This is the guard that would have caught the original bug. The existing builder test at `:155` (`buildCustomScreenShortcutNavItems returns only active sidebar screens`) DOES exercise the filter directly, but its only Active + pinned fixture (`screen-b`) is **editor-mode** (a `readwrite` binding), so it passed both before and after the fix and never covered the non-editor Active+pinned case — which is precisely why the bug slipped through. Fixtures (a)/(b) above close that gap.

2. **List-model regression** (extend `tests/vitest/ui/custom-screens-list-wave.test.tsx`, or new focused file): `resolveCustomScreenSidebarShortcutState` returns `"visible"` for an Active + `showInSidebar` + **read-only-binding (dashboard)** `CustomScreenRecord` (previously `"requires_editor_setup"`); `"hidden"` for `showInSidebar:false`; `"configured_after_activation"` for draft + pinned. Assert the literal `"requires_editor_setup"` no longer appears anywhere in the module (grep-style / type-level: assigning it is now a TS error).

3. **Existing-test verification (shared-DB-safe; these are pure render/model tests, no DB):**
   - `tests/vitest/admin/advanced-modules.test.ts:155` (`buildCustomScreenShortcutNavItems returns only active sidebar screens`) — the one existing test that exercises the builder's filter directly. Confirm it stays green: its only Active + pinned fixture (`screen-b`) is editor-mode (`readwrite` binding), so it was emitted before and after the fix; `screen-a` (draft) and `screen-c` (`showInSidebar:false`) stay dropped, so `toHaveLength(1)` still holds. (It lacks an Active + pinned + non-editor fixture, which is exactly why it never caught the bug — the new test in item 1 supplies that coverage.)
   - `tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx` — must stay green: its active fixture has a `readwrite` binding (editor mode) so it was already `"visible"`; the draft fixture stays `"hidden"`. Confirm no assertion breaks.
   - `tests/vitest/ui/custom-screens-list-wave.test.tsx:482` — the `"configured_after_activation"` fixture (draft + pinned) is unchanged by this fix; confirm green.
   - `tests/vitest/ui/admin-shell-nav.test.tsx:408-449` — unaffected (they bypass the builder, feeding pre-built items straight to `SidebarNav`).

**Shared-DB safety:** all tests in this subtask are Vitest pure-render/model with no Postgres access — no smoke-DB pollution risk. (The live end-to-end smoke lives in 515-02.)

---

## UI/UX-fidelity & max-config-flexibility notes

- Removing the editor gate is the flexibility win: the user's explicit "show in left menu" choice is now honored for **every** screen mode, exactly as the prototype's unconditional "In sidebar" badge implies (`_docs/_PROTOTYPE/src/pages/advanced/CustomScreensPage.tsx:57-60`).
- No new controls, tokens, or layout: the badge (`success` variant + `PanelLeft`) and "Open" button already exist and now light up for all Active+pinned screens.
- The sidebar item uses the existing `LayoutGrid` icon + `sidebarLabel || name` label + `/entries` href — no new UX surface.

## Definition of Done

- Both gates removed; dead helper + dead union member pruned; all owned tests pass.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root `tsc -p tsconfig.json --noEmit`, and the affected Vitest files green.
- Lands before 515-02 opens.
