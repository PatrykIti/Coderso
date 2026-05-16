# TASK-276-06: Newsletter Visual Style, Width, and Contrast Controls

# FileName: TASK-276-06_Newsletter_Visual_Style_Width_and_Contrast_Controls.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render + Design Tokens + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-276, TASK-276-01
**Status:** To Do

---

## Overview

Add Newsletter-local visual controls that the report identifies as missing:
text color, button color, width, contrast feedback, background picker clarity,
mobile breakpoint variants, and explicit spacing resolver handling.

This leaf must stay local to Newsletter. Generic clear semantics, CSS-variable
preservation, and design-token helper work stay with TASK-256-02 when they are
cross-widget.

## Scope Boundary

This leaf owns:

- Newsletter text color and CTA color controls when schema/default/render/editor
  tests move together.
- Newsletter width/max-width control replacing hardcoded `max-w-xl` with
  bounded options.
- Contrast diagnostics for configured text/button/background combinations.
- Background color picker clarity for `transparent`.
- Optional breakpoint variant control if the product decision remains valid
  after base mobile behavior guidance in TASK-276-04.
- Explicit `"md"` spacing resolver handling and local normalizer cleanup.

This leaf does not own:

- Cross-widget clear/none/color-token semantics from TASK-256-02.
- Global design token system changes.
- Arbitrary class names, raw CSS, custom HTML, or unbounded style input.
- General page/container layout redesign.

## Sub-Tasks

- [ ] Add `style.width?: "narrow" | "default" | "wide" | "full"` with
  backward-compatible default matching current `max-w-xl`.
- [ ] Add bounded `style.textColor`, `style.buttonBackground`, and
  `style.buttonTextColor` fields using existing clearable style helpers.
- [ ] Add editor controls for those fields with clear behavior aligned to
  TASK-256-02 if the shared helper has landed.
- [ ] Add a non-blocking contrast diagnostic that flags likely WCAG AA failures
  without storing scanner results in widget JSON.
- [ ] Make `transparent` background picker state explicit so the user sees that
  `#ffffff` is only the picker fallback, not the saved value.
- [ ] Add explicit `"md"` branch to `resolveNewsletterSpacing`.
- [ ] Decide whether per-breakpoint variant selection is still needed after
  variant-card mobile guidance; if implemented, keep it bounded and tested.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Extend style schema/defaults/normalizer/render for width/colors/breakpoint variant if approved; add explicit `md` resolver branch. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add bounded Visual style controls, background fallback note, and contrast diagnostics. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover width/color render, cleared styles, explicit `md`, and mobile variant data if added. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover style controls, clear behavior, fallback note, and contrast diagnostics. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update when clear/default style adjacency changes. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults change. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document style controls and contrast limitations. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Newsletter pack readiness/completeness changes. |

## Implementation Pseudocode

```ts
type NewsletterStyle = {
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  alignment?: "start" | "center" | "end";
  width?: "narrow" | "default" | "wide" | "full";
  background?: string;
  textColor?: string;
  buttonBackground?: string;
  buttonTextColor?: string;
  mobileVariant?: "stacked" | "inherit";
};

const widthClassMap = {
  narrow: "max-w-md",
  default: "max-w-xl",
  wide: "max-w-3xl",
  full: "max-w-none",
} as const;

function resolveNewsletterSpacing(value: string | undefined): NewsletterSpacing {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
}
```

Contrast diagnostic shape:

```ts
type ContrastDiagnostic = {
  status: "unknown" | "pass" | "warning";
  message: string;
};

function getNewsletterContrastDiagnostic(style: NewsletterStyle): ContrastDiagnostic {
  if (!isHex(style.background) || !isHex(style.textColor)) {
    return { status: "unknown", message: "Contrast uses theme tokens or transparent values." };
  }
  return contrastRatio(style.background, style.textColor) >= 4.5
    ? { status: "pass", message: "Text contrast appears readable." }
    : { status: "warning", message: "Text contrast may fail WCAG AA." };
}
```

Error handling:

- Invalid colors resolve through existing clearable style behavior and never
  render raw unsafe CSS values.
- Width options are enum-only; missing legacy width maps to current `max-w-xl`.
- Contrast diagnostics are advisory and must not block saves unless a later
  accessibility policy explicitly requires it.
- Per-breakpoint variant config must not conflict with the base `variant` value;
  if ambiguous, keep it deferred and document the reason.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin editing and public rendering.
- Reject-unknown validation: style schema remains `additionalProperties: false`
  and enum/color fields are bounded.
- Anti-abuse: style fields cannot carry raw scripts, arbitrary classes, or
  unbounded CSS.
- Secret handling: no secrets in style diagnostics or data attributes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/WIDGETS.md` only if general widget style contract wording changes.
- `_docs/WIDGET_PACK_MATRIX.md` only if readiness/completeness changes.
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` rows UX-01, BUG-05, BF-02,
  BF-03, BF-06, BF-15, and A5 after validation.

## Changelog Policy

- Covered by the TASK-276 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Newsletter width and color controls render through bounded schema fields.
- Transparent background picker behavior is clear to the editor user.
- Contrast diagnostics are visible and do not store privileged or scanner data.
- `resolveNewsletterSpacing("md")` is explicit and covered.
- Style additions do not duplicate generic TASK-256 clear/token helper work.
