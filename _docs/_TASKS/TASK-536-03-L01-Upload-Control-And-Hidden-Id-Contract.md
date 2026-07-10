# TASK-536-03-L01: Upload Control and Hidden ID Contract

# FileName: TASK-536-03-L01-Upload-Control-And-Hidden-Id-Contract.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-03
**Priority:** Critical
**Category:** Forms Widget / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-536-02-L01
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Correct the Form file-field DOM contract so browser validity belongs to the native file
input, submission identity belongs to a separate hidden control, and runtime status/error
text is programmatically associated with the field.

## Source ownership

This leaf is the sole writer of core/widgets/core/formEmbed.tsx for TASK-536 and owns
compatibility/changed-behavior updates in
`tests/vitest/widgets/formEmbed.test.tsx` and
`tests/vitest/forms/fileField.test.ts` before its gate. It must not edit
formRuntimeScript.ts, other tests, Forms services/routes, docs, tasks, or changelog files.

## Implementation Pseudocode

~~~tsx
if field.type === "file":
  render input type="file" with:
    no name;
    required={required};
    data-required-original;
    accept and multiple from normalized settings;
    data-form-file-input={field.name} and data-form-file-multiple;
    aria-describedby joining helperId and uploadStatusId.

  render input type="hidden" with:
    name={field.name};
    no required and no aria-required;
    data-form-file-value={field.name};
    data-form-file-multiple;
    initial value "";

  render status node with:
    id={uploadStatusId};
    data-form-file-status={field.name};
    role="status";
    aria-live="polite";
    initially empty/neutral.

  render bounded field error node or let the status node switch to role="alert"
  according to the existing Form error pattern.
~~~

The three role attributes are the exact cross-file identity contract:
`data-form-file-input={field.name}`, `data-form-file-value={field.name}`, and
`data-form-file-status={field.name}`. Their non-empty values must match byte-for-byte
within one field and be unique within the form. Do not introduce a second key attribute,
pair by DOM order, or use the raw input's absent `name` as identity. The runtime consumes
these exact spellings; CSS escaping is required when a value enters a selector.

The raw file control stays unnamed. For a single field the companion contains one media
UUID. For multiple it contains a JSON array string that only the runtime marker-aware
serializer may decode; generic hidden fields retain their current string semantics.

## Conditional logic and accessibility

The existing data-required-original mechanism must remove required while the field is
hidden and restore it when visible. The runtime must clear the companion/status when a
field becomes hidden or disabled. The helper/status ID list must not contain missing IDs.
Screen readers receive uploading, complete, and error transitions without moving focus.

## Error and compatibility contract

Markup alone never marks an upload complete. An empty hidden companion is the neutral
state. Old stored Forms documents render through existing normalizers. No schema/default
is added and unauthored non-file fields remain byte-identical.

## Regression-test shape

This leaf updates the two named suites before its source gate. They must prove:

- required is on the file input and absent from hidden;
- raw input has no name;
- all three exact role attributes carry the same non-empty field identity, duplicates
  are absent, and single/multiple markers plus accept are deterministic;
- helper plus status are referenced by aria-describedby;
- status is live and uniquely identified;
- all non-file snapshots remain unchanged.

TASK-536-05-L01 may add cross-runtime cases later but cannot re-baseline these DOM and
byte-identity assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/forms/fileField.test.ts
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- Native required validation can focus/report the actual file control.
- The named value can contain only runtime-owned media ID state.
- Multiple representation is explicit and cannot alter ordinary hidden fields.
