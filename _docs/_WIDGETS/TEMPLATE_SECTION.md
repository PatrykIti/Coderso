# Template Section Widget (v1)

## Purpose

Reusable page building block that renders the blocks from a widget template.
Allows mixing widgets and templates in the same page flow.

## Widget ID

`template-section`

## Variants (v1)

- `default`

## Slots

None.

## Editor Modes (current after TASK-053-01)

### Wizard
- pick a widget template
- quick summary of active selection

### Visual
- swap template selection
- surface template status (draft/published)

### Advanced
- same selection controls
- read-only resolved payload snapshot

## Runtime Behavior Notes

- Resolves the selected widget template into `resolved.blocks`.
- Renders template blocks in order as a single page section.
- Draft templates only render in preview mode; public runtime shows a placeholder.
- Missing template or looped template references render a safe placeholder.
- Exposes deterministic runtime markers:
  - `data-template-section`
  - `data-template-section-state`

## Data Model (summary)

```json
{
  "templateId": "template-id",
  "templateName": "Hero Cluster",
  "resolved": {
    "blocks": [],
    "error": "template_missing"
  }
}
```
