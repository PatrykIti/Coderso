# Accordion Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Repeatable items with trigger/title and panel content. | Model `items[]` with stable ids, title, optional summary metadata, and panel content/slot. |
| Keep | Single vs multiple open and default open item(s). | Add `openMode`, `defaultOpenIds`, and `collapsible` validation. |
| Keep | Accessibility behavior from Radix, MUI, and Chakra. | Renderer must preserve button/region relationships and heading-level strategy; React Aria Disclosure remains Adapt reference material. |
| Adapt | Visual variants from shadcn, Mantine, Flowbite, daisyUI, and Tailwind Plus. | Map only to existing Coderso-owned variant, style, icon, and spacing tokens; new visual style fields require a separate owner. |
| Adapt | Native details pattern from WordPress. | Use as progressive-enhancement fallback inspiration, not a copied contract. |
| Reject | Checkbox/radio hacks as the product contract. | Keep state explicit in schema and renderer. |
| Reject | Nested accordion by default. | Only allow nesting through normal child content if validated and accessible. |
