# Spacer Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Dedicated vertical spacer from WordPress and Mantine Space. | Keep spacer intentionally small: size token, optional custom height, and responsive override. |
| Keep | Clear editor label/outline for an otherwise invisible block. | Add strong inspector label and canvas affordance so authors can select it. |
| Adapt | Tokenized spacing from MUI/Tailwind and section rhythm from LayoutBlocks/Flowbite. | Prefer named spacing presets over arbitrary pixel-first controls. |
| Adapt | Shared spacing support from WordPress block supports. | Align with global spacing tokens where available. |
| Reject | Flex filler spacer from Chakra as default. | Avoid context-sensitive behavior that only works inside flex containers. |
| Reject | Full margin/padding style manager from GrapesJS. | Keep advanced CSS controls out of simple spacer editing. |

