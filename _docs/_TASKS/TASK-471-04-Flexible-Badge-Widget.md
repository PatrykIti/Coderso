# TASK-471-04: Flexible Badge Widget
# FileName: TASK-471-04-Flexible-Badge-Widget.md

**Parent Task:** TASK-471
**Priority:** Medium
**Category:** Widgets / Core
**Estimated Effort:** Medium
**Dependencies:** TASK-471-01 (text-size scale `xs`/`2xs`); TASK-336 (widget
editor contract V2)
**Status:** ⏳ To Do

---

## Overview

There is no page-builder badge/pill/chip. The owner wants a flexible badge the
author can shape freely (text, color, size, shape, optional icon). Ship a new
**dedicated core widget** `badge` — consistent with the Page Editor V2 vision
(dedicated widgets, not native blocks) — following the established atomic-widget
contract (divider/spacer are the templates).

The widget consumes the new `xs`/`2xs` text-size steps from TASK-471-01 (badges
are small by nature) and uses the existing token-backed, clearable, swatch-only
color controls.

---

## Current State (verified)

- No `badge` page-builder widget. An admin-only component exists
  (`core/admin/components/ui/badge.tsx`) — UI chrome, **not** a widget; do not
  promote it directly.
- Atomic-widget templates: `core/widgets/core/divider.tsx` (token enums, CSS
  value maps, `*EditorContract` v2, schema, defaults, normalizers with color
  regex/clamp safety, render component) and `core/widgets/core/spacer.tsx`
  (smaller; responsive per-device values).
- Editor template: `core/admin/ui/widgets/editors/DividerEditors.tsx`
  (Wizard/Visual/Advanced `WidgetEditorProps<T>` components, swatch-only color,
  `data-widget-control-path` metadata).
- Registry: `core/widgets/core/index.ts` (metadata: complexity/audience/module/
  presets/surfaces) and `core/widgets/modulePackMatrix.ts` (module coverage).
- Color vocab + clearable color pattern reference:
  `core/widgets/core/navigation.tsx` (hex/var/rgb/hsl, transparent allowed) and
  the clearable color helper used by divider.
- Tests: `tests/vitest/widgets/divider.test.tsx`,
  `tests/vitest/ui/divider-editor-wave.test.tsx` (templates).
- Docs: `_docs/_WIDGETS/DIVIDER.md` / `SPACER.md` (template),
  `_docs/WIDGETS.md`, `_docs/WIDGET_PACK_MATRIX.md`.

---

## Design decisions (defaults — confirm in closure)

- **Kind:** atomic, dedicated widget (single element, no slots). Audience:
  intermediate. **Module:** `content` (alongside other generic UI primitives) —
  do not invent a new module unless the owner wants a `ui-components` group.
- **Props (`BadgeData`):** `text` (string), `variant` (`solid` | `soft` |
  `outline`), `color` (token-backed background + auto/explicit text color, all
  clearable), `size` (`2xs`|`xs`|`sm`|`md` → maps to `--text-*`), `shape`
  (`pill` | `rounded` | `square` → radius), `weight` (normal|medium|semibold),
  optional `icon` (validated lucide name) + `iconPosition` (start|end).
- **Render:** inline-flex pill; token-backed colors via CSS vars
  (`var(--color-*)`), never hardcoded hex; `role`/`aria` appropriate; text
  truncation safe; `data-badge` / `data-badge-variant` / `data-badge-size` hooks.
- **Interplay:** sizes reuse the 471-01 scale; honors the 471-02 align contract
  when placed on the canvas; per-fragment color (471-03) is not required inside
  the badge label for v1.

---

## Sub-Tasks

- [ ] `core/widgets/core/badge.tsx`: `BadgeData` type, `badgeSchema` (reject
      unknown), `badgeDefaults`, token enums + CSS value maps, `normalizeBadge*`
      (color safety, size/variant/shape clamps, icon-name validation),
      `badgeEditorContract` v2 (wizard/visual/advanced with
      writablePaths/readOnlyPaths), and `BadgeBlock` render component.
- [ ] `core/admin/ui/widgets/editors/BadgeEditors.tsx`: `BadgeWizardEditor`
      (variant/size quick start), `BadgeVisualEditor` (text + icon picker +
      swatch-only colors + size/shape/weight + clear actions),
      `BadgeAdvancedEditor` (read-only diagnostics, no raw payloads).
- [ ] Register in `core/widgets/core/index.ts` (metadata + `createCoreWidget*`
      + `registerCoreWidgets`) and add the pack-matrix entry in
      `modulePackMatrix.ts`.
- [ ] Tests: `tests/vitest/widgets/badge.test.tsx` (defaults render, normalize,
      color safety, size/shape/variant resolution, schema) and
      `tests/vitest/ui/badge-editor-wave.test.tsx` (3 modes, control paths,
      swatch-only inputs, clear actions, icon picker).
- [ ] `_docs/_WIDGETS/BADGE.md` + `WIDGETS.md` + `WIDGET_PACK_MATRIX.md` updates.

---

## Implementation Pseudocode

```ts
// core/widgets/core/badge.tsx (modelled on divider.tsx)
export const badgeVariants = ["solid", "soft", "outline"] as const;
export const badgeShapes = ["pill", "rounded", "square"] as const;
export const badgeSizes = ["2xs", "xs", "sm", "md"] as const;          // reuses 471-01 scale
export const badgeSizeCssValues: Record<BadgeSize, string> = {
  "2xs": `var(--text-2xs, 0.625rem)`, xs: `var(--text-xs, 0.75rem)`,
  sm: `var(--text-sm, 0.875rem)`, md: `var(--text-md, 1rem)`,
};

export type BadgeData = {
  text: string;
  variant: BadgeVariant;
  shape: BadgeShape;
  size: BadgeSize;
  weight: BadgeWeight;
  background?: string | null;   // clearable, token/hex/var, sanitized
  textColor?: string | null;    // clearable
  icon?: string | null;         // validated lucide name
  iconPosition: "start" | "end";
};

export function normalizeBadgeData(raw: unknown): BadgeData {
  // clamp enums to allowed sets; sanitize colors via the shared safe-color
  // helper (fail-closed → null); validate icon against the lucide allowlist
  // (unknown → null); default text to "Badge".
}

export function BadgeBlock({ data }: { data: BadgeData }) {
  const d = normalizeBadgeData(data);
  return (
    <span data-badge data-badge-variant={d.variant} data-badge-size={d.size}
      className={badgeShapeClass(d.shape) /* rounded-full | rounded | rounded-none */}
      style={{ fontSize: badgeSizeCssValues[d.size], fontWeight: badgeWeight(d.weight),
               backgroundColor: safe(d.background), color: safe(d.textColor) }}>
      {d.icon && d.iconPosition === "start" && <Icon name={d.icon} />}
      <span className="truncate">{d.text}</span>
      {d.icon && d.iconPosition === "end" && <Icon name={d.icon} />}
    </span>
  );
}
```

Data flow: editor (swatch-only colors, icon picker) → `BadgeData` →
`normalizeBadgeData` (safe, clamped) → `BadgeBlock` render (token-backed styles).
Legacy: zero existing badge payloads, so no migration; defaults must be sensible.

Regression-test shape:
- Defaults render a non-empty pill with `data-badge*` attributes.
- Unsafe colors drop to default; valid token/hex/var preserved.
- `size` maps to the correct `--text-*` value; `shape` maps to the right radius
  class; `variant` resolves; unknown icon falls back gracefully.
- Editor: each control emits `data-widget-control-path`; colors are swatch-only
  (no raw token text inputs); clear removes the color from data.

---

## Security Contract

- **No new endpoints.** Badge persists via the existing widget save path
  (admin session + existing perms/CSRF).
- **Color sink:** `background`/`textColor` pass the shared safe-color helper
  (reuse navigation/divider color normalizer); no `url()`/`calc()`/`expression()`/
  raw CSS; render uses token-backed CSS vars, not interpolated raw hex into
  `style=` strings.
- **Icon sink:** `icon` validated against a fixed lucide-name allowlist; unknown
  → null (no dynamic component/string-eval rendering).
- Reject unknown schema fields; clamp all enums. No secrets/provider keys.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/badge.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/badge-editor-wave.test.tsx`
- `bun run test:vitest` (widget registry / pack-matrix validation)
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/BADGE.md` (new), `_docs/WIDGETS.md`,
  `_docs/WIDGET_PACK_MATRIX.md`, `core/widgets/modulePackMatrix.ts` ↔ docs sync.
- `_docs/_TASKS/TASK-471*.md` (status), `_docs/_CHANGELOG/` on family closure.
