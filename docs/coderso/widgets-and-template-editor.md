---
title: "Coderso Widgets and Template Editor"
audience: "editor"
productArea: "coderso-widgets"
language: "en"
keywords:
  - widgets
  - templates
  - widget library
  - template editor
---

# Basic

Widgets and Template Editor are reusable presentation surfaces for sections and
templates. Use them when you want consistent visual blocks across multiple
pages or screens instead of editing each page manually.

# Medium

Widgets and templates define presentation-layer structure, not business data.
They work best when content models already exist and the remaining work is UI
composition, styling, and reusable layout patterns.

Use this surface when:
- you need one visual composition reused in many places,
- you want versioned template changes with preview before rollout,
- you need widget-level visual tuning (for example Hero colors and spacing).

# Instruction

1. Open the Widget Library and select the block or pattern you want to reuse.
2. Create a template or edit an existing one that should be reused across pages
   or screens.
3. For Hero-specific styling, open the page or template containing Hero, select
   the Hero block, and use the Visual tab to configure colors, spacing, and
   background.
4. Preview and review revisions before publishing wider changes.
5. Apply the template in target pages, custom screens, or kit assets.

# Advanced

- Build a base template and branch localized variants instead of cloning full
  pages for every campaign.
- Keep design tokens and template variants aligned to avoid drift between
  screens and pages.
- Prefer narrow, purpose-driven templates (Hero + CTA) over one oversized
  template that tries to cover all scenarios.

# Troubleshooting

- If a style change does not appear at runtime, verify you edited the correct
  template variant and published the change.
- If Hero colors look inconsistent, check whether page-level overrides are
  still active.
- If a template is hard to reuse, split large multi-purpose blocks into smaller
  focused template fragments.

# Decision Guide

- Choose template editing when the same composition should be reused in multiple
  places.
- Choose one-off page editing when the change is truly page-specific.
- Choose a dedicated screen-safe widget pattern when the workflow belongs to an
  internal custom screen.

# Checklist

1. Template selected or created for the target use case.
2. Visual settings verified on the correct widget instance (for Hero: Visual
   tab colors/spacing/background).
3. Preview reviewed for desktop and mobile.
4. Revision intent documented before rollout.
5. Template applied to all intended surfaces.

# Security

- Do not put secrets, provider keys, or internal tokens inside widget content.
- Treat templates as presentation only; keep privileged logic and settings on
  backend/internal surfaces.
