# TASK-534-02-L01: Switcher Renderer Case (tablist + panels + `data-switcher` contract)

# FileName: TASK-534-02-L01-Switcher-Renderer-Case.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-02
**Priority:** High
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the `renderPageBlockContent` switch region of
`core/services/pages/pageRendererV2.tsx`: adds a NEW `case "switcher"` (near the
existing `case "icon"` `:2254` / `case "customSvg"`), emitting a real
`role="tablist"` with N tabs + N panels (child blocks from the `panel:1..6` slots),
stamping the `data-switcher` / `data-switcher-tab` / `data-switcher-panel` contract
the 534-01-L03 runtime binds. Reproduces the prototype barn/villa/eco switcher
(`_docs/projekty-domow-wow-site/assets/app.js:54-86`). Disjoint from L02/L03.

## Grounded anchors

- `renderPageBlockContent` switch: `case "icon"` `:2254-2287` (the block-scoped
  keyframe-CSS + re-validate-at-render precedent), `case "gallery"`
  `:2243-2244` → `renderGallery`, `case "customSvg"` (sanitized-inline precedent).
- Child-slot rendering: `renderPageLayoutBlockContent` (`:1907-…`) renders each
  slot's blocks via `renderPageBlockList(block.slots?.[slotKey] ?? [], { parentPath:
  context.blockPath, depth: context.depth+1, …, slotKey, parentBlock: block })`
  (`:1931-1942`, inside a `renderSlotWrapper` `:1868`). The switcher renders each
  `panel:N` slot's blocks as a panel body via the SAME `renderPageBlockList` path
  with the SAME context-threading. `getPageBlockActiveSlotKeys`
  (`pageDocumentV2.ts:1052`) resolves the active panel slots.
- Re-validate-at-render precedent (`case "icon"` `:2255-2275`): never trust stored
  props; re-resolve enum/clamp at the render boundary.
- Stable id for `aria-controls`/`aria-labelledby`: reuse `block.id`
  (`PageBlockV2.id` `:685`) → `${block.id}-tab-${i}` / `${block.id}-panel-${i}`.

## Implementation pseudocode

```tsx
case "switcher": {
  // Re-validate at render (defence in depth — never trust stored props):
  const tabs = Array.isArray(block.props.tabs) ? block.props.tabs : [];
  const variant = (["pill","underline"] as const).includes(block.props.variant as any)
    ? (block.props.variant as PageSwitcherVariant) : "pill";
  // activeIndex: plain coercion + clamp at render (do NOT call the model `readNumber`
  // here — it lives in pageDocumentV2.ts and takes FOUR args `(value, fallback, min, max)`;
  // the render lane clamps inline instead):
  const rawActive = typeof block.props.activeIndex === "number" && Number.isFinite(block.props.activeIndex)
    ? Math.trunc(block.props.activeIndex) : 0;
  const active = Math.max(0, Math.min(Math.max(0, tabs.length - 1), rawActive));
  const panelSlots = ["panel:1","panel:2","panel:3","panel:4","panel:5","panel:6"] as const;
  return (
    <div data-switcher data-switcher-variant={variant}>
      <div role="tablist" aria-orientation="horizontal"
           className={cx("cx-switcher-tabs", `cx-switcher-${variant}`)}>
        {tabs.map((t, i) => (
          <button key={i} type="button" role="tab" data-switcher-tab
            id={`${block.id}-tab-${i}`} aria-controls={`${block.id}-panel-${i}`}
            aria-selected={i === active ? "true" : "false"}
            tabIndex={i === active ? 0 : -1}>
            {String((t as { label?: unknown })?.label ?? "")}  {/* escaped TEXT */}
          </button>
        ))}
      </div>
      {tabs.map((_, i) => {
        const slotBlocks = block.slots?.[panelSlots[i]] ?? [];
        return (
          <div key={i} role="tabpanel" data-switcher-panel
            id={`${block.id}-panel-${i}`} aria-labelledby={`${block.id}-tab-${i}`}
            data-active={i === active ? "true" : "false"}
            hidden={i !== active}>
            {/* render child blocks via the SAME renderPageBlockList path as
                renderPageLayoutBlockContent (:1931), threading context: */}
            {renderPageBlockList(slotBlocks, {
              parentPath: context.blockPath, depth: context.depth + 1,
              includeHiddenBlocks: context.includeHiddenBlocks,
              renderBlockFrame: context.renderBlockFrame,
              renderInlineText: context.renderInlineText,
              runtimeDataByBlockId: context.runtimeDataByBlockId,
              layoutMode: context.layoutMode,
              slotKey: panelSlots[i], parentBlock: block,
            })}
          </div>
        );
      })}
    </div>
  );
}
```

**Progressive enhancement:** with NO JS the first panel is visible (`hidden` on the
rest is the resting state); `data-switcher-panel[hidden]` + the runtime toggle give
working tabs when JS runs. **A11y:** real `role="tablist"`/`tab`/`tabpanel`, roving
`tabindex` (runtime moves it on arrow keys), `aria-selected`,
`aria-controls`/`aria-labelledby` — closes the report's "🔴 semantyka
`role=tablist`/aria — brak".

## Security note

Re-validate at the render boundary (never trust stored props): `variant` re-checked
against the fixed set, `activeIndex` re-clamped, `tabs` coerced to an array. Tab
`label` is rendered as an ESCAPED React TEXT node (`{String(label)}`), NEVER
`dangerouslySetInnerHTML` — an `<img onerror>` label is inert text. `data-switcher-*`
attribute values are fixed literals / bounded ints — no interpolation of raw stored
strings into attributes. The panel bodies render child blocks through the EXISTING
validated child-render path (each child is itself a normalized `PageBlockV2`).

## Test lane

**Vitest render** (`renderToString`, `tests/vitest/pages/` — the page renderer
suite is Vitest, matching the `case "icon"` precedent) — delegated to 534-02-L04,
asserted here: a switcher with 3 tabs renders `role="tablist"` + 3
`role="tab"` (first `aria-selected="true"` + `tabindex="0"`, rest `-1`) + 3
`role="tabpanel"` (first visible, rest `hidden`), `data-switcher` on the host, a
malicious label renders as escaped text; a switcher with 0 tabs renders an empty
(inert) host.

## Regression / owned-breaking-test notes

- The renderer `renderPageBlockContent` exhaustiveness (`switch` over
  `PageBlockType`) now covers `switcher` — a `default`/`assertNever` case (if the
  file uses one) is satisfied by the new `case`. Verify typecheck: an unhandled
  block type would error the exhaustive switch.
- The slot-child helper is `renderPageBlockList` (grounded at `:1931`); thread the
  SAME context shape `renderPageLayoutBlockContent` uses. Do NOT invent a helper.
  If the switcher should route through `renderPageLayoutBlockContent` instead of a
  bespoke `case` (it is a slot host), verify whether `renderPageBlockContent`
  dispatches layout blocks there first — if so, add the tablist wrapper in that
  path; otherwise the bespoke `case` above is correct.

## Hard Invariants

1. Real `role="tablist"` a11y (roving tabindex, aria-selected, controls/labelledby).
2. Progressive: no-JS ⇒ first panel visible (resting `hidden` on the rest).
3. Labels escaped TEXT; `data-*` bounded; child blocks via existing validated path.
4. Present-only: `switcher` blocks only exist when authored (no legacy docs).
