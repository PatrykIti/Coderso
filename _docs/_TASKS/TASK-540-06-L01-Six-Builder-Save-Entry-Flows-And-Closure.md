# TASK-540-06-L01: Six Builder-Save-Entry Flows and Closure

# FileName: TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-06
**Priority:** High
**Category:** Testing / Documentation / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01, TASK-540-03-L01, TASK-540-04-L01..L04, TASK-540-05-L01..L02
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- additive cross-leaf TASK-540 cases in the named Vitest/Bun files below; source-owner
  compatibility expectations are read-only here
- `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`
- relevant Custom Screens user/developer guides
- task-prefixed screenshots named `_docs/_workflows/_smoke/task-540-*`
- TASK-540 descendant statuses, board row/statistics, changelog 1252 at closure

Do not reopen production source. If a source defect remains, return it to its
owning leaf/fix workflow, re-run gates, then resume closure.

## Required test matrix

```text
tests/vitest/admin/custom-screen-schemas.test.ts
tests/vitest/customScreens/screenDocumentOps.test.ts
tests/vitest/customScreens/screen-document-image-src.test.ts
tests/vitest/customScreens/customScreenService.test.ts
tests/vitest/customScreens/relatedEntryResolver.test.ts
tests/vitest/admin/entriesClient.test.ts
tests/vitest/admin/userSettingsClient.test.ts
tests/vitest/ui/use-screen-entry-preferences.test.ts
tests/vitest/ui/use-screen-related-entries.test.tsx
tests/vitest/ui/custom-screen-entry-draft.test.ts
tests/vitest/ui/custom-screen-binding-panel.test.tsx
tests/vitest/ui/custom-screen-authoring-boundary.test.ts
tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx
tests/vitest/ui/custom-screens-page.test.tsx
tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx
tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx
tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx
tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx
tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
tests/unit/settings/userSettingsService.test.ts
tests/integration/routes/userSettings.test.ts
tests/integration/routes/customScreensRoutes.test.ts
```

Assertions must cover exact reject-unknown/round-trip behavior, hostile URL
corpus, recursive children/slot rejection, direct-image UUID→media URL resolution and
cancellation, link-only/legacy disabled compatibility, Tabs minimum/maximum plus keyboard/ARIA/visible
panel behavior, nested interactive Space, promise fail→retry and identity guard,
cacheBus target refresh without dirty overwrite, target A→B immediate stale-row
disappearance before delayed B resolves, both dirty guards, narrow layout,
landmark role, and per-user settings isolation including a delayed prior-user PATCH.
The aggregate Button flow must bind, clear, rebind, save, and reopen while proving no
empty-field sentinel reaches the persisted definition.
TASK-540-04-L02 creates and passes `use-screen-related-entries.test.tsx` before its
source gate; closure runs that path read-only. Every source owner updates behavior
expectations before its own gate. Closure adds only cross-leaf/aggregate cases and may
not defer, weaken, or re-baseline a source-owner proof.

## Implementation Pseudocode

```text
verify every source owner leaf is landed and its behavior tests plus targeted gate are green
add only declared cross-leaf Vitest/Bun regressions without changing or re-baselining source-owner behavior
run each named lane; on failure rerun the named file once and route real defects
back to the single owning source leaf
restart the Bun server, execute the synthetic builder -> save -> entry flows,
save task-540-prefixed screenshots and record visible scenario evidence in closeout
update only the declared product/cache/API docs
create pinned changelog 1252, update TASK-540 rows/statistics from fresh indexes,
and close parent only after every physical descendant is terminal
```

## Post-audit

After source owners, tests, docs, and smoke artifacts are final, run approximately five
fresh read-only lenses:

1. fixed-kind schema/legacy-read/URL-policy and present-only round-trip fidelity;
2. Tabs identity, scoped DOM IDs, interaction semantics, and accessibility;
3. dirty guards, promise retry/cancellation, cache subscriptions, and no dirty overwrite;
4. authenticated-user preference isolation and narrow-canvas/ARIA geometry;
5. test integrity, docs/cache maps, smoke scenario/screenshots, and task/changelog graph.

Every finding needs `file:line` evidence and every expected lens result must be present.
Fix verified HIGH/MEDIUM drift in its sole source-owning leaf, rerun the affected gates,
then execute a fresh reconcile before closure. A missing result is not a pass.

## Real browser smoke

Restart the Bun server and use a task-scoped `playwright-cli` session. Record at
least these distinct visible-effect flows in light and dark with zero console
errors:

1. Insert Button from visible palette, bind a URL field, clear it to the static fallback,
   rebind, save/reopen entry, prove no empty binding persisted, and
   activate the safe link; unsafe URL remains visibly disabled. Apply a presentation
   media UUID to a direct image and prove the resolved safe URL renders, while a
   missing/unsafe mapped winner shows the placeholder and a delayed prior resolution
   cannot replace it. Apply a media-field override and prove MediaPicker retains its UUID
   selection rather than receiving a URL.
2. Add three Tabs, insert nested content into each, save/reopen, switch by mouse,
   and verify only the active panel geometry is visible.
3. Arrow/Home/End through Tabs; assert focus, `aria-selected`, `tabIndex`, panel
   `hidden`, and accessible relationships.
4. Type a phrase containing spaces in contenteditable; activate link/input and
   selection handle independently.
5. Dirty builder navigate: cancel preserves draft; confirm discards. Repeat for
   entry content plus presentation dirty state and a failed save.
6. Force first related-entry read failure and use visible Retry. After success, trigger
   a same-request cache refresh and assert current rows remain visible with refreshing
   state; then switch A→B while an A refresh is deferred, assert immediate empty/loading,
   settle stale A with no commit, and finally observe B content without dirty overwrite.
7. At 320/390/480 px assert panel in viewport and non-zero usable canvas; verify
   preference isolation across two synthetic users.

Save screenshots under `_docs/_workflows/_smoke/` with the exact `task-540-` prefix and
record scenario IDs, theme/viewport, visible assertions, console-error results, and
screenshot paths in TASK-540 closeout evidence. TASK-545's future manifest/evidence
path is not a prerequisite. Assertions use computed style, geometry, DOM/ARIA state,
not mere control presence.

## Validation and closure

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx tsc -p tsconfig.json --noEmit
bunx vitest run tests/vitest/admin/custom-screen-schemas.test.ts \
  tests/vitest/customScreens/screenDocumentOps.test.ts \
  tests/vitest/customScreens/screen-document-image-src.test.ts \
  tests/vitest/customScreens/customScreenService.test.ts \
  tests/vitest/customScreens/relatedEntryResolver.test.ts \
  tests/vitest/admin/entriesClient.test.ts \
  tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/ui/use-screen-entry-preferences.test.ts \
  tests/vitest/ui/use-screen-related-entries.test.tsx \
  tests/vitest/ui/custom-screen-entry-draft.test.ts \
  tests/vitest/ui/custom-screen-binding-panel.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx \
  tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
set -a && source .env && set +a
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/integration/routes/customScreensRoutes.test.ts
bun run gates:coderso
git diff --check
```

Rerun each named failure once in isolation. Update docs and create exactly
`_docs/_CHANGELOG/1252-...md`; then set every TASK-540 descendant Done and
recalculate board statistics. Do not close with skipped smoke or open children.
