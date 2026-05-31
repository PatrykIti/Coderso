# TASK-343-12: Template Section Audit Remediation Family

# FileName: TASK-343-12_Template_Section_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Template Section + Admin Preview + Diagnostics + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the Template Section truthfulness drift where the editor never resolves
real template content yet still presents itself as a live shared-renderer
preview with useful diagnostics.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TEMPLATE_SECTION_WIDGET.md:194-203`
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx:59-89,214-258,339-342`
- `core/widgets/core/templateSection.tsx:93-106,175,221-247`
- `core/widgets/renderers/widgetRenderer.tsx:158-159`

## Sub-Tasks

- [x] Make admin preview truthful: either resolve real template blocks or
  explicitly present placeholder-only preview semantics.
- [x] Make Advanced diagnostics report the real runtime problem class
  (`template_unpublished`, unresolved blocks, etc.) instead of false-zero
  success.
- [x] Surface `metadata.category` and `metadata.version` truthfully instead of
  half-owning them across Visual and Advanced.
- [x] Route shared `visibility.devices` wording separately if that remains the
  real owner; do not fix shared renderer visibility semantics in this
  widget-local family.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` | Fix preview/diagnostic truthfulness and metadata surface ownership. |
| `core/widgets/core/templateSection.tsx` | Touch if runtime summary or rendered metadata contract needs alignment. |
| `tests/vitest/widgets/templateSection.test.tsx` | Cover truthful diagnostics and rendered metadata behavior. |
| `tests/vitest/ui/template-section-editor-wave.test.tsx` | Cover preview/diagnostic states and metadata surface output; reverse any expectation that unresolved content is reported as "No resolution problem detected". |

## Implementation Pseudocode

```ts
type TemplatePreviewState =
  | { mode: "resolved"; blocks: WidgetBlock[] }
  | { mode: "placeholder"; reason: "unresolved" | "unpublished" | "missing" };

function resolveTemplatePreviewState(data: TemplateSectionData): TemplatePreviewState {
  if (!data.resolved?.blocks?.length) return { mode: "placeholder", reason: data.resolved?.error ?? "unresolved" };
  return { mode: "resolved", blocks: data.resolved.blocks };
}
```

## Regression Test Shape

- Selecting a draft template does not yield false-zero diagnostics.
- Existing tests that assert `No resolution problem detected` for unresolved
  content must be updated to expect the real unresolved/draft problem class.
- `category` and `version` ownership is explicit and visible where intended.

## Security Contract

No API routes are added by default. If preview resolution needs a new internal
helper route, split that route work into a child task with its own Security
Contract.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/templateSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/template-section-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_TEMPLATE_SECTION_WIDGET.md`.
- Update `_docs/_WIDGETS/TEMPLATE_SECTION.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Template Section preview and diagnostics stop implying resolved content when
  none exists.
- Category/version ownership is explicit and visible.

## Closure Notes

- Completed on 2026-05-30.
- Focused Vitest, lint, typecheck, diff checks, manual Playwright smoke via
  `coderso-dev-core-host`, and Claude drift review passed.
- The public audit fixture is hidden by shared `visibility.devices: []`, so
  public runtime smoke used a temporary visible Template Section page and
  deleted it after verification.
