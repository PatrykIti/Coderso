# TASK-499-05: Menu Tests, Docs, Closure
# FileName: TASK-499-05-Menu-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Testing / Documentation / Content (Menus)
**Estimated Effort:** Medium
**Dependencies:** TASK-499-01, TASK-499-02, TASK-499-03, TASK-499-04
**Status:** ✅ Done
**Completed:** 2026-07-01
**Parent Task:** TASK-499

---

## Overview

Consolidate the cross-cutting test matrix, run the full gate, verify the runtime
end-to-end, and close TASK-499 (changelog + board/Statistics). This subtask owns
the regression-suite shape that PARTS 1+2 must not break — especially the
**byte-identical default-shell CSS** test and the **DnD/nesting** suites — and the
final doc-hygiene closure.

- **Goal:** all menu + page + site-shell suites green together; the byte-identity
  and DnD/nesting suites unchanged; runtime-smoked; changelog + board updated.
- **Out of scope:** new behavior (this is closure only).

---

## Security Contract

No code-behavior change. This subtask asserts the security invariants the prior
subtasks established: menuDocumentV2 is schema-first/reject-unknown/backward-
compatible; the front renders published-only; no new public write endpoint
(`document` rides `PATCH /menus/:id`; `openInNewTab` rides `replaceMenuItems`);
no DB migration. The closure must state explicitly that no new public surface was
added.

---

## Implementation Pseudocode (test + closure matrix)

### 1. Full regression matrix (must all be green together)

```
# PART 1 — items editor
tests/vitest/ui/menu-editor.test.tsx
tests/vitest/ui/menu-editor-shell-wave.test.tsx
tests/vitest/ui/menu-editor-validation.test.ts
tests/vitest/ui/menu-editor-refresh-policy.test.tsx
tests/vitest/ui/menu-tree.test.tsx                 # DnD intents + keyboard move/indent/outdent — DO NOT WEAKEN
tests/vitest/ui/menu-item-row.test.tsx             # DnD/keyboard/a11y assertions (drag-handle + Drag/Move/Indent/Outdent aria-labels, data-menu-nested-indent, drop-line markers, data-menu-row-active) — kept BYTE-STABLE; the non-prototype pure-VISUAL assertions (letter-avatar, text "Sub-item of X" :68) are REMOVED (not updated) — the prototype row (MenuEditorPreview.tsx:47-64) has NEITHER; the compacted row is bare GripVertical + CornerDownRight + pl-8 (499-01 "row fidelity" split)
tests/vitest/ui/menu-item-form.test.tsx            # MUST stay green: NO switch in MenuItemForm (Switch lives in the inspector wrapper)
tests/vitest/ui/menu-leaf-components.test.tsx
tests/vitest/ui/menu-list-page.test.tsx
tests/vitest/widgets/navigation.test.tsx           # exact meta toEqual (:816-851) stays green — menuSettingsToMeta OMITS default variant:"link"
tests/vitest/ui/navigation-editor-wave.test.tsx    # exact meta toEqual (:636-674) stays green — same conditional omission
tests/integration/runtime/site-shell-runtime.test.ts  # default/legacy header markup + appearance head CSS + no-menu case — DO NOT WEAKEN; home of the variant:"button" button-class render assertion
+ new EditorFrame render test

# PART 2 — schema + persistence + authoring + front
tests/vitest/services/menu-document-v2.test.ts     # new — write-strict/read-failclosed/leaf-reuse/version/legacy-adapter
tests/unit/menus/menuService.test.ts               # per-key document merge/publish; appearance/extras NOT dropped
tests/vitest/validation/menuSchemas.test.ts        # menuUpdateSchema accepts `document` (PART 2); menuItemsSchema settings accepts openInNewTab/variant, still reject-unknown (PART 1)
tests/integration/routes/menus.test.ts             # PATCH `document` round-trips the settings envelope (no appearance/extras dropped); :127/:151 toEqual locks updated
tests/vitest/admin/menusClient.test.ts             # updateMenu PATCH body forwards `document`
tests/vitest/pages/page-editor-host-contract.test.ts  # mode union loses "menu" — :18-20 MUST be edited to ["page","page-template"]
tests/vitest/ui/menu-design-editor-flow.test.tsx   # MUST-RETIRE/REWRITE (retirement OWNED by 499-03) — the 30KB TASK-458-03/495-02 suite: mounts MenuDesignEditorPage + a bare mode:"menu" PageEditorHost (:768) and asserts legacy dark chrome bg-slate-950 (:727/:793); once 499-03 drops "menu" from the mode union :768 fails lint:types AND the MenuDesignEditorPage assertions contradict the shared-shell rewrite — SUPERSEDED by the new menu-design-editor.test.tsx below; do NOT leave as an untracked breaking suite
tests/vitest/ui/menu-design-editor.test.tsx        # new — shared CanvasEditor chrome, NOT bg-slate-950; add/remove/reorder composer; SUPERSEDES menu-design-editor-flow.test.tsx
tests/unit/site/menu-document-render.test.tsx      # new — SiteHeaderMenuDocumentRender golden + nesting + openInNewTab
tests/vitest/site/page-runtime-shell-branch.test.tsx  # new — document-vs-default branch + renderPublicPage head-CSS gate (zero-items / migrated)
tests/integration/runtime/menu-design-extras-runtime.test.ts (+ document sibling)

# PRESERVED byte-identity + page-editor isolation
tests/unit/pages/siteShellCss.test.ts              # buildSiteShellCss(null) byte-identical — UNCHANGED, green
tests/vitest/pages/page-editor-*                    # MOST page-editor logic suites live here — green after mode==="menu" retirement
tests/vitest/ui/page-editor*.test.tsx + pageBuilder/*  # green after mode==="menu" retirement
tests/vitest/ui/page-templates-surface.test.tsx    # asserts host.canvasChrome is a fn (:229) + renders it (:238) — canvasChrome is RETAINED as a shared seam (499-03 §5), so GREEN UNCHANGED; would only red if canvasChrome were wrongly dropped from the host type
tests/vitest/services/normalize-menu-appearance.test.ts
tests/vitest/services/menu-nav-extras.test.ts      # back-compat render path (normalizeMenuNavExtras + buildSiteShellPreviewCss) AND the menuDesignDocument adapter describe (:104-154,:156-) stay GREEN UNCHANGED — menuDesignDocument.ts is DEFERRED dead code, NOT deleted (499-03 §5), so its imports keep resolving
```

### 2. Regression-test SHAPE the subtasks must preserve

- **Byte-identical default shell CSS:** keep `tests/unit/pages/siteShellCss.test.ts`
  asserting `buildSiteShellCss(null)` and the all-defaults model reproduce the
  legacy stylesheet exactly. The document path is additive (scoped under
  `[data-site-menu-doc]`), so this test changes by ZERO lines.
- **DnD + nesting suites:** keep `menu-tree.test.tsx` asserting `child|before|after`
  intent resolution + keyboard indent/outdent/move + parent reparent; the PART 1
  re-skin must keep these BEHAVIOR/a11y assertions byte-stable without edits. The
  row's non-prototype pure-VISUAL assertions (letter-avatar, the text "Sub-item of
  X" hint) are REMOVED (not updated) as the row is compacted toward the prototype
  (499-01 "row fidelity" split) — the prototype row (MenuEditorPreview.tsx:47-64)
  has NEITHER; the compacted row is bare GripVertical + CornerDownRight + pl-8 — a
  real fidelity move, not preserved-old chrome.
- **menuDocumentV2 strictness:** the new suite must assert reject-unknown
  (`menu_document_invalid` + `path`) AND fail-closed read AND leaf-validator reuse
  (button/image/divider/spacer inherit page validation).
- **Default-vs-custom front:** the branch test asserts empty ⇒ `SiteHeaderNav`,
  non-empty ⇒ `SiteHeaderMenuDocumentRender`, cleared ⇒ default.

### 3. Gate + runtime smoke

```
bun --cwd core lint
bun --cwd core lint:types
NODE_ENV=test vitest run --config vitest.config.ts        # full vitest lane
bun --cwd core test:bun                                    # bun lane
# gates:coderso (whatever the repo gate alias runs)
# runtime smoke (memory: local-cms-run-and-test):
#   coderso-dev-core-host ; admin http://coderso-a.localhost:5173/admin/menus
#   - PART 1: drag-nest an item, toggle Open-in-new-tab, Save+Publish
#   - PART 2: open Design, edit menu-bar surface + brand + nav-items, Save+Publish
#   - front :3000: empty Design ⇒ default header byte-identical; non-empty ⇒ custom menu w/ nesting; new-tab link opens _blank
```

### 4. Closure

- Add `_docs/_CHANGELOG/` entry for TASK-499 (link all 5 subtasks); state: no new
  public endpoint, no DB migration, byte-identity preserved, Option B chosen,
  thin-editor-on-shared-shell chosen, Posts/Categories disposition (from 499-01).
- Flip TASK-499 + subtasks to ✅ Done in `_docs/_TASKS/README.md` board +
  Statistics (closing agent only).
- Confirm `tests/vitest/ui/menu-design-editor-flow.test.tsx` (the 30KB TASK-458-03/
  495-02 suite) was RETIRED/REWRITTEN by 499-03 and SUPERSEDED by
  `menu-design-editor.test.tsx` (§1) — it is a KNOWN tracked retirement, not an
  inherited untracked breaking suite; the closure must not ship with its bare
  `mode:"menu"` host (:768) / `bg-slate-950` (:727) assertions still red.
- Note residuals if any (e.g. phase-2 `search`/`account`/`language` blocks,
  Posts/Categories rail, and `menuDesignDocument.ts` — left in place as deferred
  dead code to keep `menu-nav-extras.test.ts` green; unreferenced by production once
  the menu host stops hosting `PageEditor`, deletable once that suite is migrated)
  as follow-ups, not silent gaps. Also record the ONE deliberate PART 2 chrome-scope
  narrowing: the Design tab ships Undo/Redo + DeviceSwitcher + panel toggle, but the
  Pages **Layers** overlay is served by the `MenuBarPanel` "Blocks" list (shallow
  single-section menu doc), not a separate tree — a documented scope decision, not a
  dropped affordance (499-03 §1).

---

## Testing Requirements

- The full matrix in §1 green together (no suite weakened to fit).
- `bun --cwd core lint`, `bun --cwd core lint:types`, full vitest, `test:bun`,
  repo gate alias.
- Real-input runtime smoke per §3 (playwright real mouse+keyboard), not synthetic.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics (closing agent).
- `_docs/_CHANGELOG/` TASK-499 closure entry.
- Cross-link `menuDocumentV2` + default-fallback from `_docs/PAGE_MODEL.md` /
  TASK-455 site-shell notes if not already added by 499-02/04.
