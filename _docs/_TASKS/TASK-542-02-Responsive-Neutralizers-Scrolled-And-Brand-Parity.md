# TASK-542-02: Responsive Neutralizers, Scrolled, and Brand Parity

# FileName: TASK-542-02-Responsive-Neutralizers-Scrolled-And-Brand-Parity.md

**Parent Task:** TASK-542
**Priority:** High
**Category:** Menus / Responsive CSS / Present-Only Rendering
**Estimated Effort:** Medium
**Dependencies:** TASK-541, TASK-542-01
**Status:** ✅ Done
**Completed:** 2026-08-21
**Changelog:** 1319 (pinned; closure only)

---

## Scope

Complete the Menu CSS cascade so every authored OFF/none value visibly undoes a
shallower/device value, L1 styles cannot leak into explicitly disabled L2, an
authored single padding axis uses the documented 6 px other-axis default, and
brand icon color emits through CSS at base and responsive devices. Front runtime
consumption of icon/scrolled state lands separately in TASK-542-03-L02.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-542-02-L01 | Reset every device value and emit icon color | `core/site/menuDocumentCss.ts` | ✅ Done |

## Invariants

- No authored override means zero new bytes.
- Explicit OFF/none emits a reset only where an inherited/base rule must be
  canceled.
- Selector specificity and source order match the positive rule being reset.
- TASK-541 canonical color output is consumed verbatim; no regex/parser mirror.
- `buildSiteShellCss(null)` and no-document/no-override rendering remain byte-
  identical.

## Security Contract

Pure CSS emission from already validated model values. No route/auth change.
Colors use TASK-541 normalization at model/write and are never interpolated from
unchecked input. All other emitted values are enum-selected or bounded literals.
