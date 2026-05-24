# FAQ Accordion Widget (v2)

## Purpose

Expandable FAQ section for objection handling, support answers, and search-safe
FAQ structured data.

## Widget ID

`faq-accordion`

## Variants

- `single-column`: one-column question list
- `two-column`: responsive two-column FAQ grid
- `compact`: reduced spacing and tighter typography

## Editor Modes

### Wizard (minimal onboarding)
- FAQ layout (`single-column` / `two-column` / `compact`)
- Section title
- Section description
- Questions count
- Per-item icon
- Per-item answer mode (`plain` / `markdown`)
- Question and answer fields for the current wizard scope

### Visual (primary editing mode)
Sections:
1. Variant and layout structure
2. Header copy
3. Questions and answers
4. Display behavior
5. Layout and typography
6. Colors and panel style
7. Search visibility

Notes:
- FAQ owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.
- Questions and answers now include:
  - question-aware default-open labels,
  - compact icon-first item actions,
  - remove confirmation,
  - native drag/drop reorder with Move Up/Down fallback,
  - bounded bulk delete that keeps the min-one-item guard.

### Advanced (technical-only)
- Read-only open-state diagnostics
- Read-only style token diagnostics
- Confirm-gated normalization support action
- Raw payload snapshot

Advanced does not duplicate Visual's open-state, spacing, or color controls.
Visual owns normal editing; Advanced reports resolved runtime state and keeps
payload repair behind explicit confirmation.

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `single-column`.
- Renderer emits deterministic FAQ markers:
  - `data-coderso-faq`
  - `data-faq-variant`
  - `data-faq-spacing`
  - `data-faq-count`
  - `data-faq-multiple-open`
  - `data-faq-default-open`
  - `data-faq-item-open`
  - `data-faq-motion`
- FAQ sections now expose a named section (`aria-labelledby` or fallback
  `aria-label`) and per-item `summary`/`region` relationships.
- FAQ summaries render a visible chevron affordance and runtime script syncs
  `aria-expanded` after native `<details>` toggles.
- `defaultOpenIndex = -1` renders all FAQ items collapsed by default.
- `defaultOpenIndex` is normalized to valid item bounds.
- `style.motion = "smooth"` enables CSS-only open/close transitions.
- `seo.emitFaqJsonLd = true` emits one safe `FAQPage` JSON-LD script derived
  from normalized question text and sanitized answer plain text.

## Rich Answers

- `answerFormat = "plain"` preserves legacy plain-text behavior.
- `answerFormat = "markdown"` enables a bounded markdown subset:
  - links
  - bold
  - italic
  - inline code
  - ordered and unordered lists
- Raw HTML, embeds, scripts, and unsafe URLs are rejected.
- Markdown links reuse the shared widget safe-href contract.

## Clear Controls

- `style.surface`, `style.border`, and `style.divider` are clearable.
- Clearing a field removes the persisted token instead of forcing an empty
  string.
- Color swatches may fall back to display-only hex values, but token text in
  the input remains the source of truth.

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
      "icon": "⭐",
      "question": "How long does setup take?",
      "answer": "Use **templates** and [Docs](/docs).",
      "answerFormat": "markdown"
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
    "spacing": "md",
    "maxWidth": "xl",
    "headerAlign": "center",
    "sectionPaddingX": "md",
    "sectionPaddingY": "md",
    "questionTextColor": "var(--color-text)",
    "answerTextColor": "var(--color-text)",
    "headerTitleColor": "var(--color-text)",
    "headerDescriptionColor": "var(--color-text)",
    "panelRadius": "lg",
    "borderWidth": "1",
    "headerTitleSize": "auto",
    "motion": "none"
  },
  "seo": {
    "emitFaqJsonLd": false
  }
}
```

## TASK-336-18 Editor Contract

- Exports `faqAccordionEditorContract` with `version: 2`.
- Contract target: Wizard seeds starter questions; Visual owns FAQ item
  content, behavior, SEO toggle, and presentation; Advanced is read-only
  runtime diagnostics.
- Raw default-index/style-token controls in Advanced are routed to
  `TASK-336-19`.
