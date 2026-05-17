# TASK-284-01: Spacer Editor Guidance and Input Accessibility

# FileName: TASK-284-01_Spacer_Editor_Guidance_and_Input_Accessibility.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-05-03, TASK-284
**Status:** To Do

---

## Overview

Improve Spacer-only editor guidance and accessible labeling from
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` without duplicating TASK-256 shared
token-control work.

This leaf covers only:

- UX-01: Wizard copy explaining that `fixed` uses one height for desktop,
  tablet, and mobile;
- BF-06: breakpoint help for desktop/tablet/mobile height fields;
- BF-07: copy that the custom input accepts bare numbers and normalizes them to
  pixels;
- A2: explicit accessible labels/help for custom height inputs instead of
  placeholder-only context.

## Scope Boundary

Out of scope:

- duplicate `none`/`0` options;
- `Custom px` no-op select behavior;
- fixed/responsive data preservation;
- Advanced fixed/responsive truthfulness;
- guide/canvas visibility or guide relabeling.

Those rows are owned by TASK-256-02 and TASK-256-05-03. This leaf must consume
the final shared behavior and then add only Spacer-specific labels, helper text,
and editor copy.

## Sub-Tasks

- [ ] Add a fixed-mode hint under the Wizard desktop height field when the
  current variant is `fixed`.
- [ ] Add breakpoint helper text for Desktop, Tablet, and Mobile height fields
  using the current Tailwind breakpoints already reflected by Spacer runtime
  classes.
- [ ] Update custom height input copy to say that `48` normalizes to `48px` and
  `48px` is also valid.
- [ ] Add accessible names or `aria-describedby` help for each custom height
  input.
- [ ] Keep the editor copy short enough for narrow inspector panels; cover the
  final strings and `aria-describedby` wiring in Vitest, and reserve actual
  wrapping/layout evidence for a Playwright or manual visual pass.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Add Spacer-specific helper text and accessible label/description wiring around `HeightField`, without changing shared token semantics. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add assertions for fixed-mode Wizard hint, breakpoint help text, exact concise helper strings, and custom input accessible names/descriptions. |
| `tests/vitest/widgets/spacer.test.tsx` | Add SSR editor smoke coverage only if the copy is rendered in server-side editor snapshots. |
| `_docs/_WIDGETS/SPACER.md` | Document the final author-facing meaning of fixed mode, breakpoints, and custom numeric values. |

## Implementation Pseudocode

```tsx
type HeightFieldProps = {
  label: string;
  value: string;
  breakpointHelp: string;
  customHelp: string;
  onChange(next: string): void;
};

function HeightField({ label, value, breakpointHelp, customHelp, onChange }: HeightFieldProps) {
  const helpId = useStableHeightHelpId(label);
  return (
    <div>
      <p>{label}</p>
      <p id={helpId}>{breakpointHelp}</p>
      <Input
        aria-label={`${label} custom height`}
        aria-describedby={helpId}
        placeholder="48 or 48px"
        value={isSpacerHeightToken(value) ? "" : value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p>{customHelp}</p>
    </div>
  );
}
```

Data flow:

1. Resolve the current widget variant with `resolveSpacerVariant(variant)`.
2. Render the existing desktop field in Wizard.
3. If the variant is `fixed`, render a short note that desktop height is reused
   for tablet and mobile.
4. For responsive Visual/Advanced fields, pass the breakpoint-specific help text
   into `HeightField`.

Error handling:

- Unknown variants still render the responsive fallback from
  `resolveSpacerVariant()`.
- Empty or malformed custom input must continue flowing through
  `normalizeSpacerData()`; this leaf only changes labels and help text.
- Do not add local parsing branches in the editor.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: copy and ARIA attributes are static strings; no user-authored HTML
  or script output is introduced.
- Secret handling: no secrets in editor copy, diagnostics, reports, or tests.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx` only if editor
  SSR snapshot expectations change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If this leaf is committed or moved to `Done` separately from TASK-284-05, also
  run root `bun run lint`, the targeted Vitest lane above,
  `bun run scan:security:strict`, and `bun run precommit`; otherwise keep this
  leaf open until TASK-284-05 runs the final family gate.

## Documentation Updates Required

- Update `_docs/_WIDGETS/SPACER.md` editor-mode notes for fixed mode,
  breakpoint meaning, and numeric custom values.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` rows UX-01, BF-06, BF-07,
  and A2 after validation.
- Update `_docs/WIDGETS.md` only if this leaf changes shared widget language.

## Changelog Policy

- Covered by the TASK-284 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard explains fixed-mode consequences before the user leaves the beginner
  flow.
- Height fields expose clear breakpoint meaning and custom numeric input help.
- Custom height inputs have accessible names/descriptions instead of relying on
  placeholder-only context.
- No TASK-256 token-control or guide/canvas behavior is reimplemented locally.
