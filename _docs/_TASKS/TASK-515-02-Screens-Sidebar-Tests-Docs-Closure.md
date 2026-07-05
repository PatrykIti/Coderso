# TASK-515-02: Screens Sidebar — Live Smoke, Docs & Closure

# FileName: TASK-515-02-Screens-Sidebar-Tests-Docs-Closure.md

**Parent Task:** TASK-515 (`TASK-515_Screens_Admin_Menu_Visibility_Fix.md`)
**Priority:** High
**Category:** Admin UI / Navigation / Custom Screens / QA / Docs
**Estimated Effort:** Small
**Dependencies:** TASK-515-01 (must be landed green — this subtask verifies its runtime effect, does NOT author production code).
**Status:** ⏳ To Do

---

## Goal

Prove the sidebar-visibility fix works end-to-end against the running app with a ≥5-scenario live playwright smoke (owner mandate: real-flow scenarios asserting VISIBLE EFFECT, not control presence), update the docs, add the changelog entry, and close the board.

## Owned files (single writer)

- `_docs/CUSTOM_SCREENS.md` (or the canonical custom-screens spec — verify the exact filename at impl; grep `_docs` for the custom-screens doc) — document the sidebar-publication contract.
- `_docs/_CHANGELOG/1227-2026-…-task-515-screens-admin-menu-visibility-fix.md` (verify 1227 is still the next free number at closure).
- `_docs/_TASKS/README.md` board rows + Statistics (**parent + 2 children To Do → Done at closure**) — *if the orchestrator has not already added them; do not duplicate rows.*
- smoke screenshots under `_docs/_workflows/_smoke/` (`wf515-*.png`).

Authors **NO** production code and does **NOT** edit `sidebarConfig.ts` or `customScreenListModel.ts`.

---

## Live SMOKE — ≥5 distinct real-flow scenarios (owner mandate)

Run real-input playwright (`playwright-cli`, unique session e.g. `-s=wf515smoke`, default chromium) against the running admin `http://coderso-a.localhost:5173/admin/` (login with `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`; if the admin is a white page, restart `coderso-dev-core-host` and gate on `:5173 == 200`). Assert VISIBLE EFFECT (the sidebar item's presence/href, the badge, the rendered target page), not merely control existence. Save before/after screenshots to `_docs/_workflows/_smoke/`.

1. **The reported bug is fixed (dashboard screen appears).** Pick an existing Active + `showInSidebar:true` **dashboard-mode** screen (read-only bindings, `capabilities.supportsDedicatedEditor:false` — the live DB has `182ed1c0`/`12b86d5f`/`a3f06199`; verify via `GET /admin/api/custom-screens`). Assert it now renders as a sidebar item under "Published screens" with href `…/advanced/custom-screens/<id>/entries` and its `sidebarLabel || name` label — where before the fix it was absent. (Deep-nesting/every-control-visible-effect coverage: exercise all three currently-absent screens.)

2. **Collection-only pinned screen appears.** Create (or activate) a **collection-only** screen (no blocks / no writable binding), toggle "show in left menu" ON, set status Active. Assert it appears in the sidebar and the list card shows the green "In sidebar" badge + "Open" button (prototype parity). Compare side-by-side with the prototype card at `http://localhost:5180/#/advanced/custom-screens`.

3. **Draft stays hidden; activate → appears (override/reset cycle).** Take a pinned screen, set it to **Draft** → assert it disappears from the sidebar and the list card shows the draft/"configured after activation" treatment (no "In sidebar" badge); flip back to **Active** → assert it reappears without a manual page reload (the existing `subscribeCacheEvents` invalidation on `cacheKeys.customScreensList` re-derives the nav). Toggle `showInSidebar` OFF → item disappears; ON → reappears.

4. **Navigation target renders for a non-editor screen.** Click a newly-visible dashboard/collection-only sidebar item → assert it lands on `…/entries` and the entries LIST renders correctly (rows/empty-state, not a crash), proving the `/entries` route is valid for non-editor modes.

5. **No regression for editor-mode / unpinned screens (every-control cross-check).** Assert an editor-mode Active+pinned screen ("House Projects") still appears exactly once (no duplicate); an unpinned Active screen is still absent; the active sidebar item highlights correctly when its entries page is open. Include a publish→front sanity note (custom screens are admin-only surfaces — confirm no unintended public-front leakage).

Capture `wf515-admin-sidebar-before.png` / `wf515-admin-sidebar-after.png` and a prototype parity shot.

---

## Docs

- Custom-screens spec: document that a screen appears in the admin left main menu iff **`status === "active"` AND `showInSidebar === true`** — with **no editor-capability requirement** (any mode: collection-only, dashboard, editor). Note the shortcut targets the entries list view and that draft+pinned is a valid "will publish on activation" state. Record the removed `"requires_editor_setup"` state as an intentional simplification.
- Changelog `1227`: list TASK-515 + both leaves (515-01/02), the root cause (editor-capability gate over-filtering the `showInSidebar` intent in `sidebarConfig.ts` + `customScreenListModel.ts`), the file:line evidence, and the minimal fix. Note NO schema/route/RBAC/migration change.

## Board

- Ensure parent + 2 child rows exist in `_docs/_TASKS/README.md` (added by orchestrator; do not duplicate); flip all three to **Done** at closure with the completion date; bump Statistics accordingly.

---

## Gates (all green before closure)

- `bun --cwd core lint`, `bun --cwd core lint:types`, root `tsc -p tsconfig.json --noEmit`
- `test:bun` (note: a full `bun test` clicks through the config wizard / can hit the known smoke-DB transient — re-run named files in isolation to confirm 0 real failures)
- full Vitest (re-run any spuriously-timing-out files by name)
- `gates:coderso` (5/5)
- Live smoke 5/5 with screenshots committed under `_docs/_workflows/_smoke/`.

## Definition of Done

- Smoke 5/5 green with evidence; docs + changelog 1227 written; board + Statistics → Done; all gates green.
