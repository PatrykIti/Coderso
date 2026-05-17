# TASK-263-01: CTA Banner Runtime Semantics and Accessibility

# FileName: TASK-263-01_CTA_Banner_Runtime_Semantics_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-263, TASK-256-07
**Status:** Done (2026-05-17)

---

## Overview

Repair CTA Banner runtime findings from
`_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` that are local to
`core/widgets/core/ctaBanner.tsx`.

This leaf covers empty badge output, configured text color truthfulness,
border-class consistency, explicit resolver defaults, section/action accessible
names, and CTA-local focus-visible styling. It must not introduce a generic
runtime/a11y helper that belongs in TASK-256-04.

## Sub-Tasks

- [ ] Update `CtaBannerBlock` to accept and use `blockId` for stable section and
  title IDs when the shared renderer passes it.
- [ ] Render the badge only when the normalized badge text is non-empty; the
  `with-badge` variant must not emit an empty pill.
- [ ] Apply the configured `style.text` to the description in a way that keeps
  the current 80 percent support-line emphasis without hardcoding
  `var(--color-text)`.
- [ ] Remove the unconditional `border` class when `borderWidth` resolves to
  `"0"` while preserving the inline border style for non-zero widths.
- [ ] Make `resolveCtaBannerBorderWidth`, `resolveCtaBannerRadius`, and
  `resolveCtaBannerPadding` explicitly accept their default enum values.
- [ ] Add section `aria-labelledby` when a title exists and deterministic
  `aria-label` fallback when it does not.
- [ ] Keep CTA action accessible names derived from visible CTA copy unless a
  concrete icon-only or ambiguous-label case is proven during implementation;
  do not add a persisted raw `aria-label` field for this leaf.
- [ ] Treat the badge as a visual CTA label with explicit semantics: either
  expose it as plain contextual text tied to the heading area or mark decorative
  output consistently if the final design treats badge copy as non-essential.
- [ ] Add a CTA-local contrast regression for description text using the
  configured `style.text` path; defer generic cross-widget contrast tooling to
  TASK-256 if a shared color validator is required.
- [ ] Add CTA-local `focus-visible` classes to primary and secondary links.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/ctaBanner.tsx` | Runtime rendering, resolver defaults, `blockId` usage, aria labels, focus-visible classes. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | SSR assertions for hidden empty badge, badge semantics, description color/contrast path, no border class when width is zero, explicit default resolver behavior, section labels, action labels, and focus classes. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared renderer coverage should assert CTA `blockId`/section output. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document runtime semantics and accessibility behavior after implementation. |

## Implementation Pseudocode

```tsx
function trimText(value: string | undefined) {
  return (value ?? "").trim();
}

function resolveCtaBannerTitleId(blockId: string | undefined) {
  return blockId ? `${blockId}-cta-title` : undefined;
}

function shouldRenderBadge(content: CtaBannerData["content"]) {
  return trimText(content?.badge).length > 0;
}
```

Renderer shape:

```tsx
export function CtaBannerBlock({ data, variant, blockId }: CtaBannerRenderProps) {
  const normalized = normalizeCtaBannerData(data);
  const title = trimText(normalized.content?.title);
  const titleId = title ? resolveCtaBannerTitleId(blockId) : undefined;
  const borderWidth = resolveCtaBannerBorderWidth(normalized.style?.borderWidth);

  return (
    <section
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : "Call to action"}
      data-cta-banner-outer="true"
    >
      <div className={joinClasses(borderWidth === "0" ? undefined : "border")}>
        {shouldRenderBadge(normalized.content) ? <span>{normalized.content?.badge}</span> : null}
        {title ? <h3 id={titleId}>{title}</h3> : null}
      </div>
    </section>
  );
}
```

Description style:

```tsx
const descriptionStyle = compactStyle({
  color: style.text ?? "var(--color-text)",
  opacity: 0.8,
});
```

Error handling:

- Missing `blockId` still renders a deterministic `aria-label`.
- Empty title does not create an empty `aria-labelledby` reference.
- Empty badge text does not render a badge node in any variant.
- Badge semantics must be deterministic: visible badge text is available to
  assistive technology, or decorative treatment is explicit and tested.
- Invalid enum values continue to fall back to current defaults.
- Existing payloads render without migration.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged. This leaf should not add a persisted
  action `aria-label` field unless a later concrete accessibility bug proves it
  is necessary and the task is explicitly re-scoped.
- Anti-abuse: accessible labels and badge semantics must be plain React text. Do
  not add raw HTML, scripts, event handlers, arbitrary classes, or unsafe href
  behavior.
- Secret handling: no secrets or private URLs in widget data, DOM attributes,
  report evidence, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer assertions change
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CTA_BANNER.md` with empty badge, section labelling,
  description color, border width, and focus-visible behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` rows BUG-01, BUG-02,
  BUG-03, BUG-04, A1, A3, A4, and A5 after validation. Reclassify A2 only if a
  concrete ambiguous-label case appears during implementation.

## Changelog Policy

- Covered by the TASK-263 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- `with-badge` never renders an empty badge pill.
- Description text follows the configured CTA text color while preserving the
  support-line visual hierarchy.
- `borderWidth="0"` produces no semantic border class or visible border.
- CTA section exposes a meaningful accessible name, and CTA actions keep
  meaningful accessible names from visible copy without raw aria-label
  persistence unless new concrete evidence requires more.
- Badge and description accessibility findings have explicit tests instead of
  relying on visual-only evidence.
- Keyboard focus state is visible without relying only on browser defaults.
