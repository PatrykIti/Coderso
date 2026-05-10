# Accordion Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Repeatable items with trigger/title and panel content. | Model `items[]` with stable ids, title, optional summary metadata, and panel content/slot. |
| Keep | Single vs multiple open and default open item(s). | Add `openMode`, `defaultOpenIds`, and `collapsible` validation. |
| Keep | Accessibility behavior from Radix, MUI, Chakra, and React Aria. | Renderer must preserve button/region relationships and heading-level strategy. |
| Adapt | Visual variants from shadcn, Mantine, Flowbite, daisyUI, and Tailwind Plus. | Map to Coderso `variant`, `surface`, `iconStyle`, and spacing presets. |
| Adapt | Native details pattern from WordPress. | Use as progressive-enhancement fallback inspiration, not a copied contract. |
| Reject | Checkbox/radio hacks as the product contract. | Keep state explicit in schema and renderer. |
| Reject | Nested accordion by default. | Only allow nesting through normal child content if validated and accessible. |

