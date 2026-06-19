# TASK-471-04-L01: Badge Widget Schema, Editors, Render
# FileName: TASK-471-04-L01-Badge-Widget-Schema-Editors-Render.md

**Parent Subtask:** TASK-471-04
**Priority:** Medium
**Category:** Widgets / Core
**Estimated Effort:** Medium
**Dependencies:** TASK-471-01 (text-size `xs`/`2xs`), TASK-336 (widget editor
contract V2)
**Status:** ⏳ To Do

---

## Overview

Ship the `badge` dedicated core widget end-to-end following the atomic-widget
contract (divider/spacer templates): schema/defaults/normalize, wizard/visual/
advanced editors, render component, tests, pack-matrix entry, and docs.

## Design decisions (defaults — confirm in TASK-471-05)

- Atomic dedicated widget, audience intermediate, **module `content`** (no new
  module unless the owner wants `ui-components`).
- `BadgeData`: `text`, `variant` (solid|soft|outline), `color` (token-backed
  background + text, clearable), `size` (`2xs`|`xs`|`sm`|`md` → `--text-*`),
  `shape` (pill|rounded|square), `weight`, optional `icon` (validated lucide) +
  `iconPosition`.
- Token-backed colors (`var(--color-*)`), never hardcoded hex; honors 471-02
  align on canvas; per-fragment color inside the label not required for v1.

## Current State (verified)

- Templates: `core/widgets/core/divider.tsx` (token enums, CSS maps,
  `*EditorContract` v2, schema, defaults, normalizers, render), `spacer.tsx`.
- Editor template: `core/admin/ui/widgets/editors/DividerEditors.tsx`
  (Wizard/Visual/Advanced, swatch-only color, `data-widget-control-path`).
- Registry: `core/widgets/core/index.ts`, `core/widgets/modulePackMatrix.ts`.
- Color vocab + clearable color: `core/widgets/core/navigation.tsx`.
- Tests: `tests/vitest/widgets/divider.test.tsx`,
  `tests/vitest/ui/divider-editor-wave.test.tsx`. Docs: `_docs/_WIDGETS/DIVIDER.md`.

## Sub-Tasks

- [ ] `core/widgets/core/badge.tsx`: `BadgeData`, `badgeSchema` (reject unknown),
      `badgeDefaults`, token enums + CSS maps, `normalizeBadge*` (color safety,
      enum clamps, icon-name validation), `badgeEditorContract` v2, `BadgeBlock`.
- [ ] `core/admin/ui/widgets/editors/BadgeEditors.tsx`: Wizard (variant/size),
      Visual (text + icon picker + swatch colors + size/shape/weight + clear),
      Advanced (read-only diagnostics).
- [ ] Register in `core/widgets/core/index.ts` + `modulePackMatrix.ts`.
- [ ] Tests: `tests/vitest/widgets/badge.test.tsx`,
      `tests/vitest/ui/badge-editor-wave.test.tsx`.
- [ ] Docs: `_docs/_WIDGETS/BADGE.md`, `WIDGETS.md`, `WIDGET_PACK_MATRIX.md`.

## Implementation Pseudocode

```ts
// core/widgets/core/badge.tsx (modelled on divider.tsx)
export const badgeVariants = ["solid", "soft", "outline"] as const;
export const badgeShapes = ["pill", "rounded", "square"] as const;
export const badgeSizes = ["2xs", "xs", "sm", "md"] as const;            // reuses 471-01
export const badgeSizeCssValues: Record<BadgeSize, string> = {
  "2xs": `var(--text-2xs, 0.625rem)`, xs: `var(--text-xs, 0.75rem)`,
  sm: `var(--text-sm, 0.875rem)`, md: `var(--text-md, 1rem)`,
};

export type BadgeData = {
  text: string; variant: BadgeVariant; shape: BadgeShape; size: BadgeSize;
  weight: BadgeWeight; background?: string | null; textColor?: string | null;
  icon?: string | null; iconPosition: "start" | "end";
};

export function normalizeBadgeData(raw: unknown): BadgeData {
  // clamp enums; sanitize colors via shared safe-color helper (fail-closed);
  // validate icon vs lucide allowlist (unknown→null); default text "Badge".
}

export function BadgeBlock({ data }: { data: BadgeData }) {
  const d = normalizeBadgeData(data);
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
- Defaults render a non-empty pill with `data-badge*`.
- Unsafe colors drop to default; valid token/hex/var preserved.
- `size`→correct `--text-*`; `shape`→radius class; `variant` resolves; unknown
  icon falls back.
- Editor: controls emit `data-widget-control-path`; swatch-only colors; clear
  removes the color.

## Security Contract

- **No new endpoints.** Persists via the existing widget save path (admin session
  + existing perms/CSRF).
- **Color sink:** `background`/`textColor` via the shared safe-color normalizer
  (reuse navigation/divider); no `url()`/`calc()`/`expression()`/raw CSS;
  token-backed CSS vars, not interpolated raw hex.
- **Icon sink:** validated against a fixed lucide allowlist; unknown→null (no
  dynamic component/string eval). Reject unknown schema fields; clamp enums.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/badge.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/badge-editor-wave.test.tsx`
- `bun run test:vitest` (widget registry / pack-matrix validation)
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/BADGE.md` (new), `_docs/WIDGETS.md`,
  `_docs/WIDGET_PACK_MATRIX.md`, `core/widgets/modulePackMatrix.ts` ↔ docs sync.
- `_docs/_TASKS/TASK-471-04*.md` status; changelog rolled up by TASK-471-05.
