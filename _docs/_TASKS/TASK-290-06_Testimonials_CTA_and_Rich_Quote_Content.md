# TASK-290-06: Testimonials CTA and Rich Quote Content

# FileName: TASK-290-06_Testimonials_CTA_and_Rich_Quote_Content.md

**Priority:** Medium
**Category:** Widgets + Testimonials + Runtime Render + Admin UI + Content
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-290
**Status:** To Do

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
- Add bounded quote formatting such as emphasis, strong, and line breaks through
  a safe structured representation or an existing safe rich text helper.
- Keep plain-text quote fallback for legacy payloads and SEO/plain-text uses.

Out of scope:

- Generic CTA helper creation unless TASK-256 already provides it.
- Raw HTML quote storage.
- Arbitrary markdown parsing without a bounded sanitizer.
- Third-party review embeds.

## Sub-Tasks

- [ ] Extend schema/types/defaults with an optional `cta` object.
- [ ] Decide the rich quote representation and add a plain-text extraction path.
- [ ] Render CTA after the list with safe href/target/rel behavior.
- [ ] Add Visual controls for CTA and rich quote formatting.
- [ ] Add tests for legacy plain quotes, rich quote rendering, and safe CTA
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
  label?: string;
  href?: string;
  target?: "self" | "blank";
  style?: "primary" | "secondary" | "link";
};
```

Rich quote model:

```ts
type TestimonialQuote =
  | string
  | {
      text: string;
      marks?: Array<{ type: "strong" | "em"; start: number; end: number }>;
    };

function getPlainQuote(quote: TestimonialQuote | undefined) {
  return typeof quote === "string" ? quote : quote?.text ?? "";
}
```

Error handling:

- Invalid CTA hrefs render no link and surface editor feedback.
- Unknown CTA style/target values normalize to safe defaults.
- Invalid rich quote mark ranges are dropped without dropping the plain quote.

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
- If committed separately from TASK-290-08, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

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
