# TASK-303: Divider and Spacer Residual Shared Token Control Adoption

# FileName: TASK-303_Divider_and_Spacer_Residual_Shared_Token_Control_Adoption.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-04, TASK-256-05-03, TASK-264
**Status:** Done (2026-05-17)

---

## Overview

Close the residual shared token/color-control drift that remained live in the
Divider and Spacer editors after TASK-256 closure.

This task exists because live code still contradicts the shared contract:

- Divider spacing still exposes duplicate `None` and `0` choices, a dead-end
  `Custom px` select path, and fallback-only resolved copy.
- Spacer height fields still expose the same duplicate/off-contract custom
  token path.
- Divider color swatches still overwrite CSS-variable values when authors touch
  the native color input.

The task owns only the shared control behavior needed to make Divider/Spacer
truthful again before TASK-264 continues with Divider-local product work.

## Scope Boundary

This task does not own Divider product expansion from TASK-264:

- label color/typography/gap/nowrap;
- width alignment and container-width controls;
- line-style product expansion, spacer-only mode, preview, reset, or DOM marker
  hygiene.

This task also does not reopen unrelated TASK-256 widgets unless a reusable
helper is required to fix Divider/Spacer truthfully. Keep the write scope narrow
to the owners below.

## Drift Matrix

| Finding | Owner here | Notes |
|---|---|---|
| Divider duplicate `none`/`0` spacing choices | Yes | Shared token/off-state truthfulness |
| Divider `Custom px` select no-op | Yes | Shared custom-token editor UX |
| Divider spacing fallback copy without invalid feedback | Yes | Shared token/custom validation truthfulness |
| Divider color swatch overwrites CSS variables | Yes | Shared color-picker preservation contract |
| Spacer duplicate `none`/`0` height choices | Yes | Same shared token contract |
| Spacer `Custom px` select no-op | Yes | Same shared custom-token contract |
| Spacer breakpoint-preservation or guide semantics | No | Already owned by TASK-256-05-03/TASK-284; do not widen here |
| Divider-local product backlog from `TASK-264-*` | No | Resume under TASK-264 after this task lands |

## Sub-Tasks

- [x] Add a shared editor helper or local shared logic for token/custom fields
  that keeps one visible off-state, makes the custom path explicit, and
  surfaces validation/resolved feedback truthfully.
- [x] Adopt that behavior in `DividerEditors.tsx` spacing fields.
- [x] Adopt that behavior in `SpacerEditors.tsx` height fields.
- [x] Make Divider color inputs preserve CSS-variable text values unless the
  user intentionally edits the text field away from the token.
- [x] Add or update focused editor tests for Divider and Spacer shared control
  behavior.
- [x] Re-run the shared `styleNoneTokens` coverage if the Divider marker
  contract changes while preserving `none` token runtime compatibility.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Replace duplicate/off-contract spacing token UX, keep invalid custom drafts visible with truthful feedback, and preserve CSS-variable color values through the swatch/text split. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Replace duplicate/off-contract height token UX, keep invalid custom drafts visible with truthful feedback, and remove the dead-end custom select path. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Add regression coverage for the shared Divider spacing/custom/color contract. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add regression coverage for the shared Spacer token/custom contract. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Revalidate Divider `none` token output when editor behavior changes. |
| `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` | Mark C2/C3/U1/U7 and the spacing side of U6 against this task or its landed evidence. |
| `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` | Mark the corresponding shared token/custom rows against this task or its landed evidence. |

## Implementation Pseudocode

```tsx
type TokenFieldValidation =
  | { status: "token"; resolved: string; message: string }
  | { status: "custom-valid"; resolved: string; message: string }
  | { status: "custom-invalid"; resolved: string; message: string };

function buildSharedTokenFieldState(
  rawValue: string,
  tokenSet: readonly string[],
  resolveCss: (value: string) => string
) {
  const isToken = tokenSet.includes(rawValue);
  if (isToken) {
    return {
      selectValue: rawValue === "0" && tokenSet.includes("none") ? "none" : rawValue,
      inputValue: "",
      validation: { status: "token", resolved: resolveCss(rawValue), message: "Resolved from token." },
    };
  }

  const resolved = resolveCss(rawValue);
  const valid = resolved === rawValue || resolved.endsWith(rawValue);
  return {
    selectValue: "__custom__",
    inputValue: rawValue,
    validation: valid
      ? { status: "custom-valid", resolved, message: "Resolved custom value." }
      : { status: "custom-invalid", resolved, message: "Invalid value; runtime falls back safely." },
  };
}

function handleDividerColorSwatchChange(current: string | undefined, nextHex: string) {
  return typeof current === "string" && current.trim().startsWith("var(") ? current : nextHex;
}
```

Error handling:

- Legacy `0` values remain backward compatible in persisted payloads, but the
  editor must collapse them behind one visible off-state when `none` is the
  canonical choice.
- Choosing the custom branch must immediately expose the custom input and never
  no-op silently.
- Invalid custom text stays visible long enough for the user to correct it.
- CSS-variable text values must not be overwritten just because the swatch can
  only render hex; the UI may show fallback copy or a safe preview swatch.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged; this task only changes editor behavior.
- Anti-abuse: no raw HTML, script, or unsafe attribute behavior is introduced.
- Secret handling: no secrets in editor state, diagnostics, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit` before any manual commit or closure commit

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.
- Update `_docs/_TASKS/README.md` for status transitions.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the task
  is completed.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.

## Acceptance Criteria

- Divider and Spacer no longer expose duplicate visible off-state choices for
  the affected token fields.
- Choosing the custom option immediately reveals a usable custom-input path
  instead of a dead-end select choice.
- Divider color swatches do not silently destroy CSS-variable text values.
- Invalid custom input shows truthful feedback while runtime normalization
  remains safe.
- Divider `none` token runtime output remains backward compatible and covered by
  tests.
