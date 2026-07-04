# TASK-471-04-L01: Badge Block Schema, Controls, Render
# FileName: TASK-471-04-L01-Badge-Widget-Schema-Editors-Render.md

**Parent Subtask:** TASK-471-04
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-471-01 (text-size `xs`/`2xs`)
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Ship the `badge` native Page V2 block end-to-end following the Page document
contract: schema/defaults/normalize, Page Editor controls, shared renderer,
tests, and docs. Pages use `sections[]` and native blocks only; do not add or
reuse `WidgetBlock`, `WidgetRenderer`, core widget registry entries, widget
editor contracts, or pack-matrix entries for this task.

## Design decisions (confirmed in TASK-471-05)

- Native Page V2 block, editor-insertable and assistant-emittable.
- `badge` props: `text`, `variant` (solid|soft|outline), `size`
  (`2xs`|`xs`|`sm`|`md`), `shape` (pill|rounded|square), `weight`,
  `background`, `textColor`, optional `icon`, and `iconPosition`.
- Colors use the existing Page safe-color normalizer and Page Editor color
  swatches; token binding UI remains deferred to TASK-472-04.
- Per-fragment color inside the badge label is out of scope for v1.

## Current State (verified)

- Page V2 block examples: `divider`, `spacer`, `statistic`, `quote` in
  `pageDocumentV2.ts`, `pageRendererV2.tsx`, and `pageEditorControlRegistry.ts`.
- Page editor palette labels live in `pageEditorOptions.ts`.
- Existing color controls are `input: "color"` registry controls mapped to the
  Page Editor swatch UI.
- Tests: `tests/vitest/pages/page-document-v2*.test.ts`,
  `tests/vitest/pages/page-renderer-v2.test.tsx`,
  `tests/vitest/pages/page-editor-control-registry.test.ts`, and
  `tests/vitest/ui/page-editor-v2-flow.test.tsx`.

## Sub-Tasks

- [ ] Add `badge` to Page V2 block type/defaults/props/schema/normalizer,
      capability matrix, and assistant-emittable catalog.
- [ ] Add Page Editor controls for label, variant, size, shape, weight, colors,
      icon, and icon position using existing registry input kinds.
- [ ] Render the badge in `pageRendererV2.tsx` with safe color/icon handling and
      existing block frame alignment.
- [ ] Add/update Page V2 document, renderer, control registry, UI flow, and
      XSS/sanitizer tests.
- [ ] Docs: `_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`,
      `_docs/SECURITY_SPEC.md`.

## Implementation Pseudocode

```ts
export const badgeVariants = ["solid", "soft", "outline"] as const;
export const badgeShapes = ["pill", "rounded", "square"] as const;
export const badgeSizes = ["2xs", "xs", "sm", "md"] as const;            // reuses 471-01
export const badgeSizeCssValues: Record<BadgeSize, string> = {
  "2xs": `var(--text-2xs, 0.625rem)`, xs: `var(--text-xs, 0.75rem)`,
  sm: `var(--text-sm, 0.875rem)`, md: `var(--text-md, 1rem)`,
};

export type PageBadgeProps = {
  text: string; variant: BadgeVariant; shape: BadgeShape; size: BadgeSize;
  weight: BadgeWeight; background?: string | null; textColor?: string | null;
  icon?: string | null; iconPosition: "start" | "end";
};

export function normalizeBadgeProps(raw: unknown): PageBadgeProps {
  // clamp enums; sanitize colors via shared safe-color helper (fail-closed);
  // validate icon vs lucide allowlist (unknown→null); default text "Badge".
}

export function renderBadgeBlock(block: PageBlockV2) {
  const d = readPageBadgeProps(block.props);
  return (
    <span data-badge data-badge-variant={d.variant} data-badge-size={d.size}
      className={badgeShapeClass(d.shape)}
      style={{ fontSize: badgeSizeCssValues[d.size], fontWeight: badgeWeight(d.weight),
               backgroundColor: safe(d.background), color: safe(d.textColor) }}>
      {d.icon && d.iconPosition === "start" && <Icon name={d.icon} />}
      <span className="truncate">{d.text}</span>
      {d.icon && d.iconPosition === "end" && <Icon name={d.icon} />}
    </span>
  );
}
```

Regression-test shape:
- Defaults render a non-empty Page block pill with `data-page-badge*`.
- Unsafe colors drop to default; valid token/hex/var preserved.
- `size`→correct `--text-*`; `shape`→radius class; `variant` resolves; unknown
  icon falls back.
- Editor: Page Editor controls emit existing page-control metadata; color
  controls use swatches and clear to `null`.

## Security Contract

- **No new endpoints.** Persists via the existing Page save/draft path (admin
  session + existing perms/CSRF).
- **Color sink:** `background`/`textColor` via the shared safe-color normalizer
  (reuse navigation/divider); no `url()`/`calc()`/`expression()`/raw CSS;
  token-backed CSS vars, not interpolated raw hex.
- **Icon sink:** validated against a fixed lucide allowlist; unknown→null (no
  dynamic component/string eval). Reject unknown schema fields; clamp enums.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`, `_docs/SECURITY_SPEC.md`.
- `_docs/_TASKS/TASK-471-04*.md` status; changelog rolled up by TASK-471-05.
