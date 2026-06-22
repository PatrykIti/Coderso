# TASK-468-06-L02: V4 Active Surface Context Hydration
# FileName: TASK-468-06-L02-V4-Active-Surface-Context-Hydration.md

**Parent Subtask:** TASK-468-06
**Priority:** High
**Category:** Assistant / Custom Screens / Active Surface
**Estimated Effort:** Medium
**Dependencies:** TASK-468-06-L01
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Hydrate assistant active-surface context from V4 Custom Screen editor/runtime
state. The context must summarize screen sections, blocks, bindings, writable
fields, and current selection without exposing raw privileged record values.

## Sub-Tasks

- [x] Add V4 Custom Screen active-surface summary builder.
- [x] Include selected section/block, content type summary, writable field
  names, binding status, and list presentation summary.
- [x] Exclude raw entry values, protected fields, secrets, tokens, and full
  browser cache contents.
- [x] Wire editor and record workspace active-surface providers to V4 summary.
- [x] Add tests for redaction, size limits, and selection hydration.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/assistant/*activeSurface*.ts` | V4 Custom Screen active-surface builder/provider. |
| `core/admin/ui/custom-screens/assistantSurface.ts` | Screen-specific active-surface summary source. |
| `core/admin/ui/custom-screens/**` | Provide current V4 editor/runtime selection context. |
| `core/services/customScreens/screenDocument.ts` | Reuse summary-safe helpers if needed. |
| `tests/vitest/assistant/customScreenActiveSurface.test.ts` | Active-surface coverage. |

## Implementation Pseudocode

```ts
export function buildCustomScreenActiveSurface(input: ScreenActiveSurfaceInput) {
  return clampActiveSurface({
    kind: "custom-screen",
    screenId: input.screen.id,
    contentType: summarizeContentType(input.contentType),
    selection: summarizeScreenSelection(input.selection, input.definition),
    sections: input.definition.editorView.document.sections.map(summarizeSection),
    writableFields: listWritableFieldNames(input.definition.editorView.bindings, input.contentType),
  });
}
```

Data flow:

- Editor/runtime publishes current V4 selection and normalized screen definition.
- Active-surface builder creates a bounded summary.
- Assistant reads the summary for planning and dry-run descriptions.

Error handling:

- Missing selection returns `selection: null`.
- Missing fields are represented by names/status only, not raw values.
- Oversized summaries are deterministically truncated with counts.

Regression-test shape:

```ts
test("active surface redacts record values and keeps writable field names", () => {
  const surface = buildCustomScreenActiveSurface(secretRecordFixture);
  expect(JSON.stringify(surface)).not.toContain("secret-token-value");
  expect(surface.writableFields).toContain("title");
});
```

## Security Contract

- **Endpoint visibility:** existing internal assistant/admin context endpoints.
- **Auth model:** authenticated admin session.
- **RBAC:** context is available only where the admin can already read the
  screen/content type.
- **CSRF expectations:** unchanged for read-only context; required if any
  active-surface mutation endpoint is touched.
- **Rate-limit bucket:** existing assistant/admin read bucket.
- **Reject unknown validation:** active-surface inputs are normalized V4 state
  plus typed content metadata.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** no raw record values, protected settings, cookies, CSRF
  tokens, provider keys, or storage credentials in active-surface payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/assistant/customScreenActiveSurface.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if active-surface contracts are documented there.

## Acceptance Criteria

1. Active-surface summaries describe V4 sections, blocks, bindings, and writable
   fields.
2. Summaries are bounded, deterministic, and redacted.
3. No widget-patch terminology remains in Custom Screen active-surface output.
