# Split Layout Research Cards

Copy policy for this archive: summarize split-layout behavior and schema implications only. Do not copy third-party source, markup, class lists, prose, screenshots, or premium implementation details into Coderso.

| # | Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|---|
| 1 | WordPress Media & Text block | https://wordpress.org/documentation/article/media-text-block/ | docs-example | WordPress/Gutenberg code is GPL; docs summarized only. | Two-pane media/content layout with reverse stack on mobile. | `mediaSlot`, `contentSlot`, `mediaPosition`, `mobileStack`. | Keep | Summarize behavior only. |
| 2 | WordPress Columns block | https://wordpress.org/documentation/article/columns-block/ | docs-example | GPL ecosystem; docs examples summarized only. | Manual two-column layout with adjustable content. | `ratio`, `gap`, `slots.left`, `slots.right`. | Keep | Summarize behavior. |
| 3 | Chakra Flex | https://chakra-ui.com/docs/components/flex | open-source | Chakra UI is MIT; docs examples summarized only. | Flex row/column composition with alignment controls. | `direction`, `align`, `justify`, `gap`, `wrap`. | Adapt | Summarize options only. |
| 4 | Chakra Splitter | https://chakra-ui.com/docs/components/splitter | open-source | MIT library; docs examples summarized only. | Resizable panels with handle and orientation. | `resizable`, `minPaneSize`, `orientation`. | Reject | Summarize only; too app-like for page widget default. |
| 5 | Mantine Grid | https://mantine.dev/core/grid/ | open-source | Mantine is MIT; docs examples summarized only. | Responsive spans create two-pane ratios. | `leftSpan`, `rightSpan`, `breakpointCollapse`. | Adapt | Summarize behavior. |
| 6 | MUI Grid | https://mui.com/material-ui/react-grid/ | open-source | MUI Core is MIT; docs examples summarized only. | 12-column split ratios and spacing. | `ratioPreset`, `spacing`, `orderMobile`. | Adapt | Summarize options. |
| 7 | Tailwind Plus feature sections | https://tailwindcss.com/plus/ui-blocks/marketing/sections/feature-sections | premium-reference | Paid Tailwind Plus terms; reference-only. | Marketing split sections with media side, copy side, and alternation. | `variant`, `mediaPosition`, `copyWidth`, `visualBalance`. | Adapt | Visual/UX summary only. |
| 8 | LayoutBlocks content/CTA blocks | https://www.layoutblocks.dev/docs/introduction | unknown-license | Site states free/open copy-paste blocks; no license file verified here. | Payload blocks often use split content and media panels. | `preset`, `mediaAspect`, `ctaSlot`, `sectionSpacing`. | Adapt | Reference only; no code copy. |
| 9 | Flowbite feature sections | https://flowbite.com/blocks/marketing/feature/ | premium-reference | Flowbite Blocks may include pro/EULA content; open examples require separate checking. | Alternating image/text sections with responsive stack. | `imageSide`, `stackOrder`, `surface`, `actionsSlot`. | Adapt | Summarize only. |
| 10 | daisyUI hero | https://daisyui.com/components/hero/ | open-source | daisyUI is open-source; verify exact license before reuse. | Hero split composition with media and text. | `alignment`, `mediaPosition`, `contentAlignment`. | Adapt | Summarize behavior only. |

