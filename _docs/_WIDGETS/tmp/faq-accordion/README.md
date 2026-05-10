# FAQ Accordion Research Cards

Summary-only archive for TASK-252. Do not copy third-party code from these sources.

## Card 1 - HyperUI FAQ
- URL: https://www.hyperui.dev/components/marketing/faqs
- Access type: open-source
- License/terms summary: HyperUI is generally MIT-style; verify before reuse.
- Observed UX pattern: simple FAQ list using expandable question/answer rows.
- Useful Coderso fields/options: `items[].question`, `items[].answer`, `defaultOpen`, `allowMultiple`.
- Decision: Keep
- Copy policy: Summarize only.

## Card 2 - Preline accordion
- URL: https://preline.co/docs/accordion.html
- Access type: docs-example
- License/terms summary: Verify Preline terms before reuse.
- Observed UX pattern: accessible accordion states and grouped sections.
- Useful Coderso fields/options: `accordionMode`, `iconPosition`, `groupLabel`.
- Decision: Keep
- Copy policy: Pattern only.

## Card 3 - Flowbite accordion
- URL: https://flowbite.com/docs/components/accordion/
- Access type: docs-example
- License/terms summary: Flowbite docs are public; verify license before copying.
- Observed UX pattern: collapse panels with active/inactive styling.
- Useful Coderso fields/options: `style.border`, `openIcon`, `closedIcon`, existing item style tokens.
- Decision: Keep
- Copy policy: No source copy.

## Card 4 - Flowbite React accordion
- URL: https://flowbite-react.com/docs/components/accordion
- Access type: docs-example
- License/terms summary: Flowbite React is open-source; examples remain reference material.
- Observed UX pattern: componentized accordion with collapse-all behavior.
- Useful Coderso fields/options: `collapseAll`, `alwaysOpen`, `flush`.
- Decision: Adapt
- Copy policy: Use concept only.

## Card 5 - shadcn/ui accordion
- URL: https://ui.shadcn.com/docs/components/accordion
- Access type: docs-example
- License/terms summary: shadcn/ui source is permissive, but Coderso should keep its own implementation.
- Observed UX pattern: single or multiple item accordion with controlled state.
- Useful Coderso fields/options: `type: single|multiple`, `collapsible`, `defaultValue`.
- Decision: Keep
- Copy policy: Summarize behavior only.

## Card 6 - Tailwind UI Plus FAQ sections
- URL: https://tailwindcss.com/plus/ui-blocks/marketing/sections/faqs
- Access type: premium-reference
- License/terms summary: Paid/proprietary; reference-only.
- Observed UX pattern: category columns, centered lists, and support CTA.
- Useful Coderso fields/options: `categories`, `supportCta`, `layout`.
- Decision: Adapt
- Copy policy: Reference-only.

## Card 7 - MUI accordion
- URL: https://mui.com/material-ui/react-accordion/
- Access type: docs-example
- License/terms summary: MUI is open-source; no dependency should be added.
- Observed UX pattern: controlled expansion, disabled items, and accessible summary/details.
- Useful Coderso fields/options: `disabled`, `controlledDefault`, `summaryLevel`.
- Decision: Adapt
- Copy policy: Summarize interaction only.

## Card 8 - Chakra UI accordion
- URL: https://chakra-ui.com/docs/components/accordion
- Access type: docs-example
- License/terms summary: Chakra UI is open-source; examples are reference only.
- Observed UX pattern: item trigger/content structure with optional icons.
- Useful Coderso fields/options: `triggerIcon`, `variant`, `size`.
- Decision: Adapt
- Copy policy: Do not copy source.

## Card 9 - Origin UI FAQ/accordion patterns
- URL: https://originui.com/
- Access type: docs-example
- License/terms summary: Verify site terms before reuse.
- Observed UX pattern: compact FAQ rows with category headings and search-adjacent layout.
- Useful Coderso fields/options: `category`, `style.spacing`, `showSearch`.
- Decision: Adapt
- Copy policy: Pattern summary only.

## Card 10 - ReUI FAQ blocks
- URL: https://reui.io/
- Access type: docs-example
- License/terms summary: Verify ReUI terms before reuse.
- Observed UX pattern: SaaS FAQ with contact/support CTA below the accordion.
- Useful Coderso fields/options: `supportCta`, `supportText`, `layout`.
- Decision: Keep
- Copy policy: Summarize only.
