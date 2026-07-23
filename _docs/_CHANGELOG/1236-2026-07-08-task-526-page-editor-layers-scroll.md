# 1236 - TASK-526 Page Editor Layers Popover — Vertical Scroll Containment

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-526, TASK-526-01, TASK-526-01-L01

## Key Changes

Fixes the owner-reported "unscrollable Layers window" in Page Editor v2 ("nie widzę
wszystkich warstw" — a tall block tree grew past its container and the lower layers
became unreachable). Pure **className/structure** change — no logic, model, API, route,
prop-signature, or behavioral change; **no migration / no DDL / no schema bump**.

A read-only ground audit of every list/tree-rendering file under
`core/admin/ui/pages/editor/` and `core/admin/ui/pages/builder/` (plus the `LibraryPanel`
tab Pickers) found **exactly ONE** panel missing a scroll container: the Layers popover.
Every other candidate is already correctly scroll-contained (mirroring TASK-197 —
`LibraryPanel`/`WidgetPicker`/`FormPicker`/`PageEditorCommandPalette`) or is
host-scrolled inner content that must NOT be modified
(`VisualPanel`/`AdvancedPanel`/`WizardPanel`/`LayoutPanel`).

- **The single fix (`core/admin/ui/pages/PageEditor.tsx`, Layers popover only):** the
  affected panel is the `absolute`-positioned Layers popover (`left-4 top-16 z-20 w-72
  rounded-2xl border bg-popover p-3 shadow-pop`) that had **no `max-h`, no `overflow`,
  no height bound**. An absolute box is out of its parent's flex flow, so the
  `flex-1`/`h-full` host-bound chain cannot engage — the fix uses the viewport-anchored
  popover idiom already proven in-file 3× (host-appearance panel): the container
  self-bounds with `flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`,
  the header row gets `shrink-0`, and the section list (the `pageDocument.sections.map`
  stack) becomes the ONE scroll region with
  `min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-1`. Two stable test hooks
  (`data-page-editor-layers-panel`, `data-page-editor-layers-scroll`) were added. The
  `overscroll-contain` prevents wheel-scroll chaining into the sibling canvas scroller
  behind the popover; `box-shadow` still paints outside `overflow-hidden`, so the
  `shadow-pop`/`rounded-2xl` render intact.
- **`PageEditorLayers.tsx` / `LayerBlockRows` stays BYTE-IDENTICAL** — the recursive row
  renderer is unchanged and the recursed inner instances add NO overflow; the single
  scroll region lives on the host section list, not inside the recursion. No
  `LayerBlockTree` wrapper was created (it would be dead code — nothing consumes it, and
  its `flex-1` would divide against nothing on an absolute popover).
- **Behavior:** on a page with a tall / many-section block tree, the Layers popover now
  scrolls vertically as ONE list and the lowest layers become reachable; the `max-h`
  self-bound makes overflow engage with no host change. There are NO nested scroll boxes
  — exactly one `overflow-y-auto` in the popover subtree.
- **Test:** `tests/vitest/ui/page-editor-layers.test.tsx` — the existing byte-identity
  `LayerBlockRows` nested-slot test is preserved; a new structural class-assertion test
  drives the LIVE `PageEditor` (mounts it, opens the Layers popover via the live toggle,
  asserts the container `max-h-[min(72vh,calc(100dvh-8rem))]` + `overflow-hidden` bound,
  the list-region classes `min-h-0`/`flex-1`/`overflow-y-auto`/`overscroll-contain`, and
  exactly one `overflow-y-auto` in the popover subtree). No `scrollHeight`/layout-metric
  reliance (jsdom/happy-dom does not layout); no detached-component assertion.
- **Docs:** `_docs/PAGE_MODEL.md` — Page Editor v2 ownership note extended to document the
  Layers popover self-bounding + single scroll-region shape.
- **Gates:** all green — `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `tsc -p tsconfig.json --noEmit`, `bun run test:bun`, `bun run test:vitest`,
  `gates:coderso`. The LIVE light+dark Playwright smoke (popover corners + shadow intact,
  last layer reachable, no scroll-chaining into the canvas) is run by the orchestrator
  post-merge (the dev host serves the MAIN tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- None specific to this task. (The broader Page Editor v2 remediation backlog is tracked
  separately.)
