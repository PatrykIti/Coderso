# Tabs Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Items with trigger and panel content from Radix, Chakra, Mantine, MUI, and React Aria. | Model tabs as repeatable `items[]` with stable ids, labels, optional icons, and panel slots/content. |
| Keep | Default active tab and keyboard semantics. | Add `defaultItemId`; renderer must preserve tablist/tab/panel relationships. |
| Keep | Horizontal/vertical orientation. | Expose orientation as a Visual control with responsive fallback. |
| Adapt | Activation mode, lazy mount, scrollable tabs, and overflow. | Consider Advanced controls only where runtime can preserve accessibility. |
| Adapt | Visual variants from shadcn, Flowbite, daisyUI, and Tailwind Plus. | Map to Coderso-owned `variant`, `density`, `panelSurface`, and optional badges/icons. |
| Reject | Pattern-only pseudo-tabs. | Use a real accessible tabs contract, not static grouped links. |
| Reject | Arbitrary copied tab markup. | Implementation must be Coderso-authored and schema-first. |

