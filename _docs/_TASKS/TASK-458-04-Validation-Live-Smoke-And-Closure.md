# TASK-458-04: Validation Live Smoke And Closure
# FileName: TASK-458-04-Validation-Live-Smoke-And-Closure.md

**Parent Task:** TASK-458
**Priority:** High
**Category:** Menus / Validation / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-458-01, TASK-458-02, TASK-458-03
**Status:** 🚧 In Progress
**Started:** 2026-06-13

---

## Overview

Close the family: full test lanes, live end-to-end smoke of all three owner
requirements, documentation, board, and changelog.

Live smoke MUST prove (owner acceptance):

1. **Restyle -> publish -> front reflects it:** open a menu's design view,
   change visible appearance (e.g. surface color, link hover color, item
   gap, font transform), save draft — front shell UNCHANGED (published
   snapshot still legacy); publish — front shell reflects the new look on
   multiple pages and at a mobile viewport (390px disclosure styled
   correctly). A second untouched/legacy menu site (or pre-publish state)
   renders byte-identical to the pre-family look.
2. **Settings section gone:** Settings -> Site no longer offers the shell
   section or nav entry; the "Site shell" dialog on the Menus list loads
   current values, saves a scoped change (swap navigation menu), and the
   front header swaps accordingly; `site_shell_*` validation errors surface
   in the dialog for a dangling id.
3. **Palette restricted:** in the menu design view, the command palette,
   ghost tiles, and add-beside offer ONLY the menu-extra blocks (button,
   image); a regular page editor in the same session still offers the full
   frozen catalog; the global `navigation` section remains non-insertable
   everywhere.

---

## Sub-Tasks

- [x] Full lanes: `bun run test:vitest`, Bun suites for menus/shell/pages
      runtime (env loaded), `bun --cwd core lint`, `bun --cwd core
      lint:types`, root `npx tsc -p tsconfig.json --noEmit`.
- [x] Migration check on the dev DB (menus.settings present, legacy rows
      null, no errors).
- [ ] Live smoke via `coderso-dev-core-host` + `playwright-cli` covering the
      three scenarios above; capture notes/screenshots under `.tmp/`.
- [x] Docs: `_docs/PAGE_MODEL.md`, `_docs/DATA_MODEL.md`,
      `_docs/ADMIN_CACHE.md`/`_docs/ADMIN_CACHE_MAP.md` (as touched),
      `docs/guide/` screens (Menus list dialog, design view, Settings page
      without shell).
- [ ] Board: mark family done in `_docs/_TASKS/README.md` + statistics;
      `_docs/_CHANGELOG/` entry (note the Settings shell-section REMOVAL as
      a deliberate owner-requested change and the byte-identity guarantee
      for legacy menus).

## Progress Notes

- 2026-06-13: Targeted Vitest, Bun route/runtime suites, lint, typecheck, root
  local `tsc`, DB reachability, `menus.settings` schema presence, and
  `bun run gates:coderso` passed. Live dev-host Playwright smoke remains the
  only closure blocker.
- 2026-06-13: Read-only drift audit found a real high-severity risk where
  design edits on an already-published menu could leak through the public
  shell before publish. Fixed by storing draft design at top-level
  `menus.settings` and public design under `menus.settings.published`; added
  menu service and runtime regression coverage.

---

## Implementation Pseudocode

```text
Smoke script shape (playwright-cli):
1. admin login -> /admin/menus -> "Site shell" dialog -> assert values load,
   swap navigation menu, save -> front "/" header shows the other menu.
2. /admin/settings/site -> assert no "shell" nav entry / section.
3. /admin/menus/:id -> "Design" -> change surfaceColor + itemGap -> save ->
   front unchanged -> publish -> front reflects (desktop + 390px).
4. design view: open command palette -> assert exactly the allowed blocks;
   ghost tile + add-beside -> same set. Open a page editor -> full catalog.
```

Expected data flow: validation consumes the artifacts of 01-03 unchanged; no
new code in this leaf beyond test/diagnostic fixes.

Error handling: any smoke failure routes back to the owning leaf; closure
blocked until all three scenarios pass in one session.

Regression-test shape: no new suites here beyond what 01-03 added; this leaf
runs them all plus the live pass.

---

## Security Contract

- **Endpoint visibility / Auth / RBAC / CSRF / rate-limit:** unchanged — this
  leaf adds no surface; it verifies the family's contracts (draft appearance
  never publicly rendered; CSS from clamped values only; settings keys still
  server-validated).
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- All lanes listed in Sub-Tasks, green in one run.
- Live smoke pass recorded with evidence under `.tmp/`.

---

## Documentation Updates Required

- All family docs (PAGE_MODEL, DATA_MODEL, cache maps, guide screens).
- `_docs/_TASKS/README.md` board + statistics; `_docs/_CHANGELOG/` entry on
  completion.
