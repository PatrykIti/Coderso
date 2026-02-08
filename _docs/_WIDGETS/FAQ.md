# FAQ Accordion Widget (v1)

## Purpose

Expandable FAQ section for objection handling and support answers.

## Widget ID

`faq-accordion`

## Variants (v1)

- `single-column`: one-column question list
- `two-column`: responsive two-column FAQ grid
- `compact`: reduced spacing and tighter typography

## Editor Modes (current after TASK-050-12-04)

### Wizard (minimal onboarding)
- FAQ layout (`single-column` / `two-column` / `compact`)
- Section title
- Initial question labels

### Visual (primary editing mode)
Sections:
1. Variant and layout structure
2. Header copy
3. Questions and answers
4. Display behavior
5. Colors and spacing

Notes:
- FAQ owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.
- Display behavior controls default open row and multiple-open mode.

### Advanced (technical-only)
- Open-state and fallback controls
- Technical style tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `single-column`.
- Renderer always emits deterministic FAQ markers:
  - `data-faq-variant`
  - `data-faq-spacing`
  - `data-faq-count`
  - `data-faq-multiple-open`
  - `data-faq-default-open`
  - `data-faq-item-open`
- `defaultOpenIndex = -1` renders all FAQ items collapsed by default.
- `defaultOpenIndex` is normalized to valid item bounds.

## Data Model (summary)

```json
{
  "header": {
    "title": "Frequently asked questions",
    "description": "Address objections with short and clear answers."
  },
  "items": [
    {
      "id": "faq-1",
      "question": "How long does setup take?",
      "answer": "Most teams configure their first page in under one day using reusable templates."
    }
  ],
  "options": {
    "allowMultipleOpen": false,
    "defaultOpenIndex": 0
  },
  "style": {
    "surface": "var(--color-bg)",
    "border": "var(--color-border)",
    "divider": "var(--color-border)",
    "spacing": "md"
  }
}
```
