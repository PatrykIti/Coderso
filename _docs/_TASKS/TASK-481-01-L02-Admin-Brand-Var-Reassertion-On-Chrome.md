# TASK-481-01-L02: Admin Brand-Var Re-Assertion on Section/Block Chrome

# FileName: TASK-481-01-L02-Admin-Brand-Var-Reassertion-On-Chrome.md

**Parent Subtask:** TASK-481-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Add `adminBrandColorCssVariableMap` — a tiny CSS-var map that re-asserts the
ADMIN brand colors (`--color-primary/-secondary/-accent/-border` → the admin shadcn
base `var(--primary)/var(--secondary)/var(--accent)/var(--border)`) — and apply it
as inline style on the canvas `<section>` chrome frame and the block chrome frame
`<div>`. This guarantees chrome (selection `outline-primary`/`ring-primary`, type
badge `bg-primary`, override badge `text-primary`, ghost tiles) keeps the admin
theme EVEN WHEN a nested chrome element sits inside an ancestor `data-page-editor-content`
scope that (after TASK-481-02) defines the SITE brand vars. Blocks nest (columns
slots → child blocks, each with its own chrome), so without this re-assertion a
child block's chrome would inherit a parent content scope's site brand.

**Owning module(s) to create-or-extend:**
- `core/ui/theme/tokenCss.ts` — add `adminBrandColorCssVariableMap` (co-located with
  the other canvas/token maps; a static constant map, no token argument).
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` — apply the map as inline
  `style` on the `<section>` frame (~908) and the block frame `<div>` (~1058), merged
  with the existing `frameLayoutStyle` from L01.

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md` (Admin UI maps tokens to shadcn vars via `--admin-*`; the
  admin `@theme` brand `--color-*` come from the admin theme).
- `_docs/THEMES_SPEC.md` (admin shell has its own theme system, independent of the
  front).

**Out-of-scope:** Emitting the SITE brand map (TASK-481-02); editing
`core/admin/styles/globals.css` (the `@theme {` block stays owned by TASK-479-05-L03
— this leaf only MIRRORS its brand mapping in a JS const, it does not edit CSS).

## Security Contract

Not a route/auth/data leaf — N/A by surface, stated explicitly:
- **Endpoint visibility / Auth / RBAC / CSRF / rate-limit:** none / unchanged. No
  endpoint, no request, no permission surface; admin-only client render styling.
- **Validation:** unchanged. The map contains only fixed literal `var(--primary)`
  references (no user input); the page-color sanitizer
  (`pageAuthoringSanitizers.ts`) remains the single validation owner for stored
  values and is untouched.
- **Secret/PII handling:** none.

## Implementation Pseudocode

Admin base brand vars already exist in `core/admin/styles/globals.css` `@layer base`
(`--primary: var(--admin-button-primary-bg)` :166, `--secondary` :171, `--accent` :173,
`--border` :184) and the `@theme {` block maps `--color-primary: var(--primary)` (:10),
`--color-secondary: var(--secondary)` (:12), `--color-accent: var(--accent)` (:14),
`--color-border: var(--border)` (:22). Re-assert that same brand mapping as an inline
scope:

```ts
// core/ui/theme/tokenCss.ts
/**
 * Re-asserts the ADMIN brand --color-* (mirroring the globals.css `@theme {` brand
 * mapping) so editor chrome keeps the admin theme even when nested inside a
 * `data-page-editor-content` scope that defines the SITE brand vars (TASK-481).
 * Static literals only — no token argument, no user input.
 */
export const adminBrandColorCssVariableMap: Record<string, string> = {
  "--color-primary": "var(--primary)",
  "--color-secondary": "var(--secondary)",
  "--color-accent": "var(--accent)",
  "--color-border": "var(--border)",
};
```

```tsx
// PageAuthoringCanvas.tsx — section frame (~908)
<section
  className={/* unchanged chrome classes */}
  style={adminBrandColorCssVariableMap as CSSProperties}
  data-page-editor-section={section.type} ...>

// block frame (~1058) — merge with L01 frameLayoutStyle
<div
  className={/* unchanged chrome classes */}
  style={{ ...adminBrandColorCssVariableMap, ...frameLayoutStyle } as CSSProperties}
  {...blockRenderProps.dataAttributes} ...>
```

Notes for the implementer:
- Import the const into PageAuthoringCanvas.tsx from `../../../../ui/theme/tokenCss`
  (same relative depth the file already uses, e.g. the `getPageEditorColorPalette`
  import is `../../../../services/...`; verify the exact `../` count at edit time).
- The map must win for chrome regardless of an ancestor site-brand scope, which it
  does because it is defined ON the chrome frame element itself (closest definition
  wins in the CSS custom-property cascade).
- `--color-bg/-surface/-text` are intentionally NOT in this map — neutrals are not
  consumed by `core/admin/ui/pages` chrome, and re-asserting them would fight the
  TASK-477-02 neutral emission on the frame.
- Keep `--color-border` admin on chrome (block outlines / `border-border` chrome read
  it) while the content scope later overrides it to the site value for block borders.
- **Error handling:** none; static styling.

**Regression-test shape (for L03):** assert both `<section>` and block frame carry
`--color-primary: var(--primary)` (admin) inline; assert a CHILD block's chrome,
rendered inside a parent content scope, still resolves admin brand (the re-assertion
is present on the child frame).

## Testing Requirements

- Vitest lane: `tests/vitest/ui/page-authoring-canvas.test.tsx` (structure) and
  `tests/vitest/ui/themeTokens.test.ts` (the const's exact 4-key shape and literal
  `var(--*)` values, parity with the `globals.css` `@theme` brand mapping names).
- Cases: section + block frame both carry the admin re-assertion; nested child frame
  carries it too; map omits the three neutrals.
- No DB migration artifacts (no schema/DB change).
