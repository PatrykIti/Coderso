# Widget Contract Smoke Results

- **Generated:** 2026-05-31T19:47:05.542Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000
- **Playwright session:** codex-31-05-widgets-smoke

## Run Health

- Playwright CLI: available
- Admin reachable: yes
- Frontend reachable: yes
- Admin auth: authenticated

## Summary

- Admin failures: 0
- Public failures: 38
- Fixture gaps: 38
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `section` | fixture-gap | - | - | admin_fixture_not_found |
| `template-section` | fixture-gap | - | - | admin_fixture_not_found |
| `grid-columns` | fixture-gap | - | - | admin_fixture_not_found |
| `split-layout` | fixture-gap | - | - | admin_fixture_not_found |
| `tabs` | fixture-gap | - | - | admin_fixture_not_found |
| `accordion` | fixture-gap | - | - | admin_fixture_not_found |
| `toggle-block` | fixture-gap | - | - | admin_fixture_not_found |
| `spacer` | fixture-gap | - | - | admin_fixture_not_found |
| `divider` | fixture-gap | - | - | admin_fixture_not_found |
| `stack` | fixture-gap | - | - | admin_fixture_not_found |
| `hero` | fixture-gap | - | - | admin_fixture_not_found |
| `feature-grid` | fixture-gap | - | - | admin_fixture_not_found |
| `testimonials` | fixture-gap | - | - | admin_fixture_not_found |
| `pricing-plans` | fixture-gap | - | - | admin_fixture_not_found |
| `faq-accordion` | fixture-gap | - | - | admin_fixture_not_found |
| `cta-banner` | fixture-gap | - | - | admin_fixture_not_found |
| `logo-cloud` | fixture-gap | - | - | admin_fixture_not_found |
| `gallery-mosaic` | fixture-gap | - | - | admin_fixture_not_found |
| `stats-kpi` | fixture-gap | - | - | admin_fixture_not_found |
| `team` | fixture-gap | - | - | admin_fixture_not_found |
| `rich-text-section` | fixture-gap | - | - | admin_fixture_not_found |
| `content-list` | fixture-gap | - | - | admin_fixture_not_found |
| `posts-feed` | fixture-gap | - | - | admin_fixture_not_found |
| `entry-teaser` | fixture-gap | - | - | admin_fixture_not_found |
| `product-gallery` | fixture-gap | - | - | admin_fixture_not_found |
| `product-compare` | fixture-gap | - | - | admin_fixture_not_found |
| `product-table` | fixture-gap | - | - | admin_fixture_not_found |
| `listing-filters` | fixture-gap | - | - | admin_fixture_not_found |
| `search-box` | fixture-gap | - | - | admin_fixture_not_found |
| `timeline` | fixture-gap | - | - | admin_fixture_not_found |
| `compare-timeline` | fixture-gap | - | - | admin_fixture_not_found |
| `newsletter` | fixture-gap | - | - | admin_fixture_not_found |
| `booking-calendar` | fixture-gap | - | - | admin_fixture_not_found |
| `appointment-form` | fixture-gap | - | - | admin_fixture_not_found |
| `form-embed` | fixture-gap | - | - | admin_fixture_not_found |
| `contact` | fixture-gap | - | - | admin_fixture_not_found |
| `navigation` | fixture-gap | - | - | admin_fixture_not_found |
| `footer` | fixture-gap | - | - | admin_fixture_not_found |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `section` | failed | /section-widget-test | 404 | no | public_http_failed |
| `template-section` | failed | /ctr-template-section-2305 | 404 | no | public_http_failed |
| `grid-columns` | failed | /test-grid-columns-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-grid-columns.png |
| `split-layout` | failed | /test-split-layout-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-split-layout.png |
| `tabs` | failed | /test-tabs-0516 | 404 | no | public_http_failed |
| `accordion` | failed | /test-accordion-0516 | 404 | no | public_http_failed |
| `toggle-block` | failed | /test-toggle-block-0516 | 404 | no | public_http_failed |
| `spacer` | failed | /test-spacer-0516 | 404 | no | public_http_failed |
| `divider` | failed | /test-divider-0516 | 404 | no | public_http_failed |
| `stack` | failed | /test-stack-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-stack.png |
| `hero` | failed | /homepage | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png |
| `feature-grid` | failed | /featuregridtest | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-feature-grid.png |
| `testimonials` | failed | /test-testimonials-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-testimonials.png |
| `pricing-plans` | failed | /test-pricing-plans-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-pricing-plans.png |
| `faq-accordion` | failed | /test-faq-accordion-0516 | 404 | no | public_http_failed |
| `cta-banner` | failed | /test-cta-banner-0516 | 404 | no | public_http_failed |
| `logo-cloud` | failed | /test-logo-cloud-0516 | 404 | no | public_http_failed |
| `gallery-mosaic` | failed | /gallery-mosaic-test-0516 | 404 | no | public_http_failed |
| `stats-kpi` | failed | /stats-kpi-audit-0516 | 404 | no | public_http_failed |
| `team` | failed | /test-team-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-team.png |
| `rich-text-section` | failed | /richtextsectiontest | 404 | no | public_http_failed |
| `content-list` | failed | /test-content-list-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-content-list.png |
| `posts-feed` | failed | /posts-feed-test-page | 404 | no | public_http_failed |
| `entry-teaser` | failed | /test-entry-teaser-0516 | 404 | no | public_http_failed |
| `product-gallery` | failed | /test-product-gallery-widget | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-gallery.png |
| `product-compare` | failed | /test-product-compare-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-compare.png |
| `product-table` | failed | /producttabletestproducttabletest | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-table.png |
| `listing-filters` | failed | /test-listing-filters-0516 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-listing-filters.png |
| `search-box` | failed | /ctr-search-box-2305 | 404 | no | public_http_failed; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-search-box.png |
| `timeline` | failed | /ctr-timeline-2305 | 404 | no | public_http_failed |
| `compare-timeline` | failed | /test-compare-timeline-0516 | 404 | no | public_http_failed |
| `newsletter` | failed | /test-newsletter-widget-0516 | 404 | no | public_http_failed |
| `booking-calendar` | failed | /test-booking-calendar-0516 | 404 | no | public_http_failed |
| `appointment-form` | failed | /test-appointment-form-0516 | 404 | no | public_http_failed |
| `form-embed` | failed | /ctr-form-embed-2305 | 404 | no | public_http_failed |
| `contact` | failed | /contact-audit-0516 | 404 | no | public_http_failed |
| `navigation` | failed | /homepage | 404 | no | public_http_failed |
| `footer` | failed | /test-footer-widget-0516 | 404 | no | public_http_failed |
