# Timeline Research Cards

Summary-only archive for TASK-252. Do not copy third-party code from these sources.

## Card 1 - Flowbite vertical timeline
- URL: https://flowbite.com/docs/components/timeline/
- Access type: docs-example
- License/terms summary: Flowbite docs are public; confirm license before copying source.
- Observed UX pattern: vertical axis with dated entries, icon markers, and optional CTA.
- Useful Coderso fields/options: `orientation: vertical`, `items[].date`, `items[].icon`, `items[].cta`, `connectorStyle`.
- Decision: Keep
- Copy policy: Summarize only; implement original markup.

## Card 2 - Flowbite React timeline
- URL: https://flowbite-react.com/docs/components/timeline
- Access type: docs-example
- License/terms summary: Flowbite React is open-source, but examples should still be attributed and not copied into docs.
- Observed UX pattern: componentized timeline items with content slots and themeable markers.
- Useful Coderso fields/options: `markerTone`, `itemSpacing`, `contentDensity`.
- Decision: Adapt
- Copy policy: Reference structure only.

## Card 3 - MUI Lab timeline
- URL: https://mui.com/material-ui/react-timeline/
- Access type: docs-example
- License/terms summary: MUI docs and package use open-source licensing, but Coderso should not import MUI for this widget.
- Observed UX pattern: alternating timeline, opposite content, dots, connectors, separators.
- Useful Coderso fields/options: `mode: alternating`, `oppositeContent`, `markerVariant`, `connector`.
- Decision: Keep
- Copy policy: Summarize pattern; no dependency or source copy.

## Card 4 - Chakra UI timeline
- URL: https://chakra-ui.com/docs/components/timeline
- Access type: docs-example
- License/terms summary: Chakra UI is open-source; documentation examples remain reference material.
- Observed UX pattern: root/item/content API with title, description, and icon/indicator.
- Useful Coderso fields/options: `items[].title`, `items[].description`, `items[].indicator`, `tone`.
- Decision: Keep
- Copy policy: Use concept only.

## Card 5 - Aceternity timeline
- URL: https://ui.aceternity.com/components/timeline
- Access type: docs-example
- License/terms summary: Component terms must be verified before reuse.
- Observed UX pattern: long-form narrative timeline with sticky/scroll visual emphasis.
- Useful Coderso fields/options: `motionPreset`, `stickyYear`, `richContent`, `reducedMotionFallback`.
- Decision: Adapt
- Copy policy: Do not copy animation code.

## Card 6 - shadcn.io hero timeline
- URL: https://www.shadcn.io/blocks/hero-timeline
- Access type: docs-example
- License/terms summary: Verify block-specific terms before reuse.
- Observed UX pattern: timeline used as a trust/progress proof beside hero content.
- Useful Coderso fields/options: `compactMode`, `highlightCurrent`, `intro`.
- Decision: Adapt
- Copy policy: Summarize only.

## Card 7 - Tailwind UI Plus timeline/activity references
- URL: https://tailwindcss.com/plus/ui-blocks/application-ui/lists/feeds
- Access type: premium-reference
- License/terms summary: Paid/proprietary; reference-only.
- Observed UX pattern: activity feed with avatars, icons, timestamps, and grouped events.
- Useful Coderso fields/options: `feedMode`, `avatar`, `timestamp`, `eventType`.
- Decision: Adapt
- Copy policy: Reference-only; no code or text.

## Card 8 - Preline timeline examples
- URL: https://preline.co/docs/timeline.html
- Access type: docs-example
- License/terms summary: Preline terms must be checked before reuse.
- Observed UX pattern: vertical timeline with responsive start/end alignment.
- Useful Coderso fields/options: `alignment`, `responsiveCollapse`, `connectorTone`.
- Decision: Keep
- Copy policy: Summary only.

## Card 9 - Origin UI timeline/activity patterns
- URL: https://originui.com/
- Access type: docs-example
- License/terms summary: Site terms need verification before reuse.
- Observed UX pattern: compact activity/timeline blocks with status-driven icons.
- Useful Coderso fields/options: `status`, `markerIcon`, `compactDensity`.
- Decision: Adapt
- Copy policy: Do not copy source.

## Card 10 - ReUI timeline/activity references
- URL: https://reui.io/
- Access type: docs-example
- License/terms summary: Verify ReUI terms before any copying.
- Observed UX pattern: timeline/list hybrids for release notes, onboarding, and process steps.
- Useful Coderso fields/options: `purposePreset`, `stepState`, `itemCta`.
- Decision: Adapt
- Copy policy: Pattern-only summary.
