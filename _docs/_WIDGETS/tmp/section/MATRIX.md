# Section Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Nested region/slot model from WordPress Group and Payload Blocks. | Add a named `Regions` or `Slots` editor section for `slots.default` and any repeatable regions. |
| Keep | Container width and gutter controls from Chakra, Mantine, and MUI. | Keep constrained `containerWidth`, `maxWidth`, and padding presets in Visual controls. |
| Keep | Semantic wrapper and anchor controls. | Preserve `as`/semantic intent, `id`/anchor, and accessible landmark guidance. |
| Adapt | Cover/hero-like background media from WordPress Cover. | Support surface/media options only when already compatible with section surface contracts. |
| Adapt | Template/preset insertion from GrapesJS and LayoutBlocks. | Expose preset metadata in library/editor cards, not as separate runtime widget types. |
| Adapt | Tailwind Plus dense layout polish. | Translate into Coderso-owned spacing, width, and responsive presets. |
| Reject | Copying full third-party section markup or class recipes. | Keep archive as summarized research; implementation must be Coderso-authored. |
| Reject | Expert-only controls for every CSS property. | Keep the editor beginner-friendly with grouped, named options. |

