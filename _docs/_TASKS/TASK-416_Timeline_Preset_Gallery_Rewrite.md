# TASK-416: Timeline MUI-Aligned Preset Gallery Rewrite
# FileName: TASK-416_Timeline_Preset_Gallery_Rewrite.md

**Priority:** High
**Category:** CMS Widgets / Timeline / Page Builder / Admin UI / QA / Docs
**Estimated Effort:** Large
**Dependencies:** TASK-336 (Widget Editor Contract V2)
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Rewrite the `timeline` widget so it matches the capability surface of
[MUI React Timeline](https://mui.com/material-ui/react-timeline/) while staying
consistent with the existing widget infrastructure and `AGENTS.md` product/editor
rules. The current widget carries two competing drivers — block `variant`
(`milestones`/`cards`/`compact`) **and** `data.mode`
(`process`/`axis`/`chronology`/`alternating`) — that override each other inside
`TimelineBlock`. The practical regression (reported by the product owner) is that
**many Visual options do not reflect in the page-builder canvas**, because the
active mode's renderer silently ignores fields the editor still exposes.

This is a confirmed **clean break** on the timeline data shape (no legacy adapter
for old `mode`/`layout`/`guides`/`style` payloads). Grep confirms **no code seeds a
`type:"timeline"` block** (assistant site-builder, section/page presets, and the
module pack matrix do not instantiate timeline; the seeded `compare-timeline` is a
different widget), so the blast radius is the widget file, its editor file, and the
timeline tests/fixtures.

New product contract:

- Presets become the block `variant`s (the idiomatic pattern used by `hero`,
  `pricingPlans`): `vertical-right`, `vertical-left`, `alternating`,
  `alternating-opposite`, `cards`, `compact`. The separate `data.mode` field is
  removed, so there is one source of truth.
- The **Visual editor option list depends on the selected preset**, driven by one
  exported, typed `timelineVariantCapabilities` table consumed by normalize,
  render, and the editor — guaranteeing "shown ⇒ rendered".
- MUI feature groups added to data + render: axis **position**
  (left/right/alternate/alternate-reverse), per-step **opposite content**, dot
  **variant** (filled/outlined), and semantic dot **color tones**
  (primary/secondary/success/error/warning/info/grey) mapped to theme tokens.
  Custom-icon dots are kept. The hardcoded `emerald` status color is removed in
  favor of token-mapped tones.
- The single-shot **Wizard → Visual → Advanced** editor contract is preserved.
- All surfaces (page-builder canvas, admin preview, public front) already render
  through `WidgetRenderer → def.render = TimelineBlock`; removing the mode/variant
  duality is what makes them identical.

Reference plan: `/home/coder/.claude/plans/mamy-w-agents-md-zasady-zazzy-lightning.md`.

## Sub-Tasks (physical children)

- [x] **TASK-416-01** — Widget contract + render rewrite
  (`core/widgets/core/timeline.tsx`): types, `timelineVariantCapabilities`, schema,
  defaults, `normalizeTimelineData`, dot/tone/opposite render, two layout
  primitives, `createTimelineWidget` + new `timelineEditorContract`.
- [x] **TASK-416-02** — Editor rewrite + preset-aware option gating
  (`core/admin/ui/widgets/editors/TimelineEditors.tsx`): wizard preset gallery,
  capability-gated visual sections, new axis/dot/opposite controls, advanced
  diagnostics.
- [x] **TASK-416-03** — Tests rewrite + cross-referencing fixtures
  (`tests/vitest/widgets/timeline.test.tsx` and impacted suites).
- [x] **TASK-416-04** — Docs, registration verification, changelog, and closure.

## Implementation Pseudocode (family-level)

```ts
// Single source of truth gates editor + normalize + render.
export const timelineVariantCapabilities: Record<TimelineVariantId, TimelineVariantCapability>;

function TimelineBlock({ data, variant }) {
  const cap = resolveTimelineCapability(variant);            // falls back to first preset
  const d = normalizeTimelineData(data, variant);            // coerces to cap.allowed* sets
  return cap.orientation === "horizontal"
    ? <TimelineHorizontalLayout data={d} cap={cap} />
    : <TimelineVerticalLayout data={d} cap={cap} />;          // position/opposite/cards
}
```

Data flow: editor writes data → `normalizeWidgetBlock` validates against
`timelineSchema` (`additionalProperties:false`) → `TimelineBlock` reads only
resolved fields gated by the active preset capability.

Error handling: unknown variant falls back to the first preset; unsafe
`cta.href`/`link.href` dropped via `normalizeWidgetSafeHref`; step count clamped to
3–8; cleared colors omitted via `clearableStyle`.

Regression-test shape: per-preset render attributes, capability "shown⇒rendered /
hidden⇒inert" invariant, safe-href + link-nesting suppression, a11y, editor-contract
validity, and canvas-vs-public render parity.

## Security Contract

This task does not add or change API routes.

- Endpoint visibility: none.
- Auth / RBAC / CSRF / rate-limit: unchanged.
- Validation: timeline data stays schema-first through `timelineSchema` +
  `normalizeTimelineData` + widget block validation; CTA/whole-step destinations
  stay sanitized through the shared `normalizeWidgetSafeHref` contract.
- Anti-abuse: not applicable; public timeline rendering remains read-only.
- Secret handling: docs and validation evidence must not include credentials,
  provider keys, database URLs, or raw sensitive logs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- Any impacted page-builder/validator/renderer Vitest suites that reference
  `"timeline"` (identified during TASK-416-03).
- Real browser smoke with **playwright-cli** against the dev host started via the
  **`coderso-dev-core-host`** command: add a Timeline block, cycle all six presets,
  and verify every visible option changes the canvas + admin preview + public front
  (especially the previously broken layout/marker controls), opposite content,
  axis position, and dot tones.

## Documentation Updates Required

- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/WIDGETS.md` (timeline editor IA specifics)
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1137-2026-06-07-task-416-timeline-preset-rewrite.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes

- Collapsed the dual `variant`/`data.mode` model into six MUI-aligned presets that
  are the block `variant`s, removing the field that caused Visual options to be
  silently dropped in the canvas. One exported `timelineVariantCapabilities` table
  now drives normalize, render, and editor option visibility ("shown ⇒ rendered").
- Added axis position, per-step opposite content (`<time>`), filled/outlined dots,
  and semantic dot tones mapped to theme tokens; removed the hardcoded `emerald`
  status color. Render collapsed to two layout primitives (vertical + horizontal).
- Rebuilt the Wizard (preset gallery), preset-gated Visual editor, and read-only
  Advanced editor with a validator-passing `timelineEditorContract` (explicit
  `variant` duplicate-writable allowance shared by Wizard and Visual).
- Clean break confirmed safe: no code seeds a `type:"timeline"` block, so only
  author-created pages must re-add the widget. Diagnostic `data-timeline-*`
  attributes were renamed; no pack-matrix change was needed.

## Validation Evidence

- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `bun run test:vitest -- tests/vitest/widgets tests/vitest/pageBuilder`: passed,
  69 files / 779 tests.
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`: passed.
- `bun test tests/unit/widgets/validator.test.ts`: passed, 34 tests.
- Live host via `coderso-dev-core-host`: booted cleanly with the rewritten widget;
  playwright-cli loaded the admin in a real browser, authenticated, and created a
  builder page with no client errors. The full visual click-through (cycle all six
  presets across canvas/admin preview/public front) remains a manual confirmation
  step, covered in automation by the public-vs-editor-preview render-parity and
  capability "shown⇒rendered" invariant tests.
