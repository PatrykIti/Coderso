# TASK-541-02-L01: Roll Out Color Contract to Admin Controls

# FileName: TASK-541-02-L01-Roll-Out-Color-Contract-To-Admin-Controls.md

**Parent Subtask:** TASK-541-02
**Priority:** High
**Category:** Admin UI / Shared Color Controls
**Estimated Effort:** Medium
**Dependencies:** TASK-541-01-L01
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

---

## Ownership

Own only:

- `core/admin/ui/shared/colorValue.ts`
- `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx`
- `core/admin/ui/widgets/editors/SharedColorControl.tsx`

Do not edit call sites/tests here. Do not run concurrently with TASK-481 if its active
file set overlaps these controls. Read the post-TASK-539 Page control call sites before
editing the shared control; their authoring profile, gallery UI, and narrow-canvas
behavior are compatibility inputs, not TASK-541 rewrite scope.

## Implementation Pseudocode

Turn `colorValue.ts` into a picker adapter over `parseCssColorValue` and
`normalizeCssColorValue`; remove its RGB/HSL/keyword grammar and range decisions.
Existing exports used by controls remain thin compatibility adapters where useful:

```ts
parseColorValue(value, profile = "authoring")
  -> shared parsed result or the existing UI-only unknown representation
normalizeAdminColorValue(value, profile = "authoring")
  -> normalizeCssColorValue(value, profile)
pickerHexFor/colorAlpha/isAlphaPickerRepresentable
  -> derive solely from shared parsed metadata
```

Never clamp an invalid channel to produce a preview. An unknown stored value remains
visible/untouched until the user explicitly chooses or commits a valid replacement.

Add `colorProfile?: CssColorProfile` to both controls, defaulting to `authoring`.
`ColorSwatchControl` Page/menu authoring always uses authoring. `SharedColorControl`
passes the profile through parse, free-text commit, representability and state
description. Remove `color-mix` classification because it is not accepted by either
canonical profile. A token remains theme-token state; inherited keywords become
saved-custom/inherited state only when their explicit profile permits them.

On free-text commit:

```text
draft -> normalizeCssColorValue(profile)
undefined -> keep prior stored value and restore/retain draft per current UX
normalized -> emit exactly normalized bytes once
```

Native picker and opacity slider continue to emit canonical hex/hex8 through existing
composition helpers. Do not mutate a stored value in an effect or on mount.

## Error and compatibility flow

An invalid free-text commit emits no `onChange`, retains the last valid stored value,
and keeps/restores bounded draft feedback through the existing control UX. Parsing never
throws or substitutes a fallback color. Existing valid stored values and clear/disabled
semantics remain unchanged.

## Security/UX invariants

- UI validation does not replace menu/widget server/render validation.
- No synchronous setState in effect, no mount commit, no localStorage/cache changes.
- Disabled/transparent/clear behavior and light/dark chrome remain unchanged.
- Do not expose inherited profile implicitly through a broad default.

## Test Handoff and Validation

TASK-541-03-L01 owns test edits.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/ui/color-value.test.ts tests/vitest/ui/color-swatch-alpha.test.tsx tests/vitest/ui/shared-color-alpha.test.tsx tests/vitest/ui/shared-color-control.test.tsx
bun run test:vitest -- tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-editor-gallery-items-control.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

The three Page suites are read-only post-TASK-539 compatibility gates. A failure caused
by the shared color control must be fixed in TASK-541-owned source without weakening or
re-baselining TASK-539 gallery/narrow-canvas assertions.
