# TASK-284-03: Spacer Named Rhythm Presets

# FileName: TASK-284-03_Spacer_Named_Rhythm_Presets.md

**Priority:** Medium
**Category:** Widgets + Layout + Admin UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-284-02, TASK-284, TASK-303
**Status:** To Do

---

## Overview

Add named Spacer presets from `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` so
authors can keep vertical rhythm consistent without memorizing height tokens.

This leaf covers BF-04 only. It must stay beginner-friendly and avoid turning
Spacer into a generic style manager. It assumes the already-landed shared
Spacer/Divider token-control and fixed/responsive truthfulness closures from
TASK-303 and TASK-256-05-03, and it must not restage those contracts locally.

## Scope Boundary

In scope:

- named presets such as `section-gap`, `card-gap`, and `hero-gap`;
- transient preset application in Wizard/Visual that maps to concrete height
  values through the existing Spacer data model;
- preset source-of-truth owned by the Spacer contract module, not a one-off
  editor-local list.

Out of scope:

- global design-token editing;
- arbitrary user-defined preset libraries;
- page-wide rhythm governance;
- broad theme/profile changes outside the existing Spacer widget contract.

## Sub-Tasks

- [ ] Keep presets as transient editor actions in this leaf; do not add a
  persisted `preset` field.
- [ ] Define a bounded preset list in the Spacer contract module and have the
  editor consume it.
- [ ] Map each preset to desktop/tablet/mobile values using existing token or
  TASK-284-02 safe length semantics.
- [ ] Add Wizard or Visual controls that apply presets without hiding direct
  height editing.
- [ ] Add docs and tests that prove existing payloads still render unchanged,
  including fixed-mode apply semantics that preserve hidden tablet/mobile values
  for later responsive editing.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | Add bounded preset ids/map/helpers in the Spacer contract and any derived selected-preset helper needed by the editor. Do not add schema/default/normalizer fields in this leaf. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Add named preset controls with clear current-value behavior and no broad style-manager UI. |
| `tests/vitest/widgets/spacer.test.tsx` | Add helper/runtime assertions for preset mappings and derived selected-preset behavior without changing existing payload rendering. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add editor assertions for applying presets, preserving manual overrides, and keeping hidden fixed-mode values truthful. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update if Spacer Visual section/copy changes in a way that affects widget-template block settings rendering. |
| `tests/unit/widgets/validator.test.ts` | Not required unless a future revision adds a persisted `preset` field, which this leaf should avoid. |
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

function deriveSpacerPresetId(height: SpacerData["height"]): SpacerPresetId | null {
  return findExactPresetMatch(height) ?? null;
}
```

Data flow:

1. The editor renders preset buttons or a select from the bounded preset map
   exported by the Spacer contract owner.
2. Selecting a preset writes a full desktop/tablet/mobile triplet through the
   existing `onChange` path.
3. When the widget is currently `fixed`, the runtime still resolves tablet and
   mobile from desktop, but the preset-applied hidden values remain available if
   the user switches back to `responsive`.
4. Manual height edits remain available after a preset is applied; the selected
   preset state is derived from exact value matches instead of a persisted field.

Error handling:

- Unknown preset IDs normalize to no preset and keep existing height values when
  possible.
- Manual overrides must not be overwritten by background normalization.
- Applying a preset while `fixed` is active must not destroy the hidden
  tablet/mobile values needed for a later switch back to `responsive`.
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
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx` if
  the Visual section/copy changes in block settings output.
- `bun test tests/unit/widgets/validator.test.ts` only if a future revision adds
  a persisted `preset` field.
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
- Presets stay transient in this leaf, map to bounded normalized height values,
  and do not introduce arbitrary CSS or a new persisted runtime field.
- Existing Spacer payloads render unchanged.
- Manual height editing remains available after a preset is applied, including a
  truthful fixed-mode path that preserves hidden responsive values.
