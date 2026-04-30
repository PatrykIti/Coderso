# TASK-244-02-02: Shared Clear Field Controls and Section No-Regression

# FileName: TASK-244-02-02_Shared_Clear_Field_Controls_and_Section_No_Regression.md

**Priority:** High
**Category:** Widgets + Editor Helpers
**Estimated Effort:** Medium
**Dependencies:** TASK-244-02-01
**Status:** Done (2026-04-30)

---

## Overview

Create a reusable clear-field editor pattern only after Hero proves the behavior.
Use it for color/background/overlay fields where reuse is straightforward, and
add no-regression coverage around `section` because it already has the desired
empty-gradient runtime behavior.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/widgets/editors/ClearableFields.tsx` only if at least two editor
  surfaces adopt the same helper; otherwise keep the clear helper local to the
  touched editor files
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/ui/widgets/editors/SectionEditors.tsx` only if it adopts the shared
  helper
- `core/widgets/core/section.tsx` only if helper/runtime behavior requires it
- `tests/vitest/ui/clearable-fields.test.tsx` only if
  `ClearableFields.tsx` is created
- `tests/vitest/widgets/section.test.tsx` or the current Section test owner if
  available
- `tests/vitest/ui/section-editor-wave.test.tsx` if Section editor UI changes

## Implementation Notes

Do not create a generic abstraction before at least two editor surfaces use it.
The helper should be small:

- label;
- color/text input;
- optional color picker;
- `Clear` button;
- `onClear` callback that removes a field.

The helper must not know about route saves, DB, settings, or runtime adapters.
If the helper is extracted, `ClearableFields.tsx` is the owner and later TASK-244
leaves must import that file instead of creating parallel clear-button helpers.
If Hero remains the only user after TASK-244-02-01, do not create the shared file;
record in closure that Hero editor-wave coverage is the intended proof.

## Implementation Pseudocode

```tsx
type ClearableColorFieldProps = {
  label: string;
  value?: string;
  placeholder: string;
  pickerFallback: string;
  onChange: (next: string) => void;
  onClear: () => void;
};

function ClearableColorField(props: ClearableColorFieldProps) {
  const hasValue = typeof props.value === "string" && props.value.trim().length > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{props.label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={props.onClear} disabled={!hasValue}>
          Clear
        </Button>
      </div>
      {/* existing color input + text input */}
    </div>
  );
}
```

Section background-color clear behavior is owned by TASK-244-02-03. This leaf
remains responsible for shared helper reuse and no-regression coverage around
the existing empty-gradient/zero-overlay behavior. Do not add additional Section
`Clear` controls from this helper leaf unless implementation first promotes the
specific field to `clear-required` in TASK-244-01-01 and adds a dedicated
implementation leaf.

Section no-regression should keep this contract:

```ts
const hasGradient =
  (style.gradientFrom ?? "").trim().length > 0 &&
  (style.gradientTo ?? "").trim().length > 0;
```

## Security Contract

- Visibility:
  - shared clear helpers are internal admin editor UI utilities;
  - any renderer behavior they affect remains public widget output.
- Auth model:
  - no new endpoint is introduced;
  - emitted editor payloads persist through existing authenticated admin save
    flows.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this leaf does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - helpers must remove known keys only and must not create broad arbitrary style
    payloads.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - helper APIs must not support raw class-name generation from user-entered
    color, gradient, or overlay values.

## Testing Requirements

- Hero tests from TASK-244-02-01 must remain green.
- If `ClearableFields.tsx` is created:
  - create `tests/vitest/ui/clearable-fields.test.tsx`;
  - run `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`;
  - prove the helper disables `Clear` for empty values and calls `onClear`
    without serializing `"transparent"` or an empty off-state value.
- If no shared helper is created, record that the proof stays in the changed
  editor-wave suites and do not leave an unused placeholder helper file.
- If Section editor/runtime changes through TASK-244-02-03:
  - targeted Section runtime test proving empty gradient fields omit
    `backgroundImage`;
  - `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
    proving background-color clear removes the key and no-regression behavior
    stays intact.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SECTION.md` through TASK-244-02-03 when Section background
  clear behavior changes
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Any shared clear-field helper stays Bun-free and editor-only.
2. Section keeps its current no-gradient-when-empty runtime behavior.
3. Clear buttons remove fields rather than writing transparent values.
4. Helper adoption reduces duplication without forcing all editors into a new
   abstraction.
5. Clear helper tests prove no `"transparent"` or empty-string sentinel is
   emitted solely by the clear action.
