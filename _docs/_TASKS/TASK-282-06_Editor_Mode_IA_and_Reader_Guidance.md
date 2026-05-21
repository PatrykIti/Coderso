# TASK-282-06: Rich Text Editor Mode IA and Reader Guidance

# FileName: TASK-282-06_Editor_Mode_IA_and_Reader_Guidance.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Content UX
**Estimated Effort:** Medium
**Dependencies:** TASK-282, TASK-282-01, TASK-282-02, TASK-282-03, TASK-282-04
**Status:** In Progress (2026-05-21)

---

## Overview

Polish Rich Text Section editor mode ownership and reader guidance after the
core output, authoring, block, and runtime semantics are repaired. Media/embed
and text-color-clear follow-ups may land before or after this leaf when they do
not change the mode-ownership contract.

This leaf covers KOD-05, KOD-07, KOD-WIZ, and KOD-DUP from
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`.

## Scope Boundary

In scope:

- Wizard variant selection consistency with Visual, using VariantCards or a
  compact visual equivalent.
- Advanced variant visibility only if it remains a technical owner after
  TASK-282-04 heading/layout decisions.
- Dropcap preview/help that explains when no paragraph exists.
- Clearer ownership for typography controls so Visual remains user-facing and
  Advanced remains technical diagnostics/normalization.
- Documentation of KOD-06 as not-a-bug while preserving any block heading
  hierarchy changes from TASK-282-03.

Out of scope:

- Shared editor mode/tab shell changes across all widgets.
- Generic design token clear/none semantics, owned by TASK-256-02.
- Major WYSIWYG/media/embed/block model changes, owned by earlier TASK-282
  leaves.

## Sub-Tasks

- [x] Replace or augment Wizard's variant dropdown with the same VariantCards
  language used by Visual, while keeping Wizard compact.
- [x] Add dropcap preview or status copy that is derived from the active rendered
  source and reports when no paragraph will receive dropcap.
- [x] Decide whether Advanced should show read-only variant/output diagnostics
  or an editable variant control; keep one owner for actual variant mutation.
- [x] Reduce typography duplication by moving user-facing styling to Visual and
  making Advanced explicitly diagnostic/technical.
- [x] Keep the final behavior friendly for beginner editors and avoid exposing
  raw schema concepts unless needed in Advanced.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Align Wizard/Visual variant UI, add dropcap guidance, refine Advanced diagnostics, and reduce duplicated typography confusion. |
| `core/widgets/core/richTextSection.tsx` | Add derived helpers only if needed for dropcap paragraph/source detection; prefer non-persisted derived state. If this leaf needs rendered HTML, TASK-282-01 or this leaf must extract the current inline raw-HTML selection logic into an exported `resolveRichTextRenderedHtml(data)` helper and reuse it in `RichTextSectionBlock`. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add mode IA, dropcap guidance, variant UI, and Advanced diagnostic assertions. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add derived helper/runtime assertions only if runtime helpers change. |

## Implementation Pseudocode

Dropcap helper:

```ts
export function resolveRichTextDropcapStatus(data: RichTextSectionData) {
  const source = resolveRichTextRenderedSource(data);
  const html = resolveRichTextRenderedHtml(data);
  const hasParagraph = /<p(?:\s|>)/i.test(sanitizeRichTextHtml(html));
  return {
    enabled: Boolean(normalizeRichTextSectionData(data).options?.dropcap),
    applies: hasParagraph,
    source: source.renderedSource,
  };
}
```

Wizard variant cards:

```tsx
<VariantCards
  value={resolveRichTextSectionVariant(variant)}
  onChange={onVariantChange}
  compact
/>
```

Advanced diagnostics:

```tsx
<RichTextOutputDiagnostics
  renderedSource={source.renderedSource}
  variant={resolveRichTextSectionVariant(variant)}
  blockCount={blocks.length}
/>
```

Regression test shape:

```ts
test("wizard and visual use the same variant-selection language while keeping wizard compact", ...);
test("dropcap guidance reports when the active rendered source has no paragraph to style", ...);
test("advanced mode shows read-only output or variant diagnostics instead of duplicating visual controls", ...);
test("typography ownership stays in visual while advanced remains technical or diagnostic", ...);
```

## Error Handling

- Dropcap guidance must never parse or render unsanitized HTML directly in the
  editor.
- Invalid variants continue to resolve to `single-column`.
- Advanced diagnostics must stay read-only unless this leaf intentionally makes
  one technical control editable and tests the owner boundary.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: prefer derived UI state; persisted fields require
  schema/default/normalizer coverage.
- Anti-abuse: guidance snippets must not echo raw HTML or unsafe pasted content.
- Secret handling: diagnostics must not include private values or raw payloads
  beyond the existing raw snapshot behavior.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx` if
  derived runtime helpers change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with final editor mode ownership.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` rows KOD-05,
  KOD-07, KOD-WIZ, KOD-DUP, and KOD-06 notes after validation.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard and Visual no longer present conflicting variant-selection metaphors.
- Dropcap behavior is understandable before publishing.
- Any rendered-HTML/dropcap helper used by the editor exists in the runtime
  owner and is reused by render/tests instead of duplicating inline selection
  logic.
- Advanced mode has a clear technical purpose and does not duplicate Visual
  controls without explanation.
- Not-a-bug TOC behavior is documented, not reimplemented accidentally.
