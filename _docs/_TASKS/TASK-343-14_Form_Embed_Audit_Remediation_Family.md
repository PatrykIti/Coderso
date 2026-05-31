# TASK-343-14: Form Embed Audit Remediation Family

# FileName: TASK-343-14_Form_Embed_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Form Embed + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the confirmed Form Embed truthfulness drift around inert spacing, false
custom-color state, sticky clear/reset labels, misleading override counters, and
public empty-state messaging.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FORM_EMBED_WIDGET.md:243-254`
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx:704-763,1239,1376,1401`
- `core/widgets/core/formEmbed.tsx:196-219,458-472,985`

## Sub-Tasks

- [x] Make `Spacing` either visibly affect layout or stop pretending to own
  vertical spacing when `sectionPaddingY` is the real owner.
- [x] Treat theme-default CSS-variable values truthfully in the color controls
  and Advanced summary.
- [x] Make `Clear` genuinely return affected colors to `Theme default`.
- [x] Fix TTL lower-bound coercion and public empty-state/error messaging.
- [x] Route report items I5/I7/I8/I9/N3/N4 explicitly: either add local
  follow-up acceptance here or mark them deferred/shared in the implementation
  notes so they are not silently lost.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Fix spacing truthfulness, override counters, and control labels. |
| `core/widgets/core/formEmbed.tsx` | Fix layout ownership, clear semantics, and public fallback messaging. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover spacing, clear semantics, TTL normalization, and empty-state text. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover truthful color labels, override counters, and spacing ownership. |

## Implementation Pseudocode

```ts
function resolveFormEmbedSpacing(layout: FormEmbedLayout) {
  const spacing = isSpacing(layout.spacing ?? "md") ? layout.spacing ?? "md" : "md";
  const sectionPaddingY =
    layout.sectionPaddingY === undefined ? spacingClassMap[spacing].sectionPaddingY : layout.sectionPaddingY;
  return { spacing, sectionPaddingY };
}

function clampSavedProgressTtl(raw: string | number | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(parsed)) return 7;
  return Math.max(1, Math.min(30, parsed));
}
```

`clampSavedProgressTtl` must be used consistently by the editor input path and
the persisted normalizer; otherwise `0` can still round-trip to the default `7`.

## Regression Test Shape

- `Spacing` has a visible effect or is no longer mislabeled.
- `Clear` moves affected controls back to `Theme default`.
- Pristine color counters do not claim saved overrides.
- Existing UI tests that assert `Saved custom color` for pristine
  theme-default values must be updated to the shared `TASK-343-30` vocabulary.
- `0` days TTL clamps to `1`, not `7`.

## Security Contract

No API routes are added. Public form runtime must not leak raw internal error
codes if a friendlier safe message can be used.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_FORM_EMBED_WIDGET.md`.
- Update `_docs/_WIDGETS/FORM_EMBED.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Form Embed controls describe and reset real state truthfully.
- Empty-state/runtime messaging is user-facing rather than raw-code-facing.

## Completion Notes (2026-05-30)

- `Spacing` now applies the matching `sectionPaddingY` token in the Visual
  editor, so changing the spacing macro produces visible vertical padding
  changes instead of only updating `data-form-embed-spacing`.
- Form Embed now owns theme-default color values in the widget contract module.
  Visual controls hide pristine theme-token defaults as `Theme default`, `Clear`
  removes authored color keys, and Advanced counts only non-default authored
  color overrides.
- Saved-progress TTL coercion now uses `clampSavedProgressTtl`, so `0` clamps
  to `1` in both editor input and normalization.
- Public runtime error copy now maps known internal codes to user-facing
  messages and does not render raw `form_missing`/runtime codes.
- I5 is fixed locally by removing the duplicate base `border` class from the
  surface; N3 is fixed by distinguishing default success copy from authored
  success copy. I8 is handled with truthful Visual copy for multi-step controls.
  I7 remains shared color-control UX scope under `TASK-343-30`; I9 remains
  shared visibility-wrapper scope under `TASK-343-21`; N4 remains deferred
  product scope because the widget has only one runtime variant.

## Validation Executed (2026-05-30)

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-14
  drift review: no blockers; verified and fixed the noted task-board counter
  drift)
