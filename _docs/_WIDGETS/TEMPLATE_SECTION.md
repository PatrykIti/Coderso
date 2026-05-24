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

## Editor Modes (current after TASK-336-04)

### Wizard
- owns first-time template setup
- writable paths: `templateId` and derived `templateName`
- clears stale resolved template payload when the source template changes

### Visual
- shows the active template as a daily editing summary
- owns public presentation metadata:
  - `metadata.previewLabel`
  - `metadata.category`
- does not expose a duplicate template picker

### Advanced
- read-only resolved template diagnostics
- read-only `metadata.version` summary
- read-only runtime payload snapshot
- no writable template selection or presentation controls

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
  "metadata": {
    "category": "Marketing",
    "previewLabel": "Homepage Hero",
    "version": "v2"
  },
  "resolved": {
    "blocks": [],
    "error": "template_missing"
  }
}
```
