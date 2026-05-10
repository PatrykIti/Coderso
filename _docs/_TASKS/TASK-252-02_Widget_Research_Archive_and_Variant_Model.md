# TASK-252-02: Widget Research Archive and Variant Model

# FileName: TASK-252-02_Widget_Research_Archive_and_Variant_Model.md

**Priority:** High
**Category:** Widgets + Product Research + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-252
**Status:** To Do

---

## Overview

Create a license-safe research archive for proven React/Tailwind widget and
block patterns, then translate the findings into a Coderso-owned variant/mode
matrix.

The user request is to inspect real widget/block libraries and collect multiple
versions of widgets such as Hero and Timeline before expanding our editors.
This task makes that workflow explicit and safe: research artifacts can be
stored under `_docs/_WIDGETS/tmp/**`, but third-party code may only be copied
when the license permits it and the license/source are recorded.

## Business Requirements

- Create a research archive structure:
  - `_docs/_WIDGETS/tmp/README.md`
  - `_docs/_WIDGETS/tmp/hero/`
  - `_docs/_WIDGETS/tmp/timeline/`
  - additional per-widget folders only when a later umbrella needs them.
- Each captured pattern must record:
  - title/name;
  - source URL;
  - access type: `open-source`, `docs-example`, `premium-reference`,
    `unknown-license`;
  - license or terms summary when available;
  - observed UX pattern;
  - Coderso mapping decision;
  - whether source code can be copied, summarized only, or ignored.
- Gather at least ten Hero patterns and ten Timeline patterns before the Hero
  and Timeline implementation leaves are finalized.
- For other widget families, gather enough examples to define flexible editor
  modes without delaying the whole program:
  - layout/structural;
  - content/marketing;
  - dynamic/operational.
- Translate research into Coderso-owned models:
  - do not create ten separate widget types for ten examples;
  - add variants, presets, display modes, and editor sections only when they
    fit our existing schema-first widget contract.

## Sub-Tasks

- [ ] Create `_docs/_WIDGETS/tmp/README.md` with archive rules and copy policy.
- [ ] Capture at least ten Hero research cards or justified exclusions.
- [ ] Capture at least ten Timeline research cards or justified exclusions.
- [ ] Capture representative patterns for layout, marketing/content, and
  dynamic/operational widget families.
- [ ] Produce a matrix that maps research patterns to Coderso-owned widget
  fields, modes, editor sections, and tests.
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
- `_docs/_WIDGETS/tmp/<widget>/*.md` as needed by later subtasks.
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
| Pattern | Source | Coderso owner | Data model impact | Editor impact | Runtime impact |
|---|---|---|---|---|---|
| Hero badge split | shadcn/Tailwind references | hero | `badge` | Visual: Badge section | render badge above headline |
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
  - verify every research file has `URL`, `Access type`, and `Copy policy`.
- No Bun/Vitest suite is required until research is turned into code.

## Documentation Updates Required

- `_docs/_WIDGETS/tmp/README.md`
- `_docs/_TASKS/TASK-252*.md`
- `_docs/WIDGETS.md` only if the final research matrix changes widget IA rules.

## Acceptance Criteria

- Hero and Timeline each have at least ten documented research cards or clearly
  justified exclusions.
- Every artifact records source URL and copy policy.
- Premium/proprietary examples are treated as design references only.
- Per-widget implementation leaves can cite concrete research patterns without
  copying unlicensed code.
