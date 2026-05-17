# TASK-263-03: CTA Banner Visual Style and Button Controls

# FileName: TASK-263-03_CTA_Banner_Visual_Style_and_Button_Controls.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render + Style Controls
**Estimated Effort:** Large
**Dependencies:** TASK-263, TASK-263-01, TASK-256-02, TASK-256-07
**Status:** Done (2026-05-17)

---

## Overview

Add CTA Banner-owned Visual style controls and button shape/emphasis options.

This leaf covers CTA-specific field wiring and product controls. It does not own
the shared Clear/none/token semantics from TASK-256-02. If TASK-256-02 has not
landed the final shared helper, do not invent a CTA-only replacement; keep the
CTA wiring blocked or split the shared helper first. TASK-256-02 is now landed,
so `UX-01` in this leaf means consuming that shared Clear contract for CTA-owned
text/button fields, not redefining generic Clear behavior inside CTA Banner.

## Sub-Tasks

- [ ] Wire `onClear` for CTA-owned text color fields: `text`, `badgeText`,
  `primaryButtonText`, and `secondaryButtonText`, using the landed shared
  Clear helpers from TASK-256-02 without redefining generic semantics.
- [ ] Move CTA-owned `primaryButtonBorder` and `secondaryButtonBorder` controls
  from Advanced-only scope into Visual while leaving Advanced as raw token
  editing.
- [ ] Add a CTA-owned button radius model that can inherit container radius or
  use explicit button shapes.
- [ ] Add a CTA-owned button size/emphasis model so primary and secondary
  buttons do not have to share identical `px-4 py-2 text-sm` classes.
- [ ] Keep all new button style fields schema-owned and normalized in
  `normalizeCtaBannerData()`.
- [ ] Preserve backward compatibility: old payloads must render with the current
  `rounded-md`, `text-sm`, and padding behavior unless a new field is present.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/ctaBanner.tsx` | Add button radius/size enums, defaults, schema, normalizer, and runtime class/style resolution. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Add Visual controls for button borders, radius, and size/emphasis; wire CTA-owned text/button Clear actions through the landed TASK-256-02 helper contract. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Cover schema/normalizer/runtime classes for button radius and size plus clearable text fields only if CTA-local Clear wiring is explicitly in scope. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover Visual controls, Advanced raw token retention, and no duplicate/no-op style rows. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update only if this leaf touches shared Clear/none semantics after TASK-256-02. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults change. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document style and button controls. |

## Implementation Pseudocode

```ts
type CtaButtonRadius = "inherit" | "none" | "md" | "lg" | "xl" | "2xl" | "pill";
type CtaButtonSize = "none" | "sm" | "md" | "lg";

type CtaBannerData = {
  style?: {
    buttonRadius?: CtaButtonRadius;
    primaryButtonSize?: CtaButtonSize;
    secondaryButtonSize?: CtaButtonSize;
  };
};
```

Class resolvers:

```ts
function resolveButtonRadius(value: string | undefined, container: CtaBannerRadius) {
  if (value === "inherit") {
    return container === "none" ? "" : radiusClassMap[container] || "rounded-md";
  }
  if (value === "pill") return "rounded-full";
  if (
    value === "none" ||
    value === "md" ||
    value === "lg" ||
    value === "xl" ||
    value === "2xl"
  ) {
    return buttonRadiusClassMap[value];
  }
  return "rounded-md";
}

function resolveButtonSize(value: string | undefined) {
  if (value === "none") return "";
  if (value === "sm") return "px-3 py-1.5 text-xs";
  if (value === "lg") return "px-5 py-2.5 text-base";
  return "px-4 py-2 text-sm";
}
```

Shared Clear wiring using the landed TASK-256-02 contract:

```tsx
<ColorField
  label="Text color"
  value={normalized.style?.text}
  onChange={(next) => updateStyle(value, onChange, { text: next })}
  onClear={() => clearStyleField(value, onChange, "text")}
/>
```

Error handling:

- Invalid button radius/size values fall back to existing visual behavior.
- If Clear wiring is in scope, clearing a style field removes the key and lets
  the shared default/preview behavior handle fallback.
- Advanced still exposes raw tokens for technical border fields; Visual owns
  day-to-day button border editing.
- Do not serialize `none` or `transparent` as Clear sentinels.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: add every new style enum to `ctaBannerSchema` and
  validator coverage.
- Anti-abuse: style fields must be enums or existing color/token strings. Do
  not add arbitrary class names, scripts, inline event handlers, or unbounded
  CSS blobs.
- Secret handling: no secrets in style data, diagnostics, tests, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
  when shared Clear/none behavior is touched
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CTA_BANNER.md` with button border, button radius, and
  button size controls; document CTA-owned text/button Clear wiring as a
  consumption of the landed TASK-256-02 contract.
- Update `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` rows UX-02, BUG-05
  report alias for BF-01, BF-01, and BF-07 after validation. UX-01 remains
  routed to TASK-256-02 unless explicitly reclassified.

## Changelog Policy

- Covered by the TASK-263 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- CTA Visual mode exposes all day-to-day button colors/borders without forcing
  users into Advanced.
- CTA text/button Clear behavior is wired here through the landed TASK-256-02
  helper contract without redefining generic semantics.
- Primary and secondary buttons can differ in emphasis and shape without
  breaking existing saved pages.
- New style controls are schema-owned, normalized, documented, and tested.
