# TASK-411: Page Editor Canvas Workspace Layout
# FileName: TASK-411_Page_Editor_Canvas_Workspace_Layout.md

**Priority:** High
**Category:** Admin UI / Pages / Page Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-105-05, TASK-410
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Fix the page editor shell so scrolling is owned by the editor regions instead of
the whole admin page, and make the center canvas a real working surface. Users
must be able to hide the left widget library on desktop and smaller screens so
the canvas and right-side appearance controls can take focus.

Current audit evidence:

- `PageEditor` only tracks mobile sheets and always supplies the desktop left
  panel.
- `EditorShell` and `AdminShell` combine height and overflow classes in a way
  that lets the editor scroll as one block.
- The center canvas and toolbar are constrained to `max-w-3xl`, and the page
  wrapper clips widget output with `overflow-hidden`.
- Existing PageEditor tests mock `EditorShell` in several behavior suites, so
  they cannot catch region overflow or desktop panel-collapse regressions.

Claude `--effort xhigh` and the page-editor subagent both confirmed these issues.
Claude's plan-mode runtime audit stayed read-only; direct `playwright-cli` browser
validation is required after implementation.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing session-authenticated admin page editor only.
- **RBAC:** unchanged; page editor access continues to use existing content/page
  permissions.
- **CSRF:** unchanged for existing save/publish/settings writes.
- **Rate-limit bucket:** unchanged; no route is added or modified by this task.
- **Validation:** page and widget payload validation remain owned by existing page
  services, widget schemas, and normalizers.
- **Anti-abuse controls:** not applicable to this layout-only admin task. No new
  public write endpoint, nonce/signature/HMAC, or reCAPTCHA policy.

---

## Sub-Tasks

- [x] Update `AdminShell`/`EditorShell` height and overflow contracts so the admin
      shell owns viewport height and editor regions scroll internally.
- [x] Split the PageEditor center into a fixed toolbar/header and a dedicated
      canvas scroller with `min-h-0`, `flex-1`, `overflow-auto`, and
      `overscroll-contain`.
- [x] Add desktop and responsive panel state so the left widget library can be
      hidden and restored without losing the selected block or right appearance
      controls.
- [x] Preserve existing mobile sheets while adding a desktop control surface with
      icon+text buttons for library/details visibility.
- [x] Replace the narrow `max-w-3xl` canvas with a wider responsive working
      viewport that gives width back when the left panel is hidden.
- [x] Remove broad canvas `overflow-hidden`; clip only intentional background
      media layers so full-width/sticky widgets can render correctly.
- [x] Add unmocked layout tests that exercise `PageEditor -> EditorShell` instead
      of relying only on behavior suites that mock the shell.
- [x] Run direct `playwright-cli` browser checks for no body-level page scroll,
      region-local canvas scroll, and left-panel hide/show behavior.

---

## Implementation Pseudocode

```tsx
function EditorShell({ leftPanel, rightPanel, children, contentClassName }: Props) {
  return (
    <AdminShell contentClassName={cn("p-0 overflow-hidden", contentClassName)}>
      <div className="flex h-full min-h-0 overflow-hidden">
        {leftPanel ? <EditorSidebar side="left">{leftPanel}</EditorSidebar> : null}
        <section className="min-h-0 min-w-0 flex-1">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
        </section>
        {rightPanel ? <EditorSidebar side="right">{rightPanel}</EditorSidebar> : null}
      </div>
    </AdminShell>
  );
}

function PageEditor() {
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);

  return (
    <EditorShell
      leftPanel={libraryOpen ? renderLibraryPanel() : null}
      rightPanel={detailsOpen ? renderBlockSettings() : null}
    >
      <PageEditorToolbar onToggleLibrary={() => setLibraryOpen((open) => !open)} />
      <main data-page-editor-canvas-scroller className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6">...</div>
      </main>
    </EditorShell>
  );
}
```

Expected data flow:

- Panel visibility state is local UI state and does not mutate page data.
- Mobile library/details sheets keep their existing state and behavior.
- The selected block, preview state, dirty-state protection, save/publish flows,
  and cache hydration semantics stay unchanged.
- Inserted-block scroll targets stay within the canvas scroller and do not cause
  body/admin-shell scroll.
- Canvas wrapper remains a visual preview of page wrapper settings but no longer
  clips widget output broadly.

Regression-test shape:

- Unmocked SSR/class tests assert `AdminShell`/`EditorShell` have `h-full`,
  `min-h-0`, and `overflow-hidden` contracts.
- UI tests assert desktop library toggle removes/restores the left panel while
  the right settings panel remains available.
- Existing insert-scroll tests continue to assert newly inserted blocks are
  highlighted and scrolled into view.
- Direct `playwright-cli` smoke checks body/document scroll height, canvas
  scroller overflow, and panel toggle behavior at desktop and mobile sizes.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-layout-shell.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-insert-scroll.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/pageBuilder.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Direct `playwright-cli` smoke against `coderso-dev-core-host` for desktop and
  mobile layout checks.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`: task board status and statistics.
- `_docs/_CHANGELOG/`: task-linked changelog entry on completion.
- Update admin/page-builder docs if the final UI introduces named workspace or
  panel controls that need source-of-truth documentation.

---

## Completion Notes

- Updated `AdminShell` and `EditorShell` so editor pages can opt into owning
  overflow locally instead of scrolling the entire admin shell as one block.
- Split the page editor center into a fixed toolbar and a dedicated
  `data-page-editor-canvas-scroller="true"` canvas scroll region.
- Added desktop controls for hiding/restoring the component library and
  appearance panel without mutating page data or losing selection state.
- Added `DeviceSwitcher` support to the page editor canvas and passed the
  selected preview device through nested `BlockList` rendering.
- Replaced the narrow page editor canvas with a wider responsive frame and
  removed broad `overflow-hidden` wrappers that clipped sticky/full-width widget
  output.
- Added unmocked layout coverage in
  `tests/vitest/ui/page-editor-layout-shell.test.tsx`.

## Validation Evidence

- `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui-integration/pageBuilder.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-slot-insert-flow.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/device-switcher.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- Direct `playwright-cli` smoke verified the real admin page editor after reload:
  library panel hide removed `data-editor-shell-left-panel`, center width grew
  from about 416 px to about 704 px in the constrained viewport, details panel
  hide removed `data-editor-shell-right-panel`, mobile device mode set
  `data-page-editor-canvas-device="mobile"` with a 430 px frame, and the canvas
  scroller stayed available for Navigation runtime collapse.

## Audit Closeout

- Claude `--effort xhigh` and page-editor subagent read-only audits identified
  the fixed overflow ownership, narrow canvas, clipped wrapper, and missing
  desktop panel-hide controls.
- The final browser smoke verified the implemented shell behavior against the
  real `coderso-dev-core-host` admin UI rather than mocked shell tests only.
