# TASK-252-02: Widget Research Archive and Variant Model

# FileName: TASK-252-02_Widget_Research_Archive_and_Variant_Model.md

**Priority:** High
**Category:** Widgets + Product Research + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-252
**Status:** Done
**Started:** 2026-05-10
**Completed:** 2026-05-10

---

## Overview

Create a license-safe research archive for proven React/Tailwind widget and
block patterns, then translate the findings into a Coderso-owned variant/mode
matrix.

The user request is to inspect real widget/block libraries and collect multiple
versions of every Pages-publishable widget before expanding our editors. This
task makes that workflow explicit and safe: research artifacts must be stored
under `_docs/_WIDGETS/tmp/<widget>/**`, but third-party code may only be copied
when the license permits it and the license/source are recorded.

## Business Requirements

- Create a research archive structure:
  - `_docs/_WIDGETS/tmp/README.md`
  - `_docs/_WIDGETS/tmp/hero/`
  - `_docs/_WIDGETS/tmp/timeline/`
  - one folder for every Pages-publishable widget listed in TASK-252.
- Each captured pattern must record:
  - title/name;
  - source URL;
  - access type: `open-source`, `docs-example`, `premium-reference`,
    `unknown-license`;
  - license or terms summary when available;
  - observed UX pattern;
  - Coderso mapping decision;
  - whether source code can be copied, summarized only, or ignored.
- Gather at least ten credible patterns per widget before that widget's
  implementation leaf finalizes. Valid references can include React/Tailwind
  libraries, block libraries, CMS/page-builder blocks, plugin/theme patterns,
  and production page references when component libraries do not expose enough
  examples.
- Do not treat primitives as automatically low-scope. Simple widgets such as
  `spacer` and `divider` still need research-backed decisions; the result may
  be a short, deliberate option set when the research shows that more controls
  would add noise.
- If fewer than ten useful public patterns exist for a widget after a documented
  search, create `_docs/_WIDGETS/tmp/<widget>/SHORTFALL.md` with searched
  sources, rejected matches, and the reason the final sample is sufficient.
- For every widget, produce a decision matrix that marks observed options as
  `Keep`, `Adapt`, or `Reject` before the editor/schema list is finalized.
- Translate research into Coderso-owned models:
  - do not create ten separate widget types for ten examples;
  - add variants, presets, display modes, and editor sections only when they
    fit our existing schema-first widget contract.

## Sub-Tasks

- [ ] Create `_docs/_WIDGETS/tmp/README.md` with archive rules and copy policy.
- [ ] Create one `_docs/_WIDGETS/tmp/<widget>/` folder for each
  Pages-publishable widget from TASK-252.
- [ ] Capture at least ten research cards per widget or a widget-local
  `SHORTFALL.md` with the documented search and exclusion rationale.
- [ ] Produce a per-widget matrix that maps research patterns to Coderso-owned
  fields, modes, editor sections, and tests.
- [ ] Mark every candidate option as `Keep`, `Adapt`, or `Reject` so later
  implementation leaves do not rediscover the same product decisions.
- [ ] Audit the archive for license/source metadata before implementation uses
  the findings.

## Research Sources

Initial source seeds:

- Flowbite React Timeline:
  `https://flowbite-react.com/docs/components/timeline`
- Flowbite Timeline:
  `https://flowbite.com/docs/components/timeline/`
- Material UI Timeline:
  `https://mui.com/material-ui/react-timeline/`
- Chakra UI Timeline:
  `https://chakra-ui.com/docs/components/timeline`
- Aceternity Timeline:
  `https://ui.aceternity.com/components/timeline`
- shadcn.io blocks and timeline hero:
  `https://www.shadcn.io/blocks`
  `https://www.shadcn.io/blocks/hero-timeline`
- Tailwind UI Hero Sections:
  `https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes`
- Frameium:
  `https://frameium.com/`
- Uilib:
  `https://www.uilib.co/`
- LayoutBlocks:
  `https://www.layoutblocks.dev/docs/introduction`
- Ruixen:
  `https://ruixen.com/`
- ReUI:
  `https://reui.io/`

## Files to Change

- `_docs/_WIDGETS/tmp/README.md`
- `_docs/_WIDGETS/tmp/hero/*.md`
- `_docs/_WIDGETS/tmp/timeline/*.md`
- `_docs/_WIDGETS/tmp/<widget>/*.md` for every Pages-publishable widget.
- `_docs/_WIDGETS/tmp/<widget>/SHORTFALL.md` only when fewer than ten credible
  references exist after documented search.
- `_docs/WIDGETS.md` only when the research model changes the source-of-truth
  widget configuration rules.

## Implementation Pseudocode

Use Markdown research cards rather than raw copied component source by default.

```md
# Source: Flowbite React Timeline - Horizontal

- URL: https://flowbite-react.com/docs/components/timeline
- Access type: docs-example
- License status: verify before copying source
- Widget family: timeline
- Pattern: horizontal chronological items with marker + connector + optional CTA
- Useful Coderso fields:
  - `mode: "axis"`
  - `layout.orientation: "horizontal"`
  - `steps[].date`
  - `steps[].cta`
- Copy policy: summarize only until license is verified.
```

Then build a matrix:

```md
| Pattern | Source | Decision | Coderso owner | Data model impact | Editor impact | Runtime impact |
|---|---|---|---|---|---|---|
| Hero badge split | shadcn/Tailwind references | Keep | hero | `badge` | Visual: Badge section | render badge above headline |
| Divider label | CMS/theme references | Reject | divider | none | none | research shows this is content, not divider behavior |
```

## Security Contract

- Visibility: docs/research only.
- Auth model: no runtime/admin endpoint.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable until research becomes code in
  later subtasks.
- Anti-abuse: do not store secrets, tokens, or proprietary paid source in docs.
- Licensing: copied third-party source is forbidden unless license allows it and
  the research file records source URL, license, and copy rationale.

## Testing Requirements

- Docs-only validation:
  - `git diff --check`
  - verify every research file has `URL`, `Access type`, `Decision`, and
    `Copy policy`.
  - verify every Pages-publishable widget has ten cards or a `SHORTFALL.md`.
- No Bun/Vitest suite is required until research is turned into code.

## Documentation Updates Required

- `_docs/_WIDGETS/tmp/README.md`
- `_docs/_TASKS/TASK-252*.md`
- `_docs/WIDGETS.md` only if the final research matrix changes widget IA rules.

## Acceptance Criteria

- Every Pages-publishable widget has at least ten documented research cards or
  a widget-local `SHORTFALL.md` with clearly justified exclusions.
- Every artifact records source URL and copy policy.
- Premium/proprietary examples are treated as design references only.
- Per-widget implementation leaves can cite concrete research patterns without
  copying unlicensed code.
- Final editor option lists are backed by `Keep`, `Adapt`, and `Reject`
  decisions rather than by assumptions from the current implementation.

## Completion Notes

- Created `_docs/_WIDGETS/tmp/README.md` and
  `_docs/_WIDGETS/tmp/SOURCE_POOLS.md`.
- Created research folders for all 38 Pages-publishable widgets.
- Added `README.md` and `MATRIX.md` for every widget folder.
- Captured 380 research cards in total: ten cards per widget.
- No `SHORTFALL.md` files were needed.
- Kept the archive summary-only and license-safe; premium/proprietary sources
  are reference-only.
- Validation:
  - `git diff --check`
  - folder/card/field/matrix coverage checks across `_docs/_WIDGETS/tmp/**`
