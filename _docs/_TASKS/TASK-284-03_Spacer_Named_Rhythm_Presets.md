# TASK-284-03: Spacer Named Rhythm Presets

# FileName: TASK-284-03_Spacer_Named_Rhythm_Presets.md

**Priority:** Medium
**Category:** Widgets + Layout + Admin UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-284-02, TASK-284
**Status:** To Do

---

## Overview

Add named Spacer presets from `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` so
authors can keep vertical rhythm consistent without memorizing height tokens.

This leaf covers BF-04 only. It must stay beginner-friendly and avoid turning
Spacer into a generic style manager.

## Scope Boundary

In scope:

- named presets such as `section-gap`, `card-gap`, and `hero-gap`;
- preset application in Wizard/Visual that maps to schema-backed height values;
- optional persisted preset metadata only if it is useful for later editing and
  remains backward compatible.

Out of scope:

- global design-token editing;
- arbitrary user-defined preset libraries;
- page-wide rhythm governance;
- broad theme/profile changes outside the existing Spacer widget contract.

## Sub-Tasks

- [ ] Decide whether presets are transient editor actions or a persisted
  `preset` field.
- [ ] Define a bounded preset list in the Spacer contract or editor-local module.
- [ ] Map each preset to desktop/tablet/mobile values using existing token or
  TASK-284-02 safe length semantics.
- [ ] Add Wizard or Visual controls that apply presets without hiding direct
  height editing.
- [ ] Add docs and tests that prove existing payloads still render unchanged.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | Add preset constants and optional schema/default/normalizer support only if the preset is persisted. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Add named preset controls with clear current-value behavior and no broad style-manager UI. |
| `tests/vitest/widgets/spacer.test.tsx` | Add normalizer/runtime assertions for preset mappings if persisted. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add editor assertions for applying presets and preserving manual overrides. |
| `tests/unit/widgets/validator.test.ts` | Run or update if a persisted `preset` field is added. |
| `_docs/_WIDGETS/SPACER.md` | Document available presets and their mapped heights. |
| `_docs/_WIDGETS/tmp/spacer/MATRIX.md` | Update the research decision only if the final preset model changes the original matrix conclusion. |

## Implementation Pseudocode

```ts
const spacerPresetMap = {
  "card-gap": { desktop: "8", tablet: "6", mobile: "4" },
  "section-gap": { desktop: "16", tablet: "12", mobile: "8" },
  "hero-gap": { desktop: "24", tablet: "20", mobile: "16" },
} as const;

type SpacerPresetId = keyof typeof spacerPresetMap;

function applySpacerPreset(current: SpacerData, preset: SpacerPresetId): SpacerData {
  return {
    ...current,
    height: spacerPresetMap[preset],
  };
}
```

Data flow:

1. The editor renders preset buttons or a select from the bounded preset map.
2. Selecting a preset writes concrete height values through the existing
   `onChange` path.
3. Manual height edits remain available and may clear any persisted `preset`
   marker if the final design stores one.

Error handling:

- Unknown preset IDs normalize to no preset and keep existing height values when
  possible.
- Manual overrides must not be overwritten by background normalization.
- Presets must not create new variants or global theme mutations.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: add any persisted preset field to `spacerSchema`
  with a bounded enum and validator tests.
- Anti-abuse: preset IDs are enum values only; mapped lengths must pass the same
  safe normalizer as direct height values.
- Secret handling: no secrets in preset IDs, editor copy, reports, or
  diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If this leaf is committed or moved to `Done` separately from TASK-284-05, also
  run root `bun run lint`, targeted Vitest/Bun lanes above,
  `bun run scan:security:strict`, and `bun run precommit`; otherwise keep this
  leaf open until TASK-284-05 runs the final family gate.

## Documentation Updates Required

- Update `_docs/_WIDGETS/SPACER.md` with preset names, mapped heights, and manual
  override behavior.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` row BF-04 after validation.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if the preset model changes Spacer
  readiness/completeness.

## Changelog Policy

- Covered by the TASK-284 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Authors can apply named vertical rhythm presets from the Spacer editor.
- Presets map to bounded, normalized height values and do not introduce
  arbitrary CSS.
- Existing Spacer payloads render unchanged.
- Manual height editing remains available after a preset is applied.
