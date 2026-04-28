# TASK-213-06-03: Rich Text Section Quick Editor
# FileName: TASK-213-06-03_Rich_Text_Section_Quick_Editor.md

**Priority:** Medium
**Category:** Rich Text Widget + Admin/UI + Widget Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-213-06
**Status:** Done (2026-04-26)

---

## Overview

Fix the Rich Text Section quick-setup gap from the per-widget audit.

Business outcome: editors can write ordinary rich text from Wizard/Visual
without treating raw HTML as the primary beginner workflow.

Technical contract: reuse existing Rich Text Section seams:
`body.blocks`, `outputMode`, `normalizeRichTextBlocks`, and
`sanitizeRichTextHtml` in `core/widgets/core/richTextSection.tsx`. Any reused
Posts editor adapter must stay Bun-free at import time and must adapt output
back into `RichTextSectionData`, not persist post-editor documents.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
- `core/widgets/core/richTextSection.tsx`
- existing rich-text editor components only if they can be imported without
  runtime/server coupling
- `tests/vitest/widgets/richTextSection.test.tsx`
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`

## Implementation Direction

Keep raw HTML available only where it belongs technically, and make structured
content the beginner path.

```tsx
<RichTextQuickEditor
  value={normalizeRichTextBlocks(normalized.body?.blocks)}
  onChange={(blocks) =>
    update({
      body: {
        ...normalized.body,
        blocks,
        html: renderBlocksToSafeHtml(blocks),
      },
    })
  }
/>
```

Advanced can still expose sanitized raw HTML:

```tsx
<Textarea
  label="Raw HTML"
  value={normalized.body?.html ?? ""}
  onChange={(html) => update({ body: { ...body, html: sanitizeRichTextHtml(html) } })}
/>
```

Do not add a new rich-text storage model unless the existing block/html contract
cannot express the needed editor output and the widget schema is updated first.

## Security Contract

- Visibility: internal admin editor; normalized rich text may render publicly.
- Auth/RBAC/CSRF/rate-limit: unchanged page/template editor contracts.
- Reject-unknown validation:
  - any new structured field must be added to the Rich Text Section schema and
    normalizer before UI exposure.
- Anti-abuse:
  - sanitize raw HTML through the existing sanitizer;
  - public runtime must not execute scripts or unsafe URLs;
  - do not persist post-editor private metadata in widget JSON.

## Testing Requirements

- `tests/vitest/widgets/richTextSection.test.tsx`
  - structured quick blocks normalize deterministically;
  - raw HTML remains sanitized;
  - output mode renders the expected public markup.
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`:
  - routine rich-text editing does not require raw HTML;
  - switching Wizard/Visual/Advanced does not lose structured content.
- Manual Playwright:
  - add Rich Text Section, edit common rich text, save/reopen, and verify the
    public preview/runtime output is sanitized.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`

## Acceptance Criteria

1. Routine Rich Text Section editing is no longer raw HTML-first.
2. Existing rich text normalizer/sanitizer contracts own the stored payload.
3. Tests cover structured editing and sanitized raw HTML fallback.
