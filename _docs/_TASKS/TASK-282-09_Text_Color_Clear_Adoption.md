# TASK-282-09: Rich Text Text Color Clear Adoption

# FileName: TASK-282-09_Text_Color_Clear_Adoption.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-282, TASK-256-02
**Status:** To Do

---

## Overview

Give KOD-10 from `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` a
physical Rich Text Section owner. The report confirms that the Visual editor
`Text color` field lacks a clear button while `Background color` can clear back
to defaults.

TASK-256-02 owns the shared clearable color-control semantics. This leaf owns
the local Rich Text Section adoption once that shared behavior exists, or a
direct local adoption if the existing helper already supports the required
clear behavior without adding generic helper code.

## Scope Boundary

In scope:

- Add `onClear` behavior for the Rich Text Section `textColor` control in
  `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`.
- Preserve CSS variable defaults and legacy saved values.
- Add focused editor tests proving clear resets `textColor` to the normalized
  default/fallback without changing unrelated options.

Out of scope:

- Implementing or redesigning shared `ColorField`, token picker, `none`, or
  clearable-field helper contracts. Those remain TASK-256-02 unless they have
  already landed.
- Adding clear buttons to unrelated widgets.
- Changing runtime color semantics beyond preserving omitted/fallback behavior.

## Sub-Tasks

- [ ] Verify whether TASK-256-02 landed a shared helper that supports configured
  vs fallback clear state.
- [ ] If the helper exists, adopt it in the Rich Text Section Visual `Text
  color` field and keep `Background color` behavior unchanged.
- [ ] If no helper exists, add only the minimal local `textColor` clear path that
  uses the existing editor update helper and does not create a new generic
  shared abstraction.
- [ ] Add focused tests for clear button presence, clear action, CSS-variable
  fallback preservation, and no unrelated option mutation.
- [ ] Update report/docs evidence for KOD-10.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add `onClear` for the Visual `Text color` control through the existing or TASK-256-02 clear helper. |
| `core/widgets/core/richTextSection.tsx` | Update only if normalizer/runtime omitted-color behavior needs a focused guard. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add editor assertions for text color clear presence and behavior. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add runtime/normalizer assertions only if runtime omitted-color behavior changes. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update only if shared clear/none token behavior is touched. |

## Implementation Pseudocode

Editor clear:

```tsx
<ColorField
  label="Text color"
  value={options.textColor}
  fallbackValue="var(--color-text)"
  onChange={(textColor) => updateOptions({ textColor })}
  onClear={() => updateOptions({ textColor: undefined })}
/>
```

Test shape:

```ts
render(<RichTextSectionVisualEditor value={valueWithTextColor} onChange={onChange} />);
click(screen.getByRole("button", { name: /clear text color/i }));
expect(onChange).toHaveBeenCalledWith(
  expect.objectContaining({
    options: expect.not.objectContaining({ textColor: expect.any(String) }),
  })
);
```

## Error Handling

- Clearing `textColor` must omit the configured value, not write an empty string
  or invalid color token.
- Invalid saved colors continue to normalize through existing Rich Text Section
  fallback logic.
- The clear action must not overwrite CSS variables because of color swatch
  normalization.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged existing admin
  editing route behavior.
- Reject-unknown validation: no new persisted field is introduced.
- Anti-abuse: color values remain normalized/bounded by existing widget schema.
- Secret handling: no secrets or private values are involved.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx` if
  normalizer/runtime color fallback behavior changes
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  shared clear/none token behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` KOD-10 with final
  fixed/deferred evidence.
- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` only if clear behavior becomes a
  documented editor contract.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- KOD-10 has a physical Rich Text Section implementation owner.
- The Visual editor can clear `textColor` back to fallback/default behavior.
- The fix does not implement generic TASK-256-02 helper scope inside this leaf.
- Focused editor tests prove clear behavior and no unrelated option mutation.
