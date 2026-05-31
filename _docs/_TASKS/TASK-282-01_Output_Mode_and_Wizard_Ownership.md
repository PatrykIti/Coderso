# TASK-282-01: Rich Text Output Mode and Wizard Ownership

# FileName: TASK-282-01_Output_Mode_and_Wizard_Ownership.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-282, TASK-256-01
**Status:** Done (2026-05-21)

---

## Overview

Make Rich Text Section output-source ownership truthful across Wizard, Visual,
Advanced, admin preview, and public render.

This leaf covers KOD-01 and KOD-02 from
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`: Visual currently shows
HTML and structured blocks as equal sources without telling the editor which
source renders, and Wizard block edits silently force `options.outputMode` to
`"blocks"`.

## Scope Boundary

In scope:

- Rich Text Section-specific output mode copy, source badges, disabled/inactive
  source state, and editor hints.
- Preventing silent Wizard resets by preserving the current output mode or
  making the mode transition explicit and reversible.
- Keeping `blocks-fallback` priority visible: non-empty HTML wins; blocks render
  only when HTML is empty.
- Focused runtime/editor tests for output-source truthfulness.

Out of scope:

- Generic editor atomic update helper design, owned by TASK-256-01.
- Shared mode/tab framework changes across widgets.
- Generic color/token/clear behavior, owned by TASK-256-02.

## Sub-Tasks

- [x] Add a helper such as `resolveRichTextRenderedSource(data)` that returns
  `"html"` or `"blocks"` after normalization, using the same rules as
  `RichTextSectionBlock`.
- [x] Export a small typed result with `mode`, `renderedSource`, `htmlIsActive`,
  `blocksAreActive`, and `reason` so editors and tests do not duplicate runtime
  branch logic.
- [x] Replace Wizard's unconditional `outputMode: "blocks"` update with an
  explicit transition policy:
  - preserve `html` and `blocks-fallback` while editing blocks; or
  - show a deliberate "Use blocks for output" action before switching to
    `"blocks"`.
- [x] Add Visual editor status near HTML body and fallback blocks, including
  which source is active and what will happen under `blocks-fallback`.
- [x] Ensure Advanced output mode changes update the Visual status without data
  loss.
- [x] Preserve legacy payloads and existing normalized defaults.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Extract output-source resolution from lines 493-501 into an exported helper and reuse it in render. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Stop silent Wizard mode resets at lines 303-333; add Visual source-status copy near the HTML and blocks sections; keep Advanced output selector as the technical control. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add helper/runtime assertions for `html`, `blocks`, and `blocks-fallback` with empty and non-empty HTML. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Replace current expectation that Wizard forces `"blocks"` with the final explicit/preserved mode behavior and add Visual active-source assertions. |

## Implementation Pseudocode

Runtime helper:

```ts
export type RichTextRenderedSource = "html" | "blocks";

export function resolveRichTextRenderedSource(data: RichTextSectionData) {
  const normalized = normalizeRichTextSectionData(data);
  const mode = normalized.options?.outputMode ?? "blocks-fallback";
  const hasHtml = (normalized.body?.html ?? "").trim().length > 0;

  if (mode === "html") return { mode, renderedSource: "html", reason: "html-only" };
  if (mode === "blocks") return { mode, renderedSource: "blocks", reason: "blocks-only" };
  return hasHtml
    ? { mode, renderedSource: "html", reason: "fallback-html-present" }
    : { mode, renderedSource: "blocks", reason: "fallback-html-empty" };
}
```

Wizard update:

```ts
function updateWizardBlock(...) {
  updateValue(value, onChange, (current) => ({
    ...current,
    body: { ...current.body, blocks: nextBlocks },
    options: current.options,
  }));
}
```

Visual status:

```tsx
const source = resolveRichTextRenderedSource(normalized);
<RichTextSourceStatus source={source} section="html" />
<RichTextSourceStatus source={source} section="blocks" />
```

Regression test shape:

```ts
test("resolveRichTextRenderedSource prefers HTML when blocks-fallback has non-empty HTML", ...);
test("resolveRichTextRenderedSource falls back to blocks when HTML is empty", ...);
test("wizard block edits preserve the existing outputMode", ...);
test("visual editor labels HTML vs blocks as active or inactive from shared helper output", ...);
```

## Error Handling

- Invalid output modes continue to normalize to `blocks-fallback`.
- Empty HTML in `blocks-fallback` must never render an empty body when valid
  blocks exist.
- Wizard edits must not discard HTML or block data.
- If the final UX chooses an explicit switch action, cancelling that action must
  leave `outputMode` unchanged.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged page/template editor
  contracts.
- Reject-unknown validation: no schema relaxation. Any new advisory field must
  be schema-owned before persistence; prefer derived UI state over persisted
  source-status flags.
- Anti-abuse: source-status copy must not render unsanitized HTML snippets or
  raw user content in diagnostics.
- Secret handling: no private data in source diagnostics or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with final output-mode behavior.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` rows KOD-01 and
  KOD-02 after validation.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors can always tell whether HTML or blocks will render.
- Wizard edits do not silently change `outputMode` or hide that transition from
  the user.
- Runtime and editor source-resolution logic share one typed helper.
- Existing HTML and block payloads survive mode changes.
