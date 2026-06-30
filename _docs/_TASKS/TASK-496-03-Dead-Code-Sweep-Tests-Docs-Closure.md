# TASK-496-03: Editor-Surface Dead-Code Sweep, Validation, Docs & Closure
# FileName: TASK-496-03-Dead-Code-Sweep-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Admin UI / Page Builder / Custom Screens / Architecture / Cleanup / QA / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-496-01 (shared editor-chrome shell + Pages/Templates adoption), TASK-496-02 (Screens adopt the shell), TASK-495 (page-editor look shipped), TASK-474 (custom-screen authoring boundary), TASK-468 (screen runtime)
**Status:** ✅ Done
**Completed:** 2026-06-30
**Parent Task:** TASK-496

---

## Overview

Closure leaf for TASK-496. After 496-01 extracts the proven `PageEditor` builder chrome into the single shared shell (`core/admin/ui/shared/CanvasEditor.tsx`, repurposed in place) and routes Pages + Page Templates through it, and 496-02 has Screens adopt that shell (retiring the dark `AuthoringFloatingToolbar` / `AuthoringCanvasFrame` / `canvasChrome.ts` look), this leaf **proves the editor surface contains zero dead code**, runs the full validation matrix, updates the docs, and closes the board + changelog.

This leaf adds **no behavior**. It is a repo-wide **editor-surface dead-code sweep** (zero unused files, zero unused imports, zero unused exports, zero orphaned-but-imported paths, zero stale doc/comment references), plus a standing guard test so the sweep cannot silently regress, plus the validation/docs/closure bookkeeping.

- **Goal:** the HARD NO-DEAD-CODE mandate from TASK-496 is mechanically verified:
  - the formerly orphaned shared shell `core/admin/ui/shared/CanvasEditor.tsx` (0 PRODUCTION importers before this program — its only references were a stale `EditorShell.tsx:13` comment **and** the TASK-479-06-L06 unit spec `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`, retargeted in place by 496-01) now has **real production importers** (the Pages/Templates branch of `PageEditor.tsx` and the two Screen surfaces), the dead `BlockChip` export is gone, **or** the shell is deleted — never both-imported-and-stale; expected outcome per 496-01 is **kept + imported**;
  - the dark authoring chrome that Screens stopped using is **gone**, not just unreferenced: `core/admin/ui/authoring/AuthoringFloatingToolbar.tsx`, `core/admin/ui/authoring/AuthoringCanvasFrame.tsx`, and the authoring `core/admin/ui/authoring/canvasChrome.ts` module (its exclusive consumer was `AuthoringCanvasFrame`) are deleted and their barrel re-exports removed from `core/admin/ui/authoring/index.ts:1,3,8`;
  - authoring **logic** that Screens still need stays: `InlineEditWrapper`, `selectionChrome`/`selectionBorder`, `AuthoringLayersPanel`, `AuthoringCommandPalette`, `authoringSelection` (reached via its `AuthoringSelectionTarget` type export), `authoringCommands` (reached via its `AuthoringCommandGroup` type export) — each still has a live importer (verified below; note the two type-only modules are probed by their exported SYMBOL, not the camelCase filename, which greps to 0). NOTE: the host-contract `canvasChrome?:` field (`pageEditorHostContract.ts:221`) is a **different symbol** from the deleted authoring `canvasChrome.ts` module and stays;
  - no unused imports, no unused barrel exports, no dead files anywhere on the editor surface (Pages / Page Templates / Screens / Menus).
- **Owning modules touched (cleanup + closure only):** `core/admin/ui/shared/CanvasEditor.tsx` (verify only), `core/admin/ui/layouts/EditorShell.tsx` (stale comment), `core/admin/ui/authoring/AuthoringInsertionZone.tsx` (**delete** — pre-existing orphan; its only reference, the `authoring-canvas.test.tsx` case, was removed by 496-02, so this deletion has no test impact), `core/admin/ui/authoring/index.ts` (barrel — remove the `AuthoringInsertionZone` re-export at `:4`), `core/admin/ui/custom-screens/FieldBindingPanel.tsx` (**delete** — pre-existing production orphan; binding UI lives in `ScreenBlockInspector`; its two test importers were retargeted to `ScreenBlockInspector` by 496-02, so this deletion has no test impact — no barrel re-export exists), `core/admin/ui/shared/FilterBar.tsx` (**delete** — zero references anywhere in `core` or `tests`; no barrel re-export), `_docs/PAGE_MODEL.md`, `_docs/CONTENT_TYPES_SPEC.md`, `_docs/ARCHITECTURE.md`, `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/`. New guard test under `tests/vitest/ui/` (alongside `custom-screen-authoring-boundary.test.ts`). (`authoring-canvas.test.tsx` is **not** touched here — 496-02 fully owns its retarget, including the `AuthoringInsertionZone` case.)
- **Source-of-truth docs:** `_docs/PAGE_MODEL.md` (Pages document model + editor chrome notes — Pages stays behavior-preserving; **no** model change), `_docs/CONTENT_TYPES_SPEC.md` (custom-screen contract — update **only if** 496-02 refreshed `ScreenDocumentV1` / `CustomScreenDefinition` / `ScreenFieldBinding` schemas), `_docs/ARCHITECTURE.md` (editor-surface / authoring-stack map). Background: **[[pages-editor-v2-remediation-program]]**, **[[task-474-custom-screen-canvas-parity]]**, **[[task-468-completion-state]]**.
- **Out of scope:** any functional change to Pages, Page Templates, Screens, the ScreenDocumentV1 engine, bindings, List/Editor views, or `ScreenRuntimeRenderer`; any schema/route/RBAC change (those, if any, land in 496-01/496-02, not here). This leaf may only DELETE dead code, fix stale references, add a guard test, and write docs/changelog/board.

---

## Security Contract

**UI / cleanup only — no security-relevant change.** This leaf deletes unused presentational files, removes dead imports/exports, adds a structure-guard test, and edits docs. It introduces **no** route, endpoint, RBAC/permission, CSRF, cache, or `adminPaths` change. The custom-screen contract (`core/services/customScreens/customScreenSchemas.ts`) is **read-only** here; if TASK-496-02 refreshed it, that refresh is schema-first and reject-unknown (parsers stay strict — unknown keys rejected, schemaVersion normalized, backward-compatible read path) and is documented there — but **this** leaf adds no new contract surface. The dead-code sweep must confirm no security helper (auth guard, binding validator, runtime sanitizer) was deleted as collateral.

---

## Dead-Code Sweep — concrete checks

All commands run from the repo root (`/home/coder/project/Coderso`). **`PageEditor.tsx` reads as binary to `rg`/`grep` plain — use `grep -an` or Read, never `rg`** (see **[[pageeditor-tsx-grep-binary-trap]]**).

### Sweep 1 — orphan shared shell is resolved (imported, not orphaned)

After 496-01/02 the shell MUST be imported by the Pages chrome and by the Screen surfaces, OR be deleted.

```bash
# (a) Count REAL importers of the shared shell (exclude the prototype + self).
# NOTE: the -a flag is MANDATORY — PageEditor.tsx reads as binary to plain grep, so a
# plain `grep -rn` will NOT list it. Expect PageEditor.tsx ONLY under `grep -arn`.
grep -arn "shared/CanvasEditor" core --include='*.tsx' --include='*.ts' \
  | grep -v "_PROTOTYPE" | grep -v "shared/CanvasEditor.tsx:"
#   PASS if kept: >=1 real `import ... from ".../shared/CanvasEditor"`
#        (expect PageEditor.tsx [only visible with -a] + CustomScreenEditorPage.tsx + CustomScreenEntryEditor.tsx).
#   PASS if deleted (496-01 chose the delete-and-author-fresh route): returns
#        NOTHING and `ls core/admin/ui/shared/CanvasEditor.tsx` is absent.
#   FAIL = file exists but only comment/self references (still orphaned).

# (b) Dead BlockChip export removed.
grep -rn "BlockChip" core --include='*.tsx' --include='*.ts'   # PASS = no output

# (c) No stale comment-only reference left dangling.
grep -an "CanvasEditor" core/admin/ui/layouts/EditorShell.tsx
#   The :13 comment must describe the now-wired shell accurately or be removed if deleted.
```

### Sweep 2 — retired dark authoring chrome is deleted, not merely unreferenced

Before 496-02 these had live external importers: `AuthoringFloatingToolbar` — `CustomScreenEditorPage.tsx:53,960` + `ScreenAuthoringCanvas.tsx:22,383`; `AuthoringCanvasFrame` — `CustomScreenEditorPage.tsx:957`, `CustomScreenEntryEditor.tsx:44,1208`, `ScreenAuthoringCanvas.tsx:20,367`; `canvasChrome.ts` — `AuthoringCanvasFrame.tsx:6-9` only. After 496-02 those importers are gone, so the files + barrel lines MUST be deleted.

```bash
# (a) Zero references to the retired dark chrome anywhere in core (files deleted + un-exported).
grep -rn "AuthoringFloatingToolbar\|AuthoringCanvasFrame" core --include='*.tsx' --include='*.ts'
#   PASS = NO output.
grep -rn "authoringCanvasSurfaceClass\|authoringCanvasViewportClass\|authoringToolbarPanelClass\|authoringPanelHeadingClass\|authoringDarkGhostButtonClass" core --include='*.tsx' --include='*.ts'
#   PASS = NO output (canvasChrome.ts module deleted; no consumer remains).

# (b) The files are physically gone.
ls core/admin/ui/authoring/AuthoringFloatingToolbar.tsx \
   core/admin/ui/authoring/AuthoringCanvasFrame.tsx \
   core/admin/ui/authoring/canvasChrome.ts 2>&1
#   PASS = "No such file or directory" for all three.

# (c) Barrel has no re-export of the retired modules.
grep -an "AuthoringFloatingToolbar\|AuthoringCanvasFrame\|canvasChrome" core/admin/ui/authoring/index.ts
#   PASS = NO output (the three `export * from "./..."` lines at index.ts:1,3,8 removed).
```

### Sweep 3 — surviving authoring logic still has a live importer (keep-list)

Deleting too much is also a defect. Each kept symbol must have ≥1 external importer after 496-02.

```bash
# IMPORTANT — verify by EXPORTED SYMBOL, not by camelCase module filename.
# authoringSelection.ts / authoringCommands.ts are consumed ONLY via their
# PascalCase type exports (AuthoringSelectionTarget / AuthoringCommandGroup), so a
# module-name grep (`authoringSelection` / `authoringCommands`) returns 0 external
# refs even though both modules ARE live — grepping the symbol is the correct probe.
for sym in InlineEditWrapper selectionBorder AuthoringLayersPanel \
           AuthoringCommandPalette AuthoringSelectionTarget AuthoringCommandGroup \
           AuthoringInsertionZone; do
  n=$(grep -rn "$sym" core --include='*.tsx' --include='*.ts' \
        | grep -v "core/admin/ui/authoring/" | wc -l | tr -d ' ')
  echo "$sym -> $n external ref(s)"
done
#   EXPECT (keep-list, must be >=1):
#     InlineEditWrapper        (CustomScreenEntriesTable.tsx, ScreenRuntimeRenderer.tsx, …)
#     selectionBorder          (ScreenRuntimeRenderer.tsx)
#     AuthoringLayersPanel     (ScreenAuthoringCanvas.tsx)
#     AuthoringCommandPalette  (ScreenAuthoringCanvas.tsx)
#     AuthoringSelectionTarget (ScreenAuthoringCanvas.tsx:26, type import — the export
#                               of authoringSelection.ts; the MODULE name
#                               `authoringSelection` shows 0 external refs and that is
#                               NOT a removal signal — the module is also used
#                               internally by AuthoringLayersPanel/CommandPalette)
#     AuthoringCommandGroup    (ScreenAuthoringCanvas.tsx:24, type import — the export
#                               of authoringCommands.ts; same caveat: module name
#                               `authoringCommands` → 0 refs, symbol → >=1; both are
#                               type-only, so Sweep 5's type gate is the real keep-proof)
#   NOTE — pre-existing dead export to also sweep:
#     AuthoringInsertionZone has 0 PRODUCTION refs; its only reference was the
#     render case in tests/vitest/ui/authoring-canvas.test.tsx, which 496-02 REMOVED
#     (import :11 + case :195-214) when it retargeted that test. So by the time this
#     leaf runs, the symbol grep is 0 external refs — DELETE the file
#     (core/admin/ui/authoring/AuthoringInsertionZone.tsx) + the barrel re-export
#     (index.ts:4) in this sweep. NO test edit is needed here (496-02 already
#     decoupled the test). If the grep is unexpectedly >=1, STOP and reconcile
#     before deleting (a real importer appeared after 496-02).
#   The authoring canvasChrome.ts module is NOT on this keep-list — it is RETIRED
#   in Sweep 2 (its only consumer, AuthoringCanvasFrame, was deleted).
```

### Sweep 4 — no unused imports / unused locals (per-file)

`bun --cwd core lint` runs ESLint with `@typescript-eslint/no-unused-vars: "error"`, which flags any import left dangling after the deletions (e.g. a now-unused `AuthoringCanvasFrame` import the refactor missed). `--max-warnings=0` makes a stray import a hard failure.

```bash
bun --cwd core lint        # any leftover unused import on the editor surface => FAIL
```

### Sweep 5 — no broken type graph after deletions

```bash
bun --cwd core lint:types               # tsc -p core/tsconfig.json --noEmit
tsc -p tsconfig.json --noEmit           # root graph (catches barrel/path breakage)
#   A deleted file still referenced anywhere => unresolved-module error => FAIL.
```

### Sweep 6 — no other orphaned editor-surface file

Catch any module that 496-01/02 left behind (e.g. a screen wrapper made redundant by the shell adoption). For each editor-surface component, assert it has an importer.

**Two refinements over a naive whole-tree `grep core`-only scan — both REQUIRED so the gate has a DEFINED PASS and is not unachievable on the current tree:**

1. **Count test importers too** (search `core` **and** `tests`). The naive scan greps `core` only, so a component whose only consumer is a test renders as a deletable "ORPHAN" even though deleting it reds that suite. A file with ≥1 importer in **either** `core` **or** `tests` is **used** (production-wired or test-covered) — not an orphan.
2. **Triage allowlist (`KEEP`) for the known pre-existing orphans this program does NOT own.** The blocking "else delete" escape applies **only** to files this program created/touched (the shared shell + the screen surfaces + the dark-chrome retirements) and to the genuinely-dead files the sweep deletes (`AuthoringInsertionZone`, `FieldBindingPanel`, `FilterBar`). It must **not** force scope-creep deletions of unrelated, pre-existing, test-covered wrappers that red their suites.

On the **current** tree (HEAD `3625712f`) the naive `grep core`-only scan flags six files — verified, with disposition:

| Flagged file | core importers | test importers | Registered route? | Disposition |
|---|---|---|---|---|
| `authoring/AuthoringInsertionZone.tsx` | 0 | 0 (after 496-02 decoupled its `authoring-canvas.test.tsx` case) | no | **DELETE** (this leaf, Sweep 2/3) |
| `custom-screens/FieldBindingPanel.tsx` | 0 | 0 (after 496-02 decoupled its 2 test files: the render tests retargeted to `ScreenBlockInspector`; the `buildBindingFieldOptions` import + util test #4 dropped as dead — both `FieldBindingPanel` **and** `buildBindingFieldOptions` exports die with the file) | no | **DELETE** (this leaf — binding UI lives in `ScreenBlockInspector`) |
| `shared/FilterBar.tsx` | 0 | 0 | no | **DELETE** (this leaf — genuinely dead, zero references anywhere) |
| `pages/PageEditorPage.tsx` | 0 | 2 (`page-editor.test.tsx`, `page-editor-floating-panel.test.tsx`) | no (the route is `PageEditor`, not `PageEditorPage`) | **KEEP** — pre-existing test entry wrapper (`return <PageEditor />`), out of TASK-496 scope |
| `pages/PageList.tsx` | 0 | 1 (`page-leaf-components.test.tsx`) | no (the route is `PageListPage`) | **KEEP** — pre-existing test wrapper (`return <PageListPage />`), out of scope |
| `pages/PageRevisionDrawer.tsx` | 0 | 3 (`page-revision-drawer.test.tsx`, `post-hooks-and-drawers-wave.test.tsx`, `entry-page-support-wave.test.tsx`) | no | **KEEP** — pre-existing test-covered drawer, out of scope |

(`pages/PageEditorPage.tsx` / `pages/PageList.tsx` / `pages/PageRevisionDrawer.tsx` are also belt-and-braces named in the `KEEP` allowlist so the intent survives even if a future test is removed.)

```bash
# KEEP = pre-existing test-covered harness/wrappers TASK-496 does NOT own (kept; out of scope).
KEEP='PageEditorPage|PageList|PageRevisionDrawer'
for f in $(git ls-files 'core/admin/ui/pages/*.tsx' 'core/admin/ui/pages/**/*.tsx' \
                        'core/admin/ui/custom-screens/*.tsx' \
                        'core/admin/ui/authoring/*.tsx' 'core/admin/ui/shared/*.tsx'); do
  base=$(basename "$f" .tsx)
  echo "$base" | grep -qE "^($KEEP)\$" && continue   # allowlisted pre-existing wrapper — skip
  # -a is MANDATORY: the search root `core` contains the binary-to-grep PageEditor.tsx, so
  # without -a any pages/* sub-component whose SOLE importer is PageEditor.tsx is FALSE-flagged.
  # Count importers in BOTH core AND tests — a test importer means the file is still covered/used.
  refs=$(grep -arln "\\b$base\\b" core tests --include='*.tsx' --include='*.ts' \
           | grep -v "$f\$" | grep -v "/index.ts\$" | wc -l | tr -d ' ')
  [ "$refs" = "0" ] && echo "ORPHAN $f"
done
#   PASS = NO "ORPHAN" lines. After this leaf deletes AuthoringInsertionZone.tsx,
#          FieldBindingPanel.tsx (tests retargeted by 496-02), and FilterBar.tsx, and the
#          KEEP allowlist excuses the three test-covered wrappers, the scan is empty.
#   A NEW "ORPHAN" line (a module 496-01/02 left behind, e.g. a redundant screen wrapper with
#          0 core AND 0 test importers and NOT in KEEP) is a real defect — DELETE it.
#   With -a, a component imported ONLY by PageEditor.tsx is correctly seen as imported.
```

---

## Implementation Pseudocode

The sweep above is the executable acceptance gate. Encode its invariants as a standing **structure-guard test** so the no-dead-code property cannot silently regress, mirroring the TASK-474 boundary guard (`tests/vitest/ui/custom-screen-authoring-boundary.test.ts`).

```ts
// tests/vitest/ui/editor-surface-dead-code.test.ts (new)
// Guard: the TASK-496 no-dead-code mandate. Pure filesystem/grep assertions —
// no rendering, no model logic. Keeps the editor surface free of orphans.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

// -a is mandatory: the default search root `core` contains PageEditor.tsx, which reads
// as binary to plain grep; without -a the shell-import assertion below can never see
// PageEditor.tsx (it would rely solely on the non-binary Screen importers).
const grepCount = (pattern: string, paths = "core") =>
  execSync(
    `grep -arn ${JSON.stringify(pattern)} ${paths} --include='*.tsx' --include='*.ts' || true`,
    { encoding: "utf8" }
  ).trim();

describe("editor-surface dead-code mandate (TASK-496)", () => {
  it("the shared editor-chrome shell is imported, not orphaned", () => {
    const shellPath = "core/admin/ui/shared/CanvasEditor.tsx";
    if (existsSync(shellPath)) {
      const refs = grepCount("shared/CanvasEditor")
        .split("\n")
        .filter((l) => l && !l.includes("_PROTOTYPE") && !l.startsWith(`${shellPath}:`));
      expect(refs.some((l) => /import/.test(l))).toBe(true);
    } else {
      expect(grepCount("shared/CanvasEditor")).toBe("");
    }
  });

  it("the dead BlockChip export is gone", () => {
    expect(grepCount("BlockChip")).toBe("");
  });

  it("the retired dark authoring chrome is gone (deleted + un-exported)", () => {
    expect(existsSync("core/admin/ui/authoring/AuthoringFloatingToolbar.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/authoring/AuthoringCanvasFrame.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/authoring/canvasChrome.ts")).toBe(false);
    expect(grepCount("AuthoringFloatingToolbar\\|AuthoringCanvasFrame")).toBe("");
    // The pre-existing orphan AuthoringInsertionZone is also swept (board criterion #4 /
    // Sweep 3). 496-02 removed its only reference (the authoring-canvas.test.tsx case), so
    // this leaf deletes the file + barrel re-export; assert the file no longer exists.
    expect(existsSync("core/admin/ui/authoring/AuthoringInsertionZone.tsx")).toBe(false);
  });

  it("pre-existing editor-surface orphans are swept (deleted)", () => {
    // FieldBindingPanel: 0 production importers — binding UI lives in ScreenBlockInspector;
    // its 2 test importers were retargeted to ScreenBlockInspector by 496-02. FilterBar: 0 refs.
    expect(existsSync("core/admin/ui/custom-screens/FieldBindingPanel.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/shared/FilterBar.tsx")).toBe(false);
  });

  it("no editor-surface component is orphaned (0 core AND 0 test importers) — Sweep 6", () => {
    // KEEP = pre-existing test-covered wrappers TASK-496 does NOT own (route is PageEditor /
    // PageListPage, not these). They retain test importers; allowlisted belt-and-braces.
    const KEEP = /^(PageEditorPage|PageList|PageRevisionDrawer)$/;
    const files = execSync(
      "git ls-files 'core/admin/ui/pages/*.tsx' 'core/admin/ui/pages/**/*.tsx' " +
        "'core/admin/ui/custom-screens/*.tsx' 'core/admin/ui/authoring/*.tsx' " +
        "'core/admin/ui/shared/*.tsx'",
      { encoding: "utf8" }
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const orphans = files.filter((f) => {
      const base = f.replace(/.*\//, "").replace(/\.tsx$/, "");
      if (KEEP.test(base)) return false;
      // count importers in BOTH core AND tests — a test importer means the file is still used.
      const refs = grepCount(`\\b${base}\\b`, "core tests")
        .split("\n")
        .filter((l) => l && !l.startsWith(`${f}:`) && !/\/index\.ts:/.test(l));
      return refs.length === 0;
    });
    expect(orphans, `orphaned editor-surface file(s): ${orphans.join(", ")}`).toEqual([]);
  });

  it("authoring logic that Screens still need is preserved (live importers)", () => {
    for (const sym of [
      "InlineEditWrapper",
      "selectionBorder",
      "AuthoringLayersPanel",
      "AuthoringCommandPalette",
    ]) {
      const external = grepCount(sym)
        .split("\n")
        .filter((l) => l && !l.includes("core/admin/ui/authoring/"));
      expect(external.length, `${sym} must keep a live importer`).toBeGreaterThan(0);
    }
  });
});
```

**Data flow:** none — this test only inspects the source tree, so it is immune to the PageDocumentV2 / ScreenDocumentV1 split and never mounts an editor.

**Error handling:** the test asserts on grep/`existsSync` output; the `|| true` keeps a zero-match grep from throwing a non-zero exit. If a retired file reappears or the shell loses all importers, the assertion fails with the offending path in the message.

**Regression-test shape:** the guard above plus the full existing editor suites staying green (below) — no assertion weakened to accommodate the deletions.

---

## Testing Requirements

Run after the sweep deletions are applied:

- `bun --cwd core lint` (Sweep 4 — unused-import gate, `--max-warnings=0`)
- `bun --cwd core lint:types` and root `tsc -p tsconfig.json --noEmit` (Sweep 5)
- New guard: `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/editor-surface-dead-code.test.ts`
- Pages / Templates chrome unchanged (496-01 behavior-preserving): `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-floating-panel.test.tsx tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-command-palette.test.tsx tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`
- Menu legacy chrome gate intact: `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/menu-design-editor-flow.test.tsx`
- Screens adoption + boundary (496-02) stay green: `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-authoring-boundary.test.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/screen-widgets-editor-wave.test.tsx tests/vitest/ui/authoring-canvas.test.tsx` (the last one **retargeted by 496-02** — dark-chrome render/hook cases **and the `AuthoringInsertionZone` case (import `:11` + render `:195-214`)** dropped, surviving `AuthoringCommandPalette` / `AuthoringLayersPanel` / `isSameAuthoringSelection` cases kept — must be green here; this leaf's deletion of `AuthoringInsertionZone.tsx` + its barrel re-export has **no** test impact because 496-02 already removed that test's import + render case)
- **Full sweep gates (closure):**
  - `bun run test:vitest` (whole vitest suite — green, no skips/weakening). File count moves from the 744 baseline to **745**: exactly **+1 NEW file** — this leaf's `tests/vitest/ui/editor-surface-dead-code.test.ts`. 496-01 does NOT add a parallel `tests/vitest/ui/shared-canvas-editor.test.tsx`; instead it **retargets the existing importer spec `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx` in place** (kept, not new, not deleted — so it neither adds nor subtracts). `tests/vitest/ui/authoring-canvas.test.tsx` is likewise **retargeted in 496-02, not deleted** (its surviving `AuthoringCommandPalette` / `AuthoringLayersPanel` / `isSameAuthoringSelection` cases stay), so it does not subtract. Treat the absolute case total as the prior **4464 ± the changed cases** (the new dead-code guard ADDS cases; the retargeted `canvas-editor.test.tsx` swaps its old uncontrolled-API cases for controlled read-only ones; the retired dark-chrome `data-authoring-*` assertions in `custom-screen-editor-restyle`/`-list-view-canvas`/`custom-screens-page`/`-widget-picker`/`authoring-canvas` are REWRITTEN to shell hooks; `custom-screen-binding-panel.test.tsx` swaps its three `FieldBindingPanel` render tests for `ScreenBlockInspector` render assertions and DROPS the dead `buildBindingFieldOptions` util test #4) — **re-baseline at implementation time**, all green; it is NOT a fixed must-match number to weaken assertions toward.
  - `bun run test:bun` (1157/0 baseline — no editor-surface unit regressed)
  - `bun run gates:coderso` (functional / ux / performance / security / reliability — all PASS)
- **NO-DEAD-CODE / dead-import acceptance check:** re-run Sweeps 1–6 and confirm: orphan shell resolved (imported or deleted) + dead `BlockChip` gone, `AuthoringFloatingToolbar` + `AuthoringCanvasFrame` + `canvasChrome.ts` files + barrel lines gone, `AuthoringInsertionZone`-style zero-ref exports removed, keep-list logic intact, `git status` shows only intended deletions/edits, and `core lint` reports zero unused imports.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` — note that the page-editor builder chrome is now the **shared editor-chrome shell** (`core/admin/ui/shared/CanvasEditor.tsx`) consumed by Pages, Page Templates, and Screens; Pages document-model, ops, cache, dirty/autosave, and preview are **unchanged** (behavior-preserving extraction). Refresh the existing CanvasEditor mentions so they describe the wired shell, not the orphan.
- `_docs/CONTENT_TYPES_SPEC.md` — **only if** TASK-496-02 refreshed the screen contract: record the new `ScreenDocumentV1` / `CustomScreenDefinition` / `ScreenFieldBinding` schema version, state it is schema-first + reject-unknown + backward-compatible, and note Screens now render through the shared shell while keeping their own engine, bindings, List/Editor views, and `ScreenRuntimeRenderer`. If 496-02 changed nothing, state explicitly that the screen contract is unchanged.
- `_docs/ARCHITECTURE.md` — update the editor-surface / authoring-stack map: one shared chrome shell for Pages/Templates/Screens; the dark `AuthoringFloatingToolbar` / `AuthoringCanvasFrame` / authoring `canvasChrome.ts` chrome is **removed**; surviving authoring logic (`InlineEditWrapper`, `selectionChrome`, `AuthoringLayersPanel`, `AuthoringCommandPalette`, `authoringSelection`, `authoringCommands`) is retained.
- `_docs/_TASKS/README.md` — move TASK-496 + its three children (496-01/02/03) to **Done**; update **Statistics** counters (To Do / In Progress / Done) accordingly.
- `_docs/_CHANGELOG/` — add `1205-2026-06-30-task-496-shared-editor-chrome-shell-and-screens.md` (the planned `1204` shifted to `1205`: a concurrent owner agent consumed `1200`–`1203` for the TASK-479-05/screens entries and `1204` was taken by the TASK-495 family closure): Tasks = TASK-496 (01+02+03); Type `Pages/Custom Screens/Admin UI/Architecture/Cleanup/Docs/Task Board`; Key Changes = one shared editor-chrome shell, Pages/Templates behavior-preserved, Screens adopt the light right/bottom shell (builder `panelPosition="right"`, entry content `="bottom"`) keeping ScreenDocumentV1 + bindings + List/Editor + runtime, dark authoring chrome (`AuthoringFloatingToolbar`/`AuthoringCanvasFrame`/`canvasChrome.ts`) retired, orphan resolved + `BlockChip` removed, no-dead-code guard added; Validation = the gate results above. Add the Index row in `_docs/_CHANGELOG/README.md`.
- Memory: cross-link the closure to **[[task-474-custom-screen-canvas-parity]]**, **[[pages-editor-v2-remediation-program]]**, and **[[task-468-completion-state]]**; note the orphaned `shared/CanvasEditor.tsx` and the dark `AuthoringFloatingToolbar` / `AuthoringCanvasFrame` / `canvasChrome.ts` paths are resolved so future audits don't re-flag them.

---

## Acceptance Criteria (closure)

1. Sweeps 1–6 all PASS: orphan shell resolved (imported by Pages/Screens **or** deleted, never orphaned) + dead `BlockChip` gone, `AuthoringFloatingToolbar.tsx` + `AuthoringCanvasFrame.tsx` + `canvasChrome.ts` deleted and un-exported from the barrel, the pre-existing orphans `AuthoringInsertionZone.tsx` + `custom-screens/FieldBindingPanel.tsx` + `shared/FilterBar.tsx` deleted, no zero-ref editor-surface file or export remains, keep-list authoring logic intact. Sweep 6 yields **no** `ORPHAN` line (test-importer counting + the `KEEP` allowlist excuse the pre-existing test-covered wrappers `PageEditorPage.tsx` / `PageList.tsx` / `PageRevisionDrawer.tsx`, which are out of scope and **kept**).
2. `bun --cwd core lint` (zero unused imports), `bun --cwd core lint:types`, root `tsc`, `bun run test:vitest` (+ new guard), `bun run test:bun`, `bun run gates:coderso` — all green.
3. No functional/behavior change to Pages, Page Templates, Screens, the ScreenDocumentV1 engine, bindings, List/Editor views, or `ScreenRuntimeRenderer` (regression suites above unchanged and green; no assertion weakened).
4. Docs (PAGE_MODEL / CONTENT_TYPES_SPEC-if-changed / ARCHITECTURE), changelog `1205`, and the board + Statistics are updated; TASK-496 and all three children are `✅ Done`.
