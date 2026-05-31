# Split Layout Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Two named slots from WordPress Media & Text and Columns. | Preserve `slots.left`/`slots.right` or equivalent content/media slot labels. |
| Keep | Media/content orientation and mobile stack order. | Expose `mediaPosition`, `reverse`, `mobileStack`, and `mobileOrder`. |
| Adapt | Ratio/span systems from MUI and Mantine. | Offer ratio presets such as `50/50`, `40/60`, `60/40`, with validation. |
| Adapt | Marketing split polish from Tailwind Plus, LayoutBlocks, and Flowbite. | Translate into Coderso presets for spacing, surface, and media aspect. |
| Reject | Resizable split-pane behavior from Chakra Splitter. | Page-builder structural widget should not introduce runtime resize handles by default. |
| Reject | Arbitrary pane CSS. | Keep beginner-friendly ratio and alignment controls. |

