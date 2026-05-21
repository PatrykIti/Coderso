# TASK-284-03: Spacer Named Rhythm Presets

# FileName: TASK-284-03_Spacer_Named_Rhythm_Presets.md

**Priority:** Medium
**Category:** Widgets + Layout + Admin UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-284-02, TASK-284, TASK-303
**Status:** Done (2026-05-21)

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
- transient preset application in Wizard and Visual that maps to concrete height
  values through the existing Spacer data model;
- preset source-of-truth owned by the Spacer contract module, not a one-off
  editor-local list;
- a fixed-mode preset path that stays truthful to hidden responsive values
  instead of silently destroying them.

Out of scope:

- global design-token editing;
- arbitrary user-defined preset libraries;
- page-wide rhythm governance;
- broad theme/profile changes outside the existing Spacer widget contract;
- `WidgetDefinition.presets`, `user_settings`, or a persisted `data.preset`
  field for Spacer rhythm aliases.

## Sub-Tasks

- [x] Keep presets as transient editor actions in this leaf; do not add a
  persisted `preset` field.
- [x] Define a bounded preset list in the Spacer contract module and have the
  editor consume it.
- [x] Map each preset to desktop/tablet/mobile values using existing token or
  TASK-284-02 safe length semantics.
- [x] Add Wizard and Visual controls that apply presets without hiding direct
  height editing.
- [x] Keep fixed mode non-destructive: while `fixed` is active, preset clicks
  only update desktop height and preserve the saved tablet/mobile values until
  the user switches back to `responsive`.
- [x] Add docs and tests that prove existing payloads still render unchanged,
  derived preset state is exact-match only, and manual overrides clear the
  active preset without changing the runtime schema.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | Add bounded preset ids/map/helpers in the Spacer contract and the exact-match derived preset helper. Do not add schema/default/normalizer fields in this leaf. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Add named preset controls in Wizard and Visual with clear current-value behavior and a non-destructive fixed-mode path. |
| `tests/vitest/widgets/spacer.test.tsx` | Add helper/runtime assertions for preset mappings and derived selected-preset behavior without changing existing payload rendering. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add editor assertions for applying presets, preserving hidden fixed-mode values, and clearing the derived preset after manual overrides. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Run as a guard for the Visual surface; no section-title changes are required in the final implementation. |
| `tests/unit/widgets/validator.test.ts` | Not required because this leaf does not add a persisted `preset` field. |
| `_docs/_WIDGETS/SPACER.md` | Document available presets, mapped heights, and fixed/manual override behavior. |
| `_docs/_WIDGETS/tmp/spacer/MATRIX.md` | No change required unless the final preset model stops matching the original research decision. |

## Implementation Pseudocode

```ts
const spacerPresetHeightMap = {
  "card-gap": { desktop: "8", tablet: "6", mobile: "4" },
  "section-gap": { desktop: "16", tablet: "12", mobile: "8" },
  "hero-gap": { desktop: "24", tablet: "20", mobile: "16" },
} as const;

type SpacerPresetId = keyof typeof spacerPresetHeightMap;

function applySpacerPreset(data: SpacerData, preset: SpacerPresetId): SpacerData {
  return {
    ...data,
    height: {
      ...spacerPresetHeightMap[preset],
    },
  };
}

function applySpacerPresetAction(
  data: SpacerData,
  variant: string,
  preset: SpacerPresetId
): SpacerData {
  if (resolveSpacerVariant(variant) === "fixed") {
    return {
      ...data,
      height: {
        ...data.height,
        desktop: spacerPresetHeightMap[preset].desktop,
      },
    };
  }

  return applySpacerPreset(data, preset);
}

function deriveSpacerPresetId(height: SpacerData["height"]): SpacerPresetId | null {
  const normalized = normalizeSpacerData({ height }).height;
  return findExactPresetMatch(normalized) ?? null;
}
```

Data flow:

1. The Spacer contract exports preset definitions, `applySpacerPreset()`, and
   `deriveSpacerPresetId()`.
2. Wizard and Visual render a separate preset chooser above direct height
   editing; `TokenOrPixelField` stays unchanged.
3. In `responsive`, selecting a preset writes a full desktop/tablet/mobile
   triplet through the existing `onChange` path.
4. In `fixed`, selecting a preset updates only the desktop height, preserving
   the saved tablet/mobile values until the user switches back to
   `responsive`.
5. Manual height edits stay available after a preset is applied; active preset
   state is derived from exact normalized triplet matches only.

Error handling:

- Unknown preset IDs normalize to no preset and keep existing height values when
  possible.
- Manual overrides must not be overwritten by background normalization.
- Fixed-mode preset clicks must not silently destroy the saved tablet/mobile
  values that TASK-256-05-03 preserves.
- Presets must not create new variants, persisted schema fields, global theme
  mutations, or new public DOM markers.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged because no new persisted field is added.
- Anti-abuse: preset IDs are enum values only; mapped lengths pass the same safe
  normalizer as direct height values.
- Secret handling: no secrets in preset IDs, editor copy, reports, or
  diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If this leaf is committed or moved to `Done` separately from TASK-284-05, also
  run root `bun run lint`, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/SPACER.md` with preset names, mapped heights, fixed-mode
  behavior, and manual override behavior.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` row BF-04 after validation.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if the preset model changes Spacer
  readiness/completeness.

## Changelog Policy

- Covered by the TASK-284 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Authors can apply named vertical rhythm presets from the Spacer editor.
- Presets stay transient in this leaf, map to bounded normalized height values,
  and do not introduce arbitrary CSS, repo-level preset storage, or a new
  persisted runtime field.
- Existing Spacer payloads render unchanged.
- Manual height editing remains available after a preset is applied.
- While `fixed` is active, presets must not silently overwrite the saved
  responsive heights.

## Completion Notes (2026-05-21)

- Spacer now ships three transient rhythm presets: `Card gap` (`8/6/4`),
  `Section gap` (`16/12/8`), and `Hero gap` (`24/20/16`).
- Wizard and Visual now expose a separate preset chooser above direct height
  editing without changing `TokenOrPixelField` semantics.
- Active preset state is derived from exact normalized triplet matches only;
  manual edits immediately clear the derived preset state.
- While `fixed` is active, preset clicks update desktop height only and
  preserve the saved tablet/mobile values until the user switches back to
  `responsive`.
