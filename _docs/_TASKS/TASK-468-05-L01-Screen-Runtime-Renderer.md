# TASK-468-05-L01: Screen Runtime Renderer
# FileName: TASK-468-05-L01-Screen-Runtime-Renderer.md

**Parent Subtask:** TASK-468-05
**Priority:** High
**Category:** Admin UI / Custom Screens / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-468-04-L05
**Status:** ✅ Done
**Completed:** 2026-06-21

---

## Overview

Build the V4 screen runtime renderer used by record preview and entry editing.
The runtime must render `ScreenDocumentV1` sections and blocks directly instead
of delegating to `WidgetRenderer` or `screen-field-*` widget bridges.

## Sub-Tasks

- [ ] Add `ScreenRuntimeRenderer` for read-only and edit-capable modes.
- [ ] Add block renderers for `record-header`, `field`, `field-group`,
  `columns`, `rich-text`, `media-field`, `relation-field`, `status-badge`,
  `actions`, and `legacy-placeholder`.
- [ ] Resolve field bindings against a sanitized record view model.
- [ ] Keep runtime renderer independent from Page v2 and generic widget runtime.
- [ ] Add renderer tests for valid bindings, missing fields, unsupported legacy
  placeholders, and empty documents.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/runtime/ScreenRuntimeRenderer.tsx` | New V4 runtime renderer. |
| `core/admin/ui/custom-screens/runtime/screenRuntimeModel.ts` | New binding/record read model helpers. |
| `core/admin/ui/custom-screens/runtime/screenRuntimeBlocks.tsx` | Screen block renderer map. |
| `tests/vitest/ui-integration/custom-screens/*RuntimeRenderer*.test.tsx` | Runtime renderer coverage. |

## Implementation Pseudocode

```tsx
export function ScreenRuntimeRenderer(props: ScreenRuntimeRendererProps) {
  const model = createScreenRuntimeModel({
    document: props.document,
    bindings: props.bindings,
    contentType: props.contentType,
    record: props.record,
    mode: props.mode,
  });

  return (
    <div data-screen-runtime={props.screenId}>
      {model.sections.map((section) => (
        <ScreenRuntimeSection key={section.id} section={section} />
      ))}
    </div>
  );
}
```

Data flow:

- Service/client loads normalized V4 definition, content type metadata, and
  bounded record data.
- Runtime model resolves bindings into display/edit descriptors.
- Renderer maps descriptors to screen-owned block components.

Error handling:

- Missing field bindings render a repair/hidden state depending on admin mode.
- Unsupported migrated legacy widgets render non-writable placeholders.
- Renderer never throws for malformed persisted legacy rows after service
  migration; invalid V4 writes are rejected earlier.

Regression-test shape:

```tsx
test("renders field block from screen binding without WidgetRenderer", () => {
  render(<ScreenRuntimeRenderer fixture={boundTitleFixture} />);
  expect(screen.getByText("Example title")).toBeInTheDocument();
  expect(widgetRendererSpy).not.toHaveBeenCalled();
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** authenticated admin session through existing screens/entries
  pages.
- **RBAC:** renderer receives data already authorized by route/client layer.
- **CSRF expectations:** unchanged for read-only render.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** renderer consumes normalized V4 and sanitized
  record view models.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** renderer must not display protected fields unless the
  existing admin permission model explicitly allowed them in the loaded record.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md`

## Acceptance Criteria

1. V4 screen runtime renders sections and blocks without generic widget runtime.
2. Field bindings resolve through a sanitized runtime model.
3. Unsupported legacy widgets are explicit placeholders, not active widget
   execution paths.
