# TASK-526-01-L01: PageEditor Layers Popover — Scroll Containment (`max-h` popover + `min-h-0 flex-1 overflow-y-auto` list)

# FileName: TASK-526-01-L01-Page-Editor-Layers-Scroll-Wrapper.md

**Parent Task:** TASK-526
**Parent Subtask:** TASK-526-01
**Priority:** Medium
**Category:** Admin UI / Pages (Page Editor v2) / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done (2026-07-08)

---

## Scope

Executable leaf. The ONE affected panel from the ground audit: the Page Editor v2
**Layers popover** in `core/admin/ui/pages/PageEditor.tsx`. Bound the `absolute` popover
with a self-contained `max-h` and put a single vertical scroll region on its section
list; ship a structural class-assertion test that drives the LIVE host. Pure
className/structure — no logic change.

> **PRE-AUDIT CORRECTION (2026-07-08).** The earlier draft targeted a NEW `LayerBlockTree`
> wrapper in `PageEditorLayers.tsx` on the false ground fact that `LayerBlockRows`' "only
> importer is its test." Binary-safe `grep -an` proves `LayerBlockRows` is imported
> (`PageEditor.tsx:245`) and rendered (`:2738`) inside the LIVE Layers popover
> (`:2692`–`:2757`). `PageEditor.tsx` reads as `data`/binary to plain `grep`/`rg`
> (project memory `pageeditor-tsx-grep-binary-trap`), which is why the original audit
> missed it. A detached `LayerBlockTree` would be **dead code** and its `flex-1`/`h-full`
> idiom **cannot engage on an `absolute` popover** (no flex parent) — leaving the panel
> unscrollable. The fix target is corrected to the popover itself.

## Affected panel

**File:** `core/admin/ui/pages/PageEditor.tsx` — the Layers popover `:2692`–`:2757`
(import `:245`, render `:2738`). Re-grep anchors at implement time with **`grep -an`**
(NEVER plain `grep`/`rg` — this file reads as binary to them).

### Current structure (verified with `grep -an`)

```tsx
{layersOpen ? (                                                          // :2692
  <div className="absolute left-4 top-16 z-20 w-72 rounded-2xl border    // :2693
       border-border bg-popover p-3 shadow-pop">                         //   ← NO max-h / overflow / height bound
    <div className="mb-2 flex items-center justify-between">             // :2694  header row ('Layers' + close X) — needs shrink-0
      <p className="text-sm font-semibold">Layers</p>                    // :2695
      …close button…
    </div>
    <div className="space-y-1">                                          // :2705  ← the SECTION LIST — this is where scroll belongs
      {pageDocument.sections.map((section) => (                          // :2706  ← multi-section stack drives the height
        <div key={section.id} className="space-y-1">
          <button …>{section.name}…</button>                            // :2708  section header (host markup)
          <div className="space-y-1 pl-4">
            <LayerBlockRows section={section} blocks={section.blocks} …/>// :2738  one section's blocks (host-scrolled inner content)
          </div>
        </div>
      ))}
    </div>
  </div>
) : null}
```

The popover is `absolute` (out of its parent's flex flow) with **no `max-h`, no
`overflow`, no height bound**. The list height is driven by `pageDocument.sections.map`
(`:2706`) — the multi-section stack, NOT any single `LayerBlockRows`. So the tree grows
past the viewport and the lower layers are unreachable ("nie widzę wszystkich warstw").

**Sibling/ancestor context:** the popover sits inside the `relative flex h-full min-h-0 flex-col`
container at `:2488` as a sibling of the canvas scroller at `:2590`
(`min-h-0 flex-1 overflow-auto overscroll-contain`). The inner list therefore needs
`overscroll-contain` so wheel events at its bounds don't chain into the canvas behind it.

**In-file reference idiom (already correct 3×):** the host-appearance panel at `:2968`
(`flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`) → `shrink-0` header
(`:2976`) → `min-h-0 flex-1 overflow-y-auto overscroll-contain` body (`:2999`). Mirror
this exactly.

### Precise className change (in `PageEditor.tsx` — 3 edits + 2 test hooks)

An `absolute` popover has no flex parent, so `flex-1`/`h-full` resolve against nothing
and the `LibraryPanel:37` host-bound chain **cannot** engage. Use a **self-bounding
`max-h`** on the popover container (the proven `:2968` popover idiom), not a detached
wrapper:

1. **Container** (`:2693`): add to the existing classes
   `flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`, plus
   `data-page-editor-layers-panel="true"`. Result:
   `absolute left-4 top-16 z-20 flex max-h-[min(72vh,calc(100dvh-8rem))] w-72 flex-col overflow-hidden rounded-2xl border border-border bg-popover p-3 shadow-pop`.
2. **Header row** (`:2694`): add `shrink-0` →
   `mb-2 flex shrink-0 items-center justify-between`.
3. **Section list** (`:2705`): change `space-y-1` →
   `min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain`, plus
   `data-page-editor-layers-scroll="true"`.

- **List region (scroll container):** `min-h-0 flex-1 overflow-y-auto overscroll-contain`.
- **Header:** `shrink-0`.
- **Container:** `flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`
  (self-bounds the absolute popover so overflow engages with no host change).
- **`PageEditorLayers.tsx` / `LayerBlockRows` (`:60`, `:165`) stays UNCHANGED** — its
  recursive `space-y-1` output is byte-identical; the recursed inner instances get NO
  overflow. Do NOT create a `LayerBlockTree` wrapper (it would be dead code).

### Why NOT the `flex-1`/`h-full` host-bound wrapper (dropped)

`overflow-y-auto` needs a bounded-height ancestor. For a flex child that bound comes from
a height-bounded `flex min-h-0 flex-col` parent (the `LibraryPanel:37` idiom). But the
Layers popover is `absolute` — it is NOT a flex child of `:2488`, so there is no flex
parent to divide and no `h-full` to inherit. The self-bounding `max-h-[min(72vh,calc(100dvh-8rem))]`
supplies the bound directly; this is the only shape that scrolls an absolute popover, and
it is already proven in-file at `:2968`/`:3432`/`:4995`.

## Structural class-assertion test

**File:** `tests/vitest/ui/page-editor-layers.test.tsx` (append — do NOT weaken the
existing `LayerBlockRows` nested-slot test, which still asserts byte-identical recursive
output).

Target the **LIVE host**, not a detached component. Render `PageEditor` (as
`tests/vitest/ui/page-editor-v2-flow.test.tsx` does), open the Layers window (click the
`'Layers'` control that sets `layersOpen`), then assert the popover markup via the
`data-*` hooks (jsdom does not layout — assert classes, NOT `scrollHeight`):

```tsx
test("Layers popover bounds its height and scrolls the section list", async () => {
  // render PageEditor with a page document (mirror page-editor-v2-flow.test.tsx setup),
  // then open Layers so the popover mounts.
  const panel = container.querySelector('[data-page-editor-layers-panel]');
  const scroll = container.querySelector('[data-page-editor-layers-scroll]');
  expect(panel).not.toBeNull();
  expect(scroll).not.toBeNull();
  // container is self-bounded (max-h) so overflow engages without a host change
  expect(panel!.className).toMatch(/max-h-\[min\(72vh,calc\(100dvh-8rem\)\)\]/);
  expect(panel!.className).toMatch(/\boverflow-hidden\b/);
  // scroll region carries all three list-region classes
  expect(scroll!.className).toMatch(/\bmin-h-0\b/);
  expect(scroll!.className).toMatch(/\bflex-1\b/);
  expect(scroll!.className).toMatch(/\boverflow-y-auto\b/);
  // exactly ONE scroll box in the popover subtree (no nested scroll on the recursion)
  expect(panel!.querySelectorAll('[class*="overflow-y-auto"]').length).toBe(1);
});
```

- Render the LIVE `PageEditor` and open Layers (as `page-editor-v2-flow.test.tsx`
  already drives the editor); do NOT `renderToStaticMarkup` a detached `LayerBlockTree`.
- Assert the container `max-h-[min(72vh,calc(100dvh-8rem))]` bound + `overflow-hidden`.
- Assert the three list-region classes (`min-h-0`, `flex-1`, `overflow-y-auto`) on the
  `data-page-editor-layers-scroll` element.
- Assert **exactly one** `overflow-y-auto` in the popover subtree (guards "no scroll box
  on the recursion").
- Keep the existing test asserting `LayerBlockRows` still renders nested slots + actions
  unchanged (byte-identity of the recursive output).

## Validation commands

- From REPO ROOT (vitest is root-only; no `--cwd core`):
  `vitest run tests/vitest/ui/page-editor-layers.test.tsx` (or `bun run test:vitest`).
- Type gates: root `tsc -p tsconfig.json --noEmit` + `bun --cwd core lint:types`.

## Hard Invariants

1. ONE scroll region, on the `:2705` section list ONLY; NEVER inside `LayerBlockRows` or
   on the recursed inner instances (`PageEditorLayers.tsx:165`) — asserted by the
   "exactly one `overflow-y-auto` in the popover subtree" check.
2. `min-h-0 flex-1 overflow-y-auto overscroll-contain` on the `:2705` list region;
   `shrink-0` on the `:2694` header; `flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`
   on the `:2693` container.
3. `PageEditorLayers.tsx` / `LayerBlockRows` stays BYTE-IDENTICAL; no `LayerBlockTree`
   wrapper is created (it would be dead code). `PageEditor.tsx` is the sole edited source
   file, and only its Layers popover changes.
4. Container self-bounds via `max-h` (absolute popover has no flex parent); the
   `flex-1`/`h-full` host-bound chain is NOT used.
5. Pure UI/structure — no logic/model/API/migration; only classNames + two `data-*` test
   hooks change.
6. Structural class-assertion test drives the LIVE `PageEditor` (opens Layers, asserts
   the `data-page-editor-layers-panel` container bound + `data-page-editor-layers-scroll`
   list classes + exactly one `overflow-y-auto`); no detached-component assertion; no
   `scrollHeight`.
7. Live-verified light+dark at closure (rounded corners + `shadow-pop` intact, last layer
   reachable, no scroll-chaining into the canvas).
</content>
