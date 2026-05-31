# Stack Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Direction, gap, alignment, and justification from Chakra, Mantine, MUI, and WordPress. | Expose these as primary stack Visual controls with tokenized values. |
| Keep | Responsive direction. | Allow mobile/desktop orientation where schema can validate it cleanly. |
| Adapt | Wrap/group behavior from Chakra Wrap and Mantine Group. | Add wrap only as an explicit mode, not hidden default behavior. |
| Adapt | Optional separators/dividers from Chakra/MUI/Tailwind Plus. | Add `separator` only if it maps to the shared divider contract. |
| Adapt | Joined item style from daisyUI/Flowbite. | Keep as a visual preset, not a separate widget type. |
| Reject | Overloaded stack as list, nav, form, and layout all at once. | Keep stack as a structural flow primitive with clear child slots. |

