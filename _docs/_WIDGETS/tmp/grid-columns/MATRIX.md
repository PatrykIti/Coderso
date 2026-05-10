# Grid Columns Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Column count, gap, and responsive stacking from WordPress, Chakra, and Mantine. | Expose user-facing `columns`, gap, row gap, and mobile behavior controls mapped to live `layout.gapX`, `layout.gapY`, and `columns[].mobileSpan`; MUI span/offset behavior remains Adapt below. |
| Keep | Child slot per column. | Preserve existing slot/children compatibility and label each column clearly. |
| Adapt | 12-column span/offset systems from MUI/Mantine. | Offer simple column width presets before exposing advanced per-column spans. |
| Adapt | Min-child-width auto-fit from Chakra. | Consider a responsive `autoFitMinWidth` mode if it fits schema-first validation. |
| Adapt | Card grid density from Tailwind Plus/Flowbite. | Translate into Coderso-owned density presets, not copied classes. |
| Reject | Arbitrary CSS grid template editing in beginner mode. | Keep advanced layout strings out of the default editor. |
| Reject | Palette-only grid insertion as the runtime contract. | Palette presets may seed data, but schema remains stable. |
