# TASK-244-02-03: Section Background Color Clear

# FileName: TASK-244-02-03_Section_Background_Color_Clear.md

**Priority:** High
**Category:** Widgets + Section + Editor Controls
**Estimated Effort:** Small
**Dependencies:** TASK-244-02-01, TASK-244-02-02
**Status:** Done (2026-04-30)

---

## Overview

Promote `section` from helper/no-regression coverage to an explicit
clear-required surface for `style.backgroundColor`.

Section already omits gradients when both endpoints are empty and omits overlay
DOM when `overlayOpacity` is `0`. That no-regression behavior stays owned by
TASK-244-02-02. This leaf only adds a first-class `Clear` action for the
Section background color so the editor removes `style.backgroundColor` and the
runtime omits the `backgroundColor` style instead of rendering
`"transparent"` as an off-state fallback.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/section.tsx`
- `core/admin/ui/widgets/editors/SectionEditors.tsx`
- `tests/vitest/widgets/section.test.tsx`
- `tests/vitest/ui/section-editor-wave.test.tsx`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/WIDGETS.md` if global `Clear` semantics are documented there

## Implementation Notes

Current Section ownership:

- `SectionData.style.backgroundColor` is already part of the type and strict
  schema at `section.tsx:28-38` and `section.tsx:71-85`.
- `sectionDefaults.style.backgroundColor` is currently `"transparent"` at
  `section.tsx:100-109`.
- `normalizeSectionData()` re-materializes the default at `section.tsx:191-200`.
- `SectionBlock` renders `backgroundColor: style.backgroundColor ??
  "transparent"` at `section.tsx:257-258`.
- `SectionEditors.tsx:289-295` and `SectionEditors.tsx:407-413` expose
  `Background color` without a semantic `Clear` action.
- `section-editor-wave.test.tsx:665-672` currently proves an empty text input
  serializes `backgroundColor: ""`; TASK-244 clear semantics require omitted
  keys instead of empty-string off-state sentinels.

Do not change Section gradient/overlay semantics beyond regression coverage:

- empty `gradientFrom` + empty `gradientTo` must still omit `backgroundImage`;
- `overlayOpacity: 0` must still omit overlay DOM;
- border width, radius, semantics, slots, and heading behavior are outside this
  leaf except where tests need to preserve them.

Default and compatibility policy:

- Use **creation default only** for new Section blocks. Keep the default visual
  background in inserted/default widget data where needed, but do not let the
  normalizer or renderer turn a cleared missing `backgroundColor` back into
  `"transparent"`.
- Because `normalizeWidgetBlock()` shallow-merges widget defaults before
  validation, clearing the last Section style key must persist `style: {}` when
  needed to override `sectionDefaults.style`.
- Existing saved Sections that explicitly contain `backgroundColor:
  "transparent"` remain valid and may still render a deliberate transparent
  style. The clear action must not write that value.

## Implementation Pseudocode

Runtime style construction:

```ts
function resolveClearableStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

const backgroundColor = resolveClearableStyleValue(style.backgroundColor);
const surfaceStyle = compactStyle({
  backgroundColor,
  backgroundImage: hasGradient ? gradientValue : undefined,
  borderColor: resolveClearableStyleValue(style.borderColor),
  borderStyle: "solid",
  borderWidth: borderWidthValueMap[style.borderWidth ?? "0"] ?? "0px",
});
```

Editor clear action:

```ts
function clearSectionStyleField<K extends keyof NonNullable<SectionData["style"]>>(
  key: K
) {
  const { [key]: _removed, ...nextStyle } = value.style ?? {};
  onChange({
    ...value,
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
}
```

Keep the `Clear` action next to both Section background color controls, not in a
separate editor mode. If TASK-244-02-02 extracts a shared clear field helper,
use that helper here; otherwise keep the Section clear removal local.

## Security Contract

- Visibility:
  - Section editor controls are internal admin UI;
  - rendered Section output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced;
  - Section edits persist through the existing authenticated admin
    page/template save flow.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this leaf does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - `style.backgroundColor` remains owned by the strict Section schema;
  - unknown `style` keys must still be rejected.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - background color values must render through validated inline style fields,
    not user-controlled class-name fragments.
- Compatibility:
  - deliberate `"transparent"` values remain valid user-specified colors;
  - the `Clear` action must not write `"transparent"` or an empty string as an
    off-state sentinel.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- Add or update tests proving:
  - configured `style.backgroundColor` still renders;
  - `style: {}` saved data does not regain `sectionDefaults.style.backgroundColor`
    through the shared default merge path;
  - cleared background color omits `backgroundColor` from runtime output;
  - empty gradient endpoints still omit `backgroundImage`;
  - `overlayOpacity: 0` still omits overlay DOM;
  - editor `Clear` removes `style.backgroundColor` while preserving unrelated
    Section style keys;
  - clear does not serialize `"transparent"` or an empty string as an off-state
    payload;
  - unknown Section `style` keys remain rejected by widget validation.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/SECTION.md`
- `_docs/WIDGETS.md` if global `Clear` semantics are documented there
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Section background color has a visible `Clear` action in every editor mode
   that exposes the background color.
2. Clear removes `style.backgroundColor` from emitted Section data.
3. Runtime omits cleared `backgroundColor` output and does not fall back to
   `"transparent"` solely because the field was cleared.
4. Existing empty-gradient and zero-overlay behavior remains stable.
5. Section validation remains strict and rejects unknown style keys.
