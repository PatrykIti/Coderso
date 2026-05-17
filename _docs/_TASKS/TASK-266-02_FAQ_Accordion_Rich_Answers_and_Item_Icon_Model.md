# TASK-266-02: FAQ Accordion Rich Answers and Item Icon Model

# FileName: TASK-266-02_FAQ_Accordion_Rich_Answers_and_Item_Icon_Model.md

**Priority:** High
**Category:** Widgets + Content + Runtime Render + Admin UI + Security
**Estimated Effort:** Large
**Dependencies:** TASK-266
**Status:** Done (2026-05-17)

---

## Overview

Add FAQ-specific rich answer formatting and optional item icons without opening
the widget to unsafe HTML.

This leaf covers report rows W10 and W11. It must keep FAQ answers safe for
public runtime output and preserve the beginner-friendly content model.

## Scope Boundary

In scope:

- bounded markdown answer formatting for links, bold, italic, inline code, and
  simple lists; raw HTML remains rejected;
- optional per-item icon/emoji field rendered before the question;
- editor controls for answer format and item icon;
- plain-text extraction helper for downstream JSON-LD in TASK-266-03.

Out of scope:

- arbitrary HTML, custom scripts, embeds, iframes, or raw event handlers;
- full WYSIWYG editor infrastructure;
- shared rich-text contract changes outside FAQ.

## Sub-Tasks

- [ ] Extend `FaqAccordionItem` with `icon?: string` and `answerFormat?: "plain" | "markdown"`.
- [ ] Add explicit schema and normalizer bounds for FAQ text and markdown:
  question length, answer length, icon length, link href length, markdown token
  count, list item count, and rendered node count.
- [ ] Add a safe FAQ answer renderer that supports only a bounded markdown
  subset. Prefer a small FAQ-local parser that renders React nodes; if HTML is
  introduced internally, route it through the existing
  `sanitizeRichTextHtml()` / `sanitizeHtmlWithPolicy()` owner before output.
- [ ] Add `extractFaqAnswerPlainText()` so SEO JSON-LD can use sanitized text
  instead of duplicating markdown parsing.
- [ ] Add Wizard/Visual controls for item icon and rich answer mode without
  making the Wizard feel technical.
- [ ] Keep Advanced diagnostics technical-only and avoid duplicating the Visual
  rich-answer controls there.
- [ ] Preserve legacy `answer` strings as plain text by default.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/faqAccordion.tsx` | Extend item schema/types/defaults/normalizer; add safe answer rendering and plain-text extraction. Add enum and length constraints for `question`, `answer`, `answerFormat`, `icon`, link hrefs, markdown tokens, list items, and rendered nodes. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add per-item icon and answer-format controls in Wizard/Visual as appropriate. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Add SSR assertions for safe markdown output, escaping, malicious markdown/link payloads, oversized markdown/JSON-LD payloads, icon bounds, and plain-text extraction. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add editor assertions for icon and answer-format updates. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fixture coverage requires new item fields. |

## Implementation Pseudocode

Safe renderer shape:

```tsx
type FaqAnswerFormat = "plain" | "markdown";

function renderFaqAnswer(item: FaqAccordionItem) {
  if (item.answerFormat !== "markdown") {
    return item.answer;
  }

  return renderFaqMarkdownNodes(item.answer ?? "", {
    allowedInline: ["strong", "em", "code", "a"],
    allowedBlocks: ["p", "ul", "ol", "li"],
    sanitizeHref: (href) =>
      normalizeWidgetSafeHref(href, {
        allowRelative: true,
        allowHash: true,
        allowHttp: true,
      }),
    allowRawHtml: false,
  });
}
```

Plain-text extraction:

```ts
export function extractFaqAnswerPlainText(item: FaqAccordionItem): string {
  const source = item.answer ?? "";
  if (item.answerFormat !== "markdown") return source.trim();
  return stripFaqMarkdownToText(source).trim();
}
```

Editor flow:

```tsx
function updateItemAnswerMode(index: number, answerFormat: FaqAnswerFormat) {
  updateItem(value, onChange, index, { answerFormat });
}

function updateItemIcon(index: number, icon: string) {
  updateItem(value, onChange, index, { icon: icon.trim().slice(0, 16) });
}
```

Error handling:

- Unsupported answer formats normalize to `plain`.
- Oversized questions, answers, icons, hrefs, token streams, list items, and
  rendered markdown nodes are clamped or rejected through one documented helper
  before render.
- Unsafe links render as plain text or are omitted according to the existing
  safe-href helper.
- Empty icons are omitted.
- `icon` is trimmed and length-clamped in the normalizer before persistence.
- Markdown supports the documented subset only; raw HTML remains escaped or
  stripped even when the report row mentions "Markdown/HTML".
- Markdown parsing failures fall back to escaped plain text.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: item schema must reject unknown item fields.
- Input bounds: schema and normalizer must cap question, answer, icon, href,
  markdown token/list/node counts, and JSON-LD text extraction length so one
  FAQ item cannot create unbounded DOM or script payloads.
- Anti-abuse: rich answers must not allow raw HTML, scripts, inline event
  handlers, unsafe URLs, or externally loaded embeds.
- Secret handling: no secrets or private URLs in FAQ content, diagnostics, or
  Playwright evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if link
  normalization or safe-href behavior changes
- Add focused cases for oversized answer markdown, too many list items, overly
  long hrefs, and JSON-LD text truncation/omission policy.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before any manual commit that includes this leaf, also run:
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FAQ.md` with rich answer and icon fields.
- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` rows W10 and W11
  after validation.

## Changelog Policy

- Covered by the TASK-266 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- FAQ answers can include a safe bounded markdown subset without allowing raw
  HTML or user-authored scripts.
- Optional item icons render predictably and remain bounded in schema and
  normalizer tests.
- Legacy plain-text answers render unchanged.
