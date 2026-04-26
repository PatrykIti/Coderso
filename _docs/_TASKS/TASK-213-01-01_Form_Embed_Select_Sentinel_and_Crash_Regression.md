# TASK-213-01-01: Form Embed Select Sentinel and Crash Regression
# FileName: TASK-213-01-01_Form_Embed_Select_Sentinel_and_Crash_Regression.md

**Priority:** High
**Category:** Widget Editors + Forms + Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-213-01
**Status:** Done (2026-04-26)

---

## Overview

Fix `BUG-9` from `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`.

`FormEmbedEditors.tsx` renders a Radix `SelectItem` with `value=""` when no
forms exist. Radix Select reserves the empty string for clearing/placeholder
behavior and throws at render time. The report proves this blanks the entire
editor when the user clicks Form Embed.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
- `core/widgets/core/formEmbed.tsx` only if normalizer/defaults need a small
  sentinel guard
- `tests/vitest/widgets/formEmbed.test.tsx`
- `tests/vitest/ui/form-embed-editor-wave.test.tsx`

## Implementation Direction

Replace empty Select item values with a local sentinel and normalize the
sentinel back to the existing empty form id shape before persistence.

Pseudocode:

```ts
const NO_FORM_VALUE = "__no_form__";

const selectedValue = normalized.formId || NO_FORM_VALUE;

<Select
  value={selectedValue}
  onValueChange={(next) => {
    updateValue(value, onChange, (current) => ({
      ...current,
      formId: next === NO_FORM_VALUE ? "" : next,
    }));
  }}
>
  <SelectContent>
    {forms.length === 0 ? (
      <SelectItem value={NO_FORM_VALUE} disabled>
        {isLoading ? "Loading forms..." : "No forms found"}
      </SelectItem>
    ) : null}
  </SelectContent>
</Select>
```

Do not store `__no_form__` in `FormEmbedData`. The sentinel is UI-only.

## Security Contract

- Visibility: internal admin widget editor.
- Auth model: unchanged admin session/API-key form list read.
- RBAC: existing forms read permission.
- CSRF: no write route changes.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: persisted `formId` remains string/empty string per
  `formEmbedSchema`; sentinel values are not persisted.
- Anti-abuse: helper/error copy must not expose form submission nonces,
  internal access keys, or raw form payload data.

## Testing Requirements

- `tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - Form Embed editor renders with zero forms and no thrown Radix error.
  - Empty state uses the sentinel value, not `value=""`.
  - Selecting a real form still stores the form id.
  - Internal submission access warning still appears.
- `tests/vitest/widgets/formEmbed.test.tsx`
  - normalizer keeps no-form payload sentinel-free.
- Manual Playwright:
  - add/open Form Embed three times in the page editor;
  - verify the app never blanks and the editor state survives.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md` closure note under `BUG-9`.

## Acceptance Criteria

1. No Radix `Select.Item value=""` remains in Form Embed.
2. Empty form lists render a bounded empty state.
3. Stored Form Embed data remains schema-valid and sentinel-free.
4. Regression tests prove no crash path.
