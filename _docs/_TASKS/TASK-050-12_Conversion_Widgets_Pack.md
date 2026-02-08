# TASK-050-12: Conversion Widgets Pack
# FileName: TASK-050-12_Conversion_Widgets_Pack.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-11  
**Status:** In Progress (2026-02-08)

---

## Overview

Section 1 of widget expansion for building high-converting pages.
This pack delivers conversion-focused blocks used on landing pages and
product pages.

Order inside section:
1) Feature Grid
2) Testimonials
3) Pricing Plans
4) FAQ Accordion
5) CTA Banner

---

## Sub-Tasks

- **TASK-050-12-01:** Feature Grid Widget
- **TASK-050-12-02:** Testimonials Widget
- **TASK-050-12-03:** Pricing Plans Widget
- **TASK-050-12-04:** FAQ Accordion Widget
- **TASK-050-12-05:** CTA Banner Widget

---

## Shared UX Rules

- Every widget follows Wizard -> Visual -> Advanced contract.
- Visual mode is primary editing surface.
- Advanced mode is technical-only and avoids duplicate content controls.
- Use select/toggle/picker-first UX (avoid raw text parsing where possible).
- Keep runtime output deterministic and snapshot-testable.

---

## Testing Requirements

- Unit tests per widget for schema/defaults/renderer variants.
- UI tests per widget for Wizard/Visual/Advanced coverage.
- VisualPanel tests where widget owns variant selection.

---

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/_WIDGETS/PRICING.md`
- `_docs/_WIDGETS/FAQ.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/WIDGETS.md` (index update)
