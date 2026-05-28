# Sesja weryfikacji widgetow — 27-05-2026

## Cel

Zweryfikowac current state widgetow po TASK-339 przez `playwright-cli`, z clean smoke dla calej listy widgetow oraz focusowanymi replayami tam, gdzie smoke pokazal follow-up.

## Metoda

1. `coderso-dev-core-host` jako lokalny host dla admina i runtime.
2. Clean smoke: `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-smoke-2026-05-27-clean --admin http://localhost:5173/admin --front http://localhost:3000`.
3. Focused replay dla widgetow z `metadata-gap` i `fixture-gap`.
4. Historyczne raporty z `_docs/PLAYWRIGHT/23-05-2026-22-18/` pozostaja referencja dla starszego, szerszego kontekstu.

## Podsumowanie

- **Passed:** 31
- **Metadata gap:** 4
- **Fixture gap:** 3
- **Failed:** 0

## Najwazniejsze findingi

- Clean smoke nie odtworzyl zadnego admin/runtime functional failure na 38 widgetach.
- Cztery widgety maja follow-up w kontrakcie automatyzacyjnym Visual (`pricing-plans`, `faq-accordion`, `cta-banner`, `contact`) przez brak `data-widget-control-path` na czesci prawdziwych kontrolek.
- Trzy commerce fixtures (`product-gallery`, `product-compare`, `product-table`) renderuja poprawny empty state na froncie, ale nie dostarczaja populated data do pelnego replayu runtime.

## Raporty per widget

| Widget | Status | Admin | Public | Finding | Raport |
|---|---|---|---|---|---|
| `section` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_SECTION_WIDGET.md](./REPORT_SECTION_WIDGET.md) |
| `template-section` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_TEMPLATE_SECTION_WIDGET.md](./REPORT_TEMPLATE_SECTION_WIDGET.md) |
| `grid-columns` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_GRID_COLUMNS_WIDGET.md](./REPORT_GRID_COLUMNS_WIDGET.md) |
| `split-layout` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_SPLIT_LAYOUT_WIDGET.md](./REPORT_SPLIT_LAYOUT_WIDGET.md) |
| `tabs` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_TABS_WIDGET.md](./REPORT_TABS_WIDGET.md) |
| `accordion` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_ACCORDION_WIDGET.md](./REPORT_ACCORDION_WIDGET.md) |
| `toggle-block` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_TOGGLE_BLOCK_WIDGET.md](./REPORT_TOGGLE_BLOCK_WIDGET.md) |
| `spacer` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_SPACER_WIDGET.md](./REPORT_SPACER_WIDGET.md) |
| `divider` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_DIVIDER_WIDGET.md](./REPORT_DIVIDER_WIDGET.md) |
| `stack` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_STACK_WIDGET.md](./REPORT_STACK_WIDGET.md) |
| `hero` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_HERO_WIDGET.md](./REPORT_HERO_WIDGET.md) |
| `feature-grid` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_FEATURE_GRID_WIDGET.md](./REPORT_FEATURE_GRID_WIDGET.md) |
| `testimonials` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_TESTIMONIALS_WIDGET.md](./REPORT_TESTIMONIALS_WIDGET.md) |
| `pricing-plans` | Metadata gap | `metadata-gap` | `passed` | Automation metadata gap in Visual controls | [REPORT_PRICING_PLANS_WIDGET.md](./REPORT_PRICING_PLANS_WIDGET.md) |
| `faq-accordion` | Metadata gap | `metadata-gap` | `passed` | Automation metadata gap in Visual controls | [REPORT_FAQ_ACCORDION_WIDGET.md](./REPORT_FAQ_ACCORDION_WIDGET.md) |
| `cta-banner` | Metadata gap | `metadata-gap` | `passed` | Automation metadata gap in Visual controls | [REPORT_CTA_BANNER_WIDGET.md](./REPORT_CTA_BANNER_WIDGET.md) |
| `logo-cloud` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_LOGO_CLOUD_WIDGET.md](./REPORT_LOGO_CLOUD_WIDGET.md) |
| `gallery-mosaic` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_GALLERY_MOSAIC_WIDGET.md](./REPORT_GALLERY_MOSAIC_WIDGET.md) |
| `stats-kpi` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_STATS_KPI_WIDGET.md](./REPORT_STATS_KPI_WIDGET.md) |
| `team` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_TEAM_WIDGET.md](./REPORT_TEAM_WIDGET.md) |
| `rich-text-section` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_RICH_TEXT_SECTION_WIDGET.md](./REPORT_RICH_TEXT_SECTION_WIDGET.md) |
| `content-list` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_CONTENT_LIST_WIDGET.md](./REPORT_CONTENT_LIST_WIDGET.md) |
| `posts-feed` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_POSTS_FEED_WIDGET.md](./REPORT_POSTS_FEED_WIDGET.md) |
| `entry-teaser` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_ENTRY_TEASER_WIDGET.md](./REPORT_ENTRY_TEASER_WIDGET.md) |
| `product-gallery` | Fixture gap | `passed` | `fixture-gap` | Empty-state fixture only | [REPORT_PRODUCT_GALLERY_WIDGET.md](./REPORT_PRODUCT_GALLERY_WIDGET.md) |
| `product-compare` | Fixture gap | `passed` | `fixture-gap` | Empty-state fixture only | [REPORT_PRODUCT_COMPARE_WIDGET.md](./REPORT_PRODUCT_COMPARE_WIDGET.md) |
| `product-table` | Fixture gap | `passed` | `fixture-gap` | Empty-state fixture only | [REPORT_PRODUCT_TABLE_WIDGET.md](./REPORT_PRODUCT_TABLE_WIDGET.md) |
| `listing-filters` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_LISTING_FILTERS_WIDGET.md](./REPORT_LISTING_FILTERS_WIDGET.md) |
| `search-box` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_SEARCH_BOX_WIDGET.md](./REPORT_SEARCH_BOX_WIDGET.md) |
| `timeline` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_TIMELINE_WIDGET.md](./REPORT_TIMELINE_WIDGET.md) |
| `compare-timeline` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_COMPARE_TIMELINE_WIDGET.md](./REPORT_COMPARE_TIMELINE_WIDGET.md) |
| `newsletter` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_NEWSLETTER_WIDGET.md](./REPORT_NEWSLETTER_WIDGET.md) |
| `booking-calendar` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_BOOKING_CALENDAR_WIDGET.md](./REPORT_BOOKING_CALENDAR_WIDGET.md) |
| `appointment-form` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_APPOINTMENT_FORM_WIDGET.md](./REPORT_APPOINTMENT_FORM_WIDGET.md) |
| `form-embed` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_FORM_EMBED_WIDGET.md](./REPORT_FORM_EMBED_WIDGET.md) |
| `contact` | Metadata gap | `metadata-gap` | `passed` | Automation metadata gap in Visual controls | [REPORT_CONTACT_WIDGET.md](./REPORT_CONTACT_WIDGET.md) |
| `navigation` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_NAVIGATION_WIDGET.md](./REPORT_NAVIGATION_WIDGET.md) |
| `footer` | Passed | `passed` | `passed` | No regression reproduced in clean smoke | [REPORT_FOOTER_WIDGET.md](./REPORT_FOOTER_WIDGET.md) |
