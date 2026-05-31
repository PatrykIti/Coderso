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

## Editor Modes (current after TASK-343-12)

### Wizard
- owns first-time template setup
- writable paths: `templateId` and derived `templateName`
- clears stale resolved template payload when the source template changes
- the editor preview is intentionally placeholder-only; selecting a template
  clears stale `resolved` data instead of pretending to render template blocks

### Visual
- shows the active template as a daily editing summary
- owns public presentation metadata:
  - `metadata.previewLabel`
  - `metadata.category`
- shows `metadata.version` as read-only metadata; no daily editor mutates it
- does not expose a duplicate template picker

### Advanced
- read-only resolved template diagnostics
- read-only `metadata.category` summary
- read-only `metadata.version` summary
- read-only resolved content summary; raw JSON payload is not shown in the
  normal Advanced UI
- internal template ids and resolver states are mapped to human-readable
  setup/resolution status, including `template_unpublished`,
  `template_missing`, `template_loop`, `template_empty`, and
  `admin_preview_unresolved`
- no writable template selection or presentation controls

## Runtime Behavior Notes

- Resolves the selected widget template into `resolved.blocks`.
- Renders template blocks in order as a single page section.
- Draft, missing, looped, or otherwise errored template references render a safe
  placeholder even if stale resolved blocks are still present in legacy payloads.
- Selected templates without admin-side `resolved` data render a truthful
  placeholder: "Admin preview is placeholder-only until runtime resolves this
  template."
- Exposes deterministic runtime markers:
  - `data-template-section`
  - `data-template-section-state`
  - `data-template-section-resolution`
  - `data-template-section-category`
  - `data-template-section-version`

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
