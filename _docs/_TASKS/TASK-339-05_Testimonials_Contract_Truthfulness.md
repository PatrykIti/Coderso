# TASK-339-05: Testimonials Contract Truthfulness

# FileName: TASK-339-05_Testimonials_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** Done (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `testimonials` tell the truth about the UI it already renders.

The current editor already exposes a richer, more hero-like sectioned flow, but
the declared contract still says `Visual=2`, `Advanced=1`, and the rendered
section ids/roles are not yet aligned to a stable widget-owned contract.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `testimonials` renders
  `Visual=7`, `Advanced=3` while the contract still declares `Visual=2`,
  `Advanced=1`.
- Rendered section ids such as `header-copy` and `colors-and-emphasis` are not
  yet mirrored by the declared widget contract.
- This is truthfulness work: do not collapse the richer UI back down to the old
  coarse contract.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Promote stable namespaced ids and section roles that match the real UI. |
| `core/widgets/core/testimonials.tsx` | Replace the stale two-section contract with the true rendered section inventory. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/testimonials.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/TESTIMONIALS.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
<WidgetEditorSection id="testimonials.visual.variant-layout" role="visual" ... />
<WidgetEditorSection id="testimonials.visual.header-copy" role="content" ... />
<WidgetEditorSection id="testimonials.visual.quotes-ratings" role="content" ... />
// ...

editorContract.sections = [
  // wizard
  // all rendered visual sections
  // all rendered advanced sections
];
```

Data flow:

- Preserve the richer current UI.
- Align ids, titles, roles, and contract ownership to that UI.

Error handling:

- Do not reduce the UI to satisfy the stale contract.
- Keep Advanced read-only diagnostics.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `testimonials` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/TESTIMONIALS.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Testimonials keeps its richer UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
- Playwright review confirms the flow feels consistent with `hero`.

## Completion Notes (2026-05-27)

- Testimonials now has a truthful `editorContract` that matches the already
  shipped editor UI instead of collapsing it into the stale `Visual=2` /
  `Advanced=1` contract.
- Wizard, Visual, and Advanced now expose stable widget-owned section ids:
  - Wizard: `testimonials.wizard.starter-proof`
  - Visual: `variant-layout`, `header-copy`, `content-ratings`,
    `surface-typography`, `colors-emphasis`, `cta-conversion`,
    `pagination-load-more`
  - Advanced: `runtime-summary`, `display-settings`, `content-health`
- The UI behavior itself stayed intact; this leaf is a truthfulness sync, not a
  feature downgrade or redesign.
- Claude Playwright snapshot review final result: `NO BLOCKERS`.
- Validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
