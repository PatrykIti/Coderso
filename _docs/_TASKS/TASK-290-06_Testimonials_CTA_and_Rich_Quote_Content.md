# TASK-290-06: Testimonials CTA and Rich Quote Content

# FileName: TASK-290-06_Testimonials_CTA_and_Rich_Quote_Content.md

**Priority:** Medium
**Category:** Widgets + Testimonials + Runtime Render + Admin UI + Content
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-290
**Status:** Done (2026-05-22)

---

## Overview

Add a Testimonials-owned conversion CTA below the testimonial list and a bounded
rich quote model that supports simple emphasis without raw HTML.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:228-230` BF-07 CTA below the testimonials
  section.
- `REPORT_TESTIMONIALS_WIDGET.md:244-246` BF-11 rich text for quote.

## Scope Boundary

In scope:

- Add an optional section CTA with label, href, target policy, and style tokens.
- Reuse existing safe href helpers and TASK-256 link/accessibility results.
- Add bounded quote formatting through a Testimonials-owned `quoteHtml` field
  sanitized by the existing posts/rich-text HTML policy, limited to
  paragraph/line-break/emphasis/link markup and paired with the legacy plain
  `quote` fallback.
- Keep plain-text quote fallback for legacy payloads and SEO/plain-text uses.

Out of scope:

- Generic CTA helper creation unless TASK-256 already provides it.
- Unsanitized/raw HTML quote storage.
- Arbitrary markdown parsing without a bounded sanitizer.
- Third-party review embeds.

## Sub-Tasks

- [x] Extend schema/types/defaults with an optional `cta` object.
- [x] Extend each testimonial item with an optional sanitized `quoteHtml` field
  and a deterministic plain-text extraction path for fallback/SEO uses.
- [x] Render CTA after the list with safe href/target/rel behavior.
- [x] Add Visual controls for CTA and rich quote formatting.
- [x] Add tests for legacy plain quotes, rich quote rendering, and safe CTA
  behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Add CTA and rich quote schema/normalizer/render behavior. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add CTA controls and quote formatting editor controls. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add renderer and normalizer tests for CTA and rich quotes. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add editor tests for CTA and rich quote controls. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run/update if safe-href integration changes. |
| `tests/unit/widgets/validator.test.ts` | Run/update when schema/defaults change. |

## Implementation Pseudocode

CTA model:

```ts
type TestimonialsCta = {
  enabled?: boolean;
  label?: string;
  href?: string;
  target?: "same-tab" | "new-tab";
  style?: "primary" | "secondary" | "link";
};
```

Rich quote model:

```ts
type TestimonialsQuoteHtml = string | undefined;

function normalizeQuoteHtml(value: string | undefined) {
  if (!value || value.trim().length === 0) return undefined;
  return sanitizeHtmlWithPolicy(value, {
    allowedTags: ["p", "br", "strong", "em", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    linkPolicy: { allowRelative: true, allowHash: true, allowHttp: true },
  });
}

function getPlainQuote(item: TestimonialItem) {
  if (item.quoteHtml?.trim()) {
    return htmlToPlainText(item.quoteHtml, ["p", "br", "strong", "em", "a"]);
  }
  return item.quote ?? "";
}
```

Error handling:

- Invalid CTA hrefs fail closed at runtime and surface editor feedback.
- Unknown CTA style/target values normalize to safe defaults.
- Invalid or unsafe quote markup is stripped during normalization without
  dropping the plain quote fallback.

Regression test shape:

- `tests/vitest/widgets/testimonials.test.tsx`
  - Legacy plain `quote` still renders.
  - Sanitized `quoteHtml` preserves bounded emphasis/link markup and strips
    unsafe tags/attrs.
  - CTA href normalization drops unsafe links while preserving valid relative,
    hash, and http/https links.
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - CTA controls and quote-formatting controls patch only Testimonials-owned
    fields and preserve the plain quote fallback.
- `tests/vitest/widgets/widgetSafeHref.test.ts`
  - Run when shared href helper behavior changes.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: CTA and quote fields must be explicit in schema.
- Anti-abuse: CTA hrefs must use shared safe href behavior; quote formatting
  must not store or render raw HTML, scripts, inline handlers, or arbitrary CSS.
- Secret handling: no secrets or privileged URLs in CTA or quote data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when CTA
  href behavior changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` with CTA and rich quote data model.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` BF-07 and BF-11
  status after implementation.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Testimonials can render a safe CTA below the testimonial list.
- Quotes can use bounded formatting while legacy plain-text quotes still render.
- Tests prove unsafe links and unsafe rich content cannot reach public runtime
  output.

## Completion Notes (2026-05-22)

- Testimonials now supports an optional schema-owned CTA with bounded
  `enabled`, `label`, `href`, `target`, and `style` fields rendered below the
  list through safe link-attribute resolution.
- Each testimonial item may now persist sanitized `quoteHtml` with legacy plain
  `quote` fallback, so rich emphasis and links stay bounded and fail closed for
  unsafe markup.
- Widget and editor coverage now proves safe CTA rendering, unsafe CTA/HTML
  rejection, and synchronized rich-quote authoring behavior.
