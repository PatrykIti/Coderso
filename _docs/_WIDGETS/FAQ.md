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
- one-time FAQ layout seed
- one-time starter questions count seed
- shared Wizard-only live preview

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
- Colors and panel style now keep Hero-style ownership boundaries:
  - `Spacing` is editable in `Layout and typography` and owns both panel gap
    and panel padding density,
  - palettes write explicit FAQ colors,
  - theme tokens render as `Theme default` instead of faux custom-color state,
  - contrast guidance stays visible next to the FAQ color controls.

### Advanced
- Read-only runtime summary for open behavior, question count, answer formats,
  and FAQ search enhancement
- Read-only style summary that describes theme/default/custom color state
  without exposing raw token strings
- Read-only accessibility diagnostics for section heading, helper copy,
  answer rendering mode, and disclosure pattern
- Read-only contract summary for Wizard / Visual / Advanced ownership
- Read-only saved-data status for legacy compatibility cleanup

Advanced does not duplicate Visual's open-state, spacing, or color controls.
Visual owns normal editing; Advanced reports resolved runtime state in human
summaries only. It must not render raw JSON payload snapshots or mutating
normalization/repair actions.

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
- FAQ summaries render a visible chevron affordance. `aria-expanded` is
  runtime-owned: static SSR markup omits it so it cannot become stale before
  binding, while the public runtime and admin preview runtime bridge both set
  and sync it after binding.
- Admin preview uses a bounded FAQ disclosure bridge for the page-builder
  canvas, shared live preview, and custom-screen read-only widget preview. It
  does not execute arbitrary persisted widget scripts.
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

- Visual color authoring uses swatch pickers and clear actions instead of raw
  CSS token text fields.
- Built-in theme tokens such as `var(--color-bg)`, `var(--color-border)`, and
  `var(--color-text)` render as `Theme default`.
- `Colors and panel style` includes FAQ palette presets plus read-only
  contrast guidance to keep section/header/panel readability aligned with the
  Hero UX pattern.
- `style.surface`, `style.border`, `style.divider`, `style.questionTextColor`,
  `style.answerTextColor`, `style.headerTitleColor`, and
  `style.headerDescriptionColor` are clearable.
- Clearing a field removes the persisted token instead of forcing an empty
  string.
- Existing rgba values and other custom strings remain compatible as saved
  custom color state that can be replaced or cleared without typing CSS.

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
- Contract target: Wizard is a read-only starter summary; Visual owns FAQ item
  content, behavior, SEO toggle, and presentation; Advanced is read-only
  runtime diagnostics.
- Advanced exposes read-only runtime, style, and saved-data summaries; raw
  default-index/style-token authoring, raw payload snapshots, and mutation
  actions are not part of the editor contract.
