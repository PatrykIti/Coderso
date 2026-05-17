# TASK-266-03: FAQ Accordion SEO Structured Data Contract

# FileName: TASK-266-03_FAQ_Accordion_SEO_Structured_Data_Contract.md

**Priority:** High
**Category:** Widgets + Content + Runtime Render + SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-266-02, TASK-266
**Status:** To Do

---

## Overview

Add optional FAQPage JSON-LD output for FAQ Accordion.

This leaf covers report row W9. The JSON-LD output must be deterministic,
schema-owned, safe, and derived from normalized FAQ data.

## Scope Boundary

In scope:

- `seo.emitFaqJsonLd?: boolean` or equivalent bounded option;
- default-off or default-on decision documented in `_docs/_WIDGETS/FAQ.md`;
- JSON-LD output generated from normalized question text and sanitized answer
  plain text;
- tests proving disabled, enabled, sparse, and script-breakout payload cases.

Out of scope:

- site-wide SEO settings;
- route-level metadata services;
- analytics, sitemap, or search-index changes;
- schema.org types other than FAQPage.

## Sub-Tasks

- [ ] Add a small `seo` object to `FaqAccordionData` with an explicit
  `emitFaqJsonLd` boolean.
- [ ] Add `buildFaqAccordionJsonLd()` next to the FAQ domain contract so render
  and tests use one owner.
- [ ] Use TASK-266-02 plain-text extraction for rich answers.
- [ ] Render a single `<script type="application/ld+json">` only when enabled
  and at least one normalized Q/A pair is non-empty.
- [ ] Add a Visual editor control with copy that explains the public
  output without exposing implementation details.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/faqAccordion.tsx` | Extend schema/types/defaults/normalizer; add JSON-LD builder and renderer output. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add SEO toggle in the appropriate mode. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Add JSON-LD structure, script-safe serialization, disabled-state, sparse-content, and `</script>`/U+2028/U+2029 payload assertions. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add editor toggle assertion. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fixture coverage requires `seo`. |

## Implementation Pseudocode

JSON-LD builder:

```ts
export function buildFaqAccordionJsonLd(data: FaqAccordionData) {
  const normalized = normalizeFaqAccordionData(data);
  if (!normalized.seo?.emitFaqJsonLd) return null;

  const mainEntity = normalized.items
    .map((item) => ({
      "@type": "Question",
      name: item.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: extractFaqAnswerPlainText(item),
      },
    }))
    .filter((entry) => entry.name.length > 0 && entry.acceptedAnswer.text.length > 0);

  return mainEntity.length > 0
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity }
    : null;
}
```

Renderer flow:

```tsx
const jsonLd = buildFaqAccordionJsonLd(normalizedData);
const serializedJsonLd = jsonLd ? serializeJsonLdForScript(jsonLd) : null;

{serializedJsonLd ? (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: serializedJsonLd }}
  />
) : null}
```

Error handling:

- Empty or whitespace-only Q/A pairs are omitted from `mainEntity`.
- Unsafe rich answer syntax never reaches JSON-LD as HTML.
- `serializeJsonLdForScript()` must JSON-stringify the object and escape `<`,
  `>`, `&`, U+2028, and U+2029 before insertion into a script tag.
- JSON-LD text extraction must reuse TASK-266-02 bounds so oversized answers
  are truncated or omitted before serialization.
- Unknown `seo` fields are rejected by schema validation.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: `seo` object must use `additionalProperties:
  false`.
- Anti-abuse: JSON-LD is built only from normalized strings and serialized
  through `serializeJsonLdForScript()`, not raw `JSON.stringify`, so
  user-authored FAQ text cannot break out of the script tag.
- Output bounds: JSON-LD question/answer text uses the same max-length policy as
  the runtime answer renderer and must be tested with oversized FAQ payloads.
- Secret handling: no private URLs, tokens, or secrets in structured data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before any manual commit that includes this leaf, also run:
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FAQ.md` with the FAQPage JSON-LD option.
- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` row W9 after
  validation.

## Changelog Policy

- Covered by the TASK-266 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- JSON-LD is emitted only when enabled and is derived from normalized safe FAQ
  data.
- The renderer emits no duplicate FAQPage scripts for one widget instance.
- Tests cover script-safe serialization, disabled state, sparse content, and
  validator behavior.
