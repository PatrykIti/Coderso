# Stats KPI Research Cards

Summary-only archive for TASK-252. Do not copy third-party code from these sources.

## Card 1 - HyperUI stats
- URL: https://www.hyperui.dev/components/marketing/stats
- Access type: open-source
- License/terms summary: HyperUI is generally MIT-style; verify before reuse.
- Observed UX pattern: KPI grid with value, label, and short description.
- Useful Coderso fields/options: `items[].value`, `items[].label`, `items[].description`, existing `variant`.
- Decision: Keep
- Copy policy: Summarize only.

## Card 2 - Preline stats
- URL: https://preline.co/examples/stats.html
- Access type: docs-example
- License/terms summary: Verify Preline terms before reuse.
- Observed UX pattern: stat cards with icons and supporting copy.
- Useful Coderso fields/options: `items[].icon`, `cardStyle`, `alignment`, `tone`.
- Decision: Keep
- Copy policy: Pattern only.

## Card 3 - Flowbite stats blocks
- URL: https://flowbite.com/blocks/marketing/stats/
- Access type: docs-example
- License/terms summary: Flowbite block terms vary; reference-only until confirmed.
- Observed UX pattern: marketing stat sections with large numbers and labels.
- Useful Coderso fields/options: `numberSize`, `label`, `sectionIntro`, existing `variant`.
- Decision: Keep
- Copy policy: No source copy.

## Card 4 - Tailwind UI Plus stats
- URL: https://tailwindcss.com/plus/ui-blocks/marketing/sections/stats-sections
- Access type: premium-reference
- License/terms summary: Paid/proprietary; reference-only.
- Observed UX pattern: stats in cards, bands, or beside copy/media.
- Useful Coderso fields/options: `mode: grid|strip|split`, `media`, `backgroundTone`.
- Decision: Adapt
- Copy policy: Reference-only.

## Card 5 - shadcn.io blocks
- URL: https://www.shadcn.io/blocks
- Access type: docs-example
- License/terms summary: Verify block terms before reuse.
- Observed UX pattern: compact stat cards using consistent typography and muted descriptions.
- Useful Coderso fields/options: `cardVariant`, `style.spacing`, `description`.
- Decision: Keep
- Copy policy: Summary only.

## Card 6 - Origin UI stat cards
- URL: https://originui.com/
- Access type: docs-example
- License/terms summary: Verify site terms before reuse.
- Observed UX pattern: dashboard-like KPI cards with trend labels.
- Useful Coderso fields/options: `trendLabel`, `trendDirection`, `icon`.
- Decision: Adapt
- Copy policy: Pattern summary only.

## Card 7 - ReUI KPI examples
- URL: https://reui.io/
- Access type: docs-example
- License/terms summary: Verify ReUI terms before reuse.
- Observed UX pattern: SaaS KPI cards with prefix/suffix and trend metadata.
- Useful Coderso fields/options: `prefix`, `suffix`, `trend`, `caption`.
- Decision: Keep
- Copy policy: Summarize only.

## Card 8 - Uilib stats references
- URL: https://www.uilib.co/
- Access type: unknown-license
- License/terms summary: License not confirmed; reference only.
- Observed UX pattern: statistic strips and card grids with icons.
- Useful Coderso fields/options: `variant`, `icon`, `cardTone`.
- Decision: Adapt
- Copy policy: No copying until terms are verified.

## Card 9 - MUI card reference
- URL: https://mui.com/material-ui/react-card/
- Access type: docs-example
- License/terms summary: MUI is open-source; no dependency should be added.
- Observed UX pattern: structured card with header/content/actions that can guide KPI spacing.
- Useful Coderso fields/options: `style.spacing`, `header`, `footerMeta`.
- Decision: Adapt
- Copy policy: Summarize interaction/layout only.

## Card 10 - Tailwind Typography numeric/prose rhythm
- URL: https://github.com/tailwindlabs/tailwindcss-typography
- Access type: open-source
- License/terms summary: Open-source plugin; use as typography reference only.
- Observed UX pattern: controlled supporting text around prominent values.
- Useful Coderso fields/options: `descriptionSize`, `valueScale`, `bodyPreset`.
- Decision: Adapt
- Copy policy: Design rationale only.
