# TASK-499: Menu Editor Remediation — Items Restyle + Design Tab (menuDocumentV2)
# FileName: TASK-499_Menu_Items_Restyle_And_Design_Tab_MenuDocumentV2.md

**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Visual Refresh / Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-006 (menus), TASK-455 (site shell), TASK-458-02/03 (menu appearance + nav extras), TASK-479 (admin redesign), TASK-495/496 (shared `CanvasEditor` builder chrome)
**Status:** ⏳ To Do

---

## Overview

Two-part remediation of the Menus admin, kept on two distinct surfaces that the
data model already separates cleanly:

| Part | Surface | Route | Edits | Storage |
|---|---|---|---|---|
| **PART 1** | Items/Routes editor | `/menus/:id` (`MenuEditorPage.tsx`) | the item tree (positions, nesting, per-item settings) | relational `menu_items` via `replaceMenuItems` |
| **PART 2** | "Design" tab | `/menus/:id/design` (`MenuDesignEditorPage.tsx`) | a Pages-like canvas overriding the menu's appearance + composition | `menus.settings` jsonb envelope (`document` key) |

**PART 1** re-skins the items editor to the prototype's three-pane
`EditorPreviewFrame` (chrome bar + typed "Add items" rail + dotted canvas of
compact rows + always-on "Item settings" inspector), **preserving** the live
DnD drop-intents, keyboard move/indent/outdent, parent reparent, and
Save/Publish/Discard lifecycle. It adds one real model field, `openInNewTab`.

**PART 2** flips the Design tab off the legacy dark-panel chrome onto the
shared `CanvasEditor` builder shell and replaces the fixed appearance+2-block
extras adapter with a real, composable **menuDocumentV2** of menu-adapted
sections/blocks — keystone: a `nav-items` "positions" block that BINDS the
published item tree with nesting. A document-driven front renderer falls back to
today's `SiteHeaderNav` default whenever the Design document is empty (the
`buildSiteShellCss(null)` byte-identity contract is preserved).

### Owner decision — Option B (dedicated `menuDocumentV2`)

PART 2 uses a **NEW `core/services/menus/menuDocumentV2.ts`** with its OWN
section/block enums and its OWN `MENU_DOCUMENT_SCHEMA_VERSION`, reusing ONLY the
shared leaf validators (button / image / divider / spacer / block style /
visibility / box-spacing) and the existing `normalizeMenuAppearance` field
validators. The page schema (`pageDocumentV2.ts`) is **NOT** polluted with menu
types (Option A from the plan is explicitly rejected). See TASK-499-02 §"Why
Option B".

### Decision — how the Design tab gets a Pages-identical editor

**A thin `MenuDesignEditor` reusing the shared shell** (`core/admin/ui/shared/CanvasEditor.tsx`)
plus the floating control primitives (`core/admin/ui/pages/editorControls/*`),
**NOT** a generalization of `PageEditor` over a document contract. Lower-risk
justification (full argument in TASK-499-03 §1):

- `PageEditor.tsx` (~4.9k lines) is statically and deeply bound to
  `pageDocumentV2`: the page block/section enums, the per-type
  capability/prop/default tables, the per-`PageBlockType` registry control
  panels, the inline rich-text mark pipeline, runtime preview tokens, command
  palette, layers, and autosave. Generalizing it over a second document type
  with disjoint enums is a cross-cutting refactor whose blast radius is the
  entire Pages editor (the product's most-used surface). High risk.
- `CanvasEditor.tsx` is ALREADY a presentational, host-agnostic shell (Pages,
  Page Templates, Screens) explicitly built for reuse; `editorControls/*` are
  presentation-only. A menu document is small and shallow (one `menu-bar`
  section, a handful of blocks, single dropdown depth bound from the item tree —
  not arbitrary page nesting), so a thin `MenuDesignEditor` is materially less
  code and its regressions are ISOLATED to the menu surface — they cannot reach
  Pages. The "identical editor" feel comes from reusing the SAME shell chrome +
  the SAME control primitives over the menu-scoped document engine.
- This also cleanly retires the `editorHost.mode === "menu"` legacy-chrome magic
  string from `PageEditor` (its ONLY consumer is the menu design host), without
  touching the page / page-template hosts.

---

## Architecture (files to add / change)

```
PART 1 — items editor restyle
  ADD    core/admin/ui/shared/EditorFrame.tsx            (frame wrapper ONLY — port of EditorPreviewFrame's chrome/three-panes; REUSES the shipped EditorRail.tsx primitives, does NOT fork them)
  EDIT   core/admin/ui/shared/EditorRail.tsx             (REUSE shipped TASK-497-02 (B9) EditorRailGroup + EditorRailItem; EXTEND so disabled/title-bearing items route to the <button> branch + gain disabled styling — else handler-less deferred Posts/Categories items drop to the live-looking <div> branch)
  EDIT   core/admin/ui/menus/MenuEditorPage.tsx          (frame chrome inside AdminShell; typed rail; always-on inspector owns the Open-in-new-tab Switch)
  EDIT   core/admin/ui/menus/MenuItemRow.tsx             (compact TOWARD the prototype: bare size-4 grip, drop letter-avatar + text "Sub-item of X" hint; KEEP drag handle/keyboard toolbar/CornerDownRight/RowDropIndicator a11y markers — gated)
  EDIT   core/admin/ui/menus/MenuItemForm.tsx            (thread openInNewTab/variant VALUES + Display-as variant segmented; advanced demoted; NO Switch here — inspector owns it, keeps menu-item-form.test.tsx green)
  EDIT   core/admin/ui/menus/MenuItemDrawer.tsx          (inspector reuse)
  EDIT   core/services/menus/menuItemSettings.ts         (+ openInNewTab, + variant; fail-soft)
  EDIT   core/server/validation/menuSchemas.ts           (menuItemsSchema settings allowlist += openInNewTab/variant — else the PUT body 4xx's before replaceMenuItems)
  EDIT   core/services/navigation/navigationMenuMapping.ts (settings -> meta target "blank" + variant "button", omitting default "link")
  EDIT   core/widgets/core/navigation.tsx                (NavigationItemMeta.variant? — SOLE definition here; normalizeNavigationItemMeta/navigationSchema unchanged)
  EDIT   core/site/siteShell.tsx                         (SiteNavItem button class ONLY — reads meta.variant; does NOT own NavigationItemMeta)
  (AdminShell is CONSUMED as the outer wrapper, not edited)

PART 2 — Design tab = menuDocumentV2 on the shared shell
  ADD    core/services/menus/menuDocumentV2.ts           (own enums + MENU_DOCUMENT_SCHEMA_VERSION + normalizers)
  EDIT   core/services/menus/normalizeMenuAppearance.ts  (MenuSettings.document; export a public color validator)
  EDIT   core/services/menus/menuService.ts              (UpdateMenuInput.document; per-key merge/publish; resolvePublishedMenuDocument wiring)
  ADD    core/admin/ui/menus/MenuDesignEditor.tsx        (thin shell editor over menuDocumentV2)
  EDIT   core/admin/ui/menus/MenuDesignEditorPage.tsx    (render MenuDesignEditor; drop PageEditor menu host)
  EDIT   core/admin/services/menusClient.ts              (updateMenu input + PATCH body forward `document`)
  EDIT   core/admin/ui/pages/PageEditor.tsx              (retire mode === "menu" legacy-chrome branch)
  EDIT   core/admin/ui/pages/editor/pageEditorHostContract.ts (drop "menu" from the mode union, :178)
  EDIT   core/site/siteShell.tsx                         (+ SiteHeaderMenuDocumentRender; + navigationDocument prop)
  ADD    core/site/menuDocumentCss.ts                    (scoped CSS for the menu document; never alters buildSiteShellCss)
  EDIT   core/site/pageRuntimeV2.tsx                     (DefaultRuntimePageShellV2 fallback branch)
  EDIT   core/site/renderPublicPage.tsx                  (hasSiteShell incl. navigationDocument; base-only head CSS when document active, :375-380)
  EDIT   core/server/publicSite.tsx                      (resolveSiteShellRenderProps -> navigationDocument)
  EDIT   core/server/validation/menuSchemas.ts           (accept document on the existing PATCH /menus/:id)
  (legacy render path normalizeMenuAppearance + menuNavExtras + buildSiteShellCss STAYS for back-compat)
```

---

## Subtasks

| ID | Title | Status |
|---|---|---|
| TASK-499-01 | Menu Items Editor Restyle (three-pane prototype) | ⏳ To Do |
| TASK-499-02 | menuDocumentV2 Contract + Persistence | ⏳ To Do |
| TASK-499-03 | Menu Design Tab — Shared-Shell Editor | ⏳ To Do |
| TASK-499-04 | Menu Front Renderer + Default Fallback | ⏳ To Do |
| TASK-499-05 | Menu Tests, Docs, Closure | ⏳ To Do |

**Sequencing:** 499-01 ships independently (PART 1). 499-02 (schema + persistence)
is the keystone gate that blocks 499-03/04. 499-03 (authoring) repoints the route
and retires the legacy menu host. 499-04 (front fallback) is the behavioral
keystone (empty ⇒ default `SiteHeaderNav`, non-empty ⇒ document) and must land
with the byte-identity test intact. 499-05 closes tests + docs.
**Shared-module ordering caveat:** the new `core/site/menuDocumentCss.ts` (owned by
499-04) exports BOTH the front viewport `buildMenuDocumentCss(doc)` AND the
device-forced admin-canvas `buildMenuDocumentPreviewCss(doc, device)`; 499-03's
in-canvas preview (§2) consumes the latter, so the CSS-builder portion of
`menuDocumentCss.ts` is a hard prerequisite of 499-03 even though 499-04's front
wiring (renderer + fallback branch) follows. Land `menuDocumentCss.ts`'s builders
with (or just before) 499-03's canvas; 499-03 lists 499-04 in its Dependencies for
this reason. The two builders stay co-located in one module for scoped-rule cohesion
(same `[data-site-menu-doc]` rules, viewport-media vs device-forced) rather than
splitting the device-forced variant into 499-03.

---

## Security Contract (epic-level)

- **menuDocumentV2 is schema-first / reject-unknown / backward-compatible.** The
  write normalizer rejects unknown sections/blocks/props with a machine-readable
  `menu_document_invalid` + offending `path`; the stored-read normalizer is
  fail-closed (unreadable ⇒ empty document ⇒ default look). Reused leaf blocks
  (button/image/divider/spacer) inherit the page schema's existing validation;
  menu-native props reuse `normalizeMenuAppearance`'s validated color/number/enum
  shapes — raw stored input never reaches CSS.
- **Versioning.** menuDocumentV2 carries its OWN `MENU_DOCUMENT_SCHEMA_VERSION`
  (start `1`), independent of `PAGE_DOCUMENT_SCHEMA_VERSION`. A stored non-empty
  `document` with an absent OR lower/unknown version fails the strict write check, so
  the fail-closed stored-read degrades it to empty ⇒ the resolver returns `null` ⇒ it
  is treated as a legacy appearance+extras envelope (backward-compatible). No
  stamp-on-absent for a non-empty document (see TASK-499-02 §4).
- **Front renders published-only.** `resolvePublicSiteShell` already gates on
  `menu.status === "published"`; the document resolver reads the `published`
  snapshot, never the top-level draft (mirrors `resolvePublishedMenuAppearance`).
- **No new public write endpoint.** `document` rides the EXISTING `PATCH
  /menus/:id` via `UpdateMenuInput.document` through `updateMenu`, under existing
  RBAC; `openInNewTab`/`variant` ride the EXISTING `PUT /menus/:id/items` →
  `replaceMenuItems` per-item `settings` jsonb. No NEW route and no RBAC change —
  the only schema touches are additive optional keys on EXISTING strict bodies (the
  `menuUpdateSchema` gains `document`; the `menuItemsSchema` per-item `settings` gains
  `openInNewTab`/`variant`, both keeping `additionalProperties:false`). No DB
  migration (`menus.settings` is freeform nullable jsonb; `menu_items.settings` is jsonb).

---

## Contract Audit (≥5 rounds, anchored to real source)

1. **Anchors verified.** `menuService.ts:24-46,163-215,348-350`; `menuItemSettings.ts:23-28,46-87`;
   `navigationMenuMapping.ts:40-48,63-84` (target only `self` at `:76`);
   `siteShell.tsx:56-70,82-135,149-199`; `pageRuntimeV2.tsx:23-49`;
   `siteShellCss.ts:67-85,182-194`; `publicSite.tsx:806-849`; `publicSiteShell.ts:51-57`;
   `PageEditor.tsx:85,963-965,3341-3347,3510-3511`; `MenuDesignEditorPage.tsx:245-307`.
2. **Option B isolation.** Page schema untouched (no `pageSectionTypes`/`pageBlockTypes`
   edit). Leaf reuse goes through the PUBLIC page normalizers
   (`normalizePageDocumentV2ForWrite` / `normalizeStoredPageDocumentV2ForRead` /
   `createPageBlockV2`) exactly like `menuNavExtras.ts:65-118` already does —
   `normalizeBlockStyle`/`normalizeBlockVisibility` are module-private, so reuse is
   via the wrapper trick, not deep imports.
3. **Persistence non-destructive.** `readMenuDesignState` (`menuService.ts:163-172`)
   gains `document`; per-key merge/publish keeps `appearance`/`extras` intact;
   emptied `document` ⇒ key deleted ⇒ envelope may collapse to `null` ⇒ default look.
4. **Byte-identity safe.** `DefaultRuntimePageShellV2` adds a branch ABOVE the
   existing `SiteHeaderNav` default; the default path and `buildSiteShellCss(null)`
   are untouched, so `tests/unit/pages/siteShellCss.test.ts` stays green. The
   document render emits its own scoped CSS in a NEW `menuDocumentCss.ts`.
5. **No-endpoint / published-only / legacy-compat.** `document` reuses PATCH
   `/menus/:id`; renderer reads `published.document`; legacy menus (appearance/extras,
   no document) keep rendering through the existing path; `buildMenuDocumentFromLegacy`
   seeds a document on first Design open WITHOUT writing until the user saves.

---

## Testing Requirements

The consolidated cross-cutting matrix + gate live in **TASK-499-05 §1**; each
subtask owns its own suite list. Epic-level, these invariants MUST stay green and
MUST NOT be weakened to fit:

- **Byte-identical default shell CSS** — `tests/unit/pages/siteShellCss.test.ts`
  (`buildSiteShellCss(null)` + all-defaults model) changes by ZERO lines; the
  document path is additive (scoped under `[data-site-menu-doc]`) and the no-document
  head emission is byte-unchanged (TASK-499-04 §5).
- **Live DnD + nesting** — `tests/vitest/ui/menu-tree.test.tsx` (`child|before|after`
  intents + keyboard move/indent/outdent + parent reparent) and
  `tests/vitest/ui/menu-item-row.test.tsx` **behavior/a11y** assertions (drop-line
  labels + markers, `data-menu-drag-handle` + Drag/Move/Indent/Outdent aria-labels,
  `data-menu-nested-indent`, `data-menu-row-active`) stay green with NO edits; only
  the enumerated pure-VISUAL row assertions (grip-box dims, letter-avatar, the text
  "Sub-item of X" hint) are UPDATED to the compacted prototype row — the row is
  re-skinned toward the prototype, NOT preserved (TASK-499-01 "row fidelity"
  reconciliation, split behavior-locked vs visual-updateable).
- **Page-editor isolation** — after the `mode === "menu"` retirement,
  `tests/vitest/pages/page-editor-*` (incl. `page-editor-host-contract.test.ts`,
  whose `mode` union must be edited down to `["page","page-template"]`),
  `tests/vitest/ui/page-editor*.test.tsx`, and `pageBuilder/*` stay green; the
  refactor cannot reach Pages.
- **menuDocumentV2 strictness** — `tests/vitest/services/menu-document-v2.test.ts`
  asserts reject-unknown (`menu_document_invalid` + `path`), fail-closed read, and
  leaf-validator reuse; the envelope `document` merges per-key without dropping
  `appearance`/`extras` (`tests/integration/routes/menus.test.ts`,
  `tests/unit/menus/menuService.test.ts`).
- **Default-vs-custom front** — `tests/vitest/site/page-runtime-shell-branch.test.tsx`
  asserts empty ⇒ `SiteHeaderNav`, non-empty ⇒ `SiteHeaderMenuDocumentRender`,
  cleared ⇒ default, plus the `renderPublicPage` head-CSS gate.

Full gate per subtask: `bun --cwd core lint`, `bun --cwd core lint:types`,
`bun --cwd core test:bun`, full vitest, the repo gate alias, and real-input
playwright smoke (no synthetic-only passes).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + Statistics when subtasks change status
  (the closing agent only; do not edit the board index while authoring).
- Add `_docs/_CHANGELOG/` entries on each subtask closure linking **TASK-499**.
- On 499-02/04 closure, cross-link the new `menuDocumentV2` contract + the
  default-fallback behavior from `_docs/PAGE_MODEL.md` / `TASK-455` site-shell notes.
