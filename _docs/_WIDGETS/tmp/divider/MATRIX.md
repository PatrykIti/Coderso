# Divider Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Orientation, style variant, color/tone, and spacing from WordPress, Chakra, and Mantine. | Expose a compact Visual section with orientation, variant, tone, width/thickness, and spacing tokens; MUI/daisyUI label and style polish remain Adapt below. |
| Keep | Accessible/decorative separator distinction from Radix and React Aria. | Add `decorative`/semantic behavior and ensure renderer maps ARIA correctly. |
| Adapt | Optional labels from Mantine, MUI, and daisyUI. | Support a label only as an intentional variant, with clear copy and alignment controls. |
| Adapt | Theme/dark-mode conventions from Flowbite/Tailwind. | Map to Coderso theme tokens instead of raw classes. |
| Reject | Decorative flourish libraries or image separators. | Keep divider as a simple structural primitive. |
| Reject | Arbitrary border CSS editing. | Use tokenized variant and thickness controls. |
