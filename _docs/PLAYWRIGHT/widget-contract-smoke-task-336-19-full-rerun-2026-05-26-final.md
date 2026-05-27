# Widget Contract Smoke Results

- **Generated:** 2026-05-26T18:16:30.948Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000
- **Playwright session:** task-336-19-full-rerun-2026-05-26-final

## Run Health

- Playwright CLI: available
- Admin reachable: yes
- Frontend reachable: yes
- Admin auth: failed

## Summary

- Admin failures: 35
- Public failures: 0
- Fixture gaps: 1
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `section` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s5/v5 | - | - |
| `template-section` | passed | visual:passed r1/s4/v4<br>advanced:passed r1/s5/v5 | - | - |
| `grid-columns` | fixture-gap | visual:passed r1/s8/v8<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `split-layout` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `tabs` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `accordion` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `toggle-block` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `spacer` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `divider` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `stack` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `hero` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `feature-grid` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `testimonials` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `pricing-plans` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `faq-accordion` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `cta-banner` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `logo-cloud` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `gallery-mosaic` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `stats-kpi` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `team` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `rich-text-section` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `content-list` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `posts-feed` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `entry-teaser` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `product-gallery` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `product-compare` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `product-table` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `listing-filters` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `search-box` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `timeline` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `compare-timeline` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `newsletter` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `booking-calendar` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `appointment-form` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `form-embed` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `contact` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `navigation` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |
| `footer` | failed | visual:failed r0/s0/v0 (auth_state_invalid:401)<br>advanced:failed r0/s0/v0 (auth_state_invalid:401) | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `section` | passed | /section-widget-test | 200 | no | - |
| `template-section` | passed | /ctr-template-section-2305 | 200 | no | - |
| `grid-columns` | passed | /test-grid-columns-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-grid-columns.png |
| `split-layout` | passed | /test-split-layout-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-split-layout.png |
| `tabs` | passed | /test-tabs-0516 | 200 | no | - |
| `accordion` | passed | /test-accordion-0516 | 200 | no | - |
| `toggle-block` | passed | /test-toggle-block-0516 | 200 | no | - |
| `spacer` | passed | /test-spacer-0516 | 200 | no | - |
| `divider` | passed | /test-divider-0516 | 200 | no | - |
| `stack` | passed | /test-stack-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-stack.png |
| `hero` | passed | /homepage | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png |
| `feature-grid` | passed | /featuregridtest | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-feature-grid.png |
| `testimonials` | passed | /test-testimonials-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-testimonials.png |
| `pricing-plans` | passed | /test-pricing-plans-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-pricing-plans.png |
| `faq-accordion` | passed | /test-faq-accordion-0516 | 200 | no | - |
| `cta-banner` | passed | /test-cta-banner-0516 | 200 | no | - |
| `logo-cloud` | passed | /test-logo-cloud-0516 | 200 | no | - |
| `gallery-mosaic` | passed | /gallery-mosaic-test-0516 | 200 | no | - |
| `stats-kpi` | passed | /stats-kpi-audit-0516 | 200 | no | - |
| `team` | passed | /test-team-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-team.png |
| `rich-text-section` | passed | /richtextsectiontest | 200 | no | - |
| `content-list` | passed | /test-content-list-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-content-list.png |
| `posts-feed` | passed | /posts-feed-test-page | 200 | no | - |
| `entry-teaser` | passed | /test-entry-teaser-0516 | 200 | no | - |
| `product-gallery` | passed | /test-product-gallery-widget | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-gallery.png |
| `product-compare` | passed | /test-product-compare-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-compare.png |
| `product-table` | passed | /producttabletestproducttabletest | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-table.png |
| `listing-filters` | passed | /test-listing-filters-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-listing-filters.png |
| `search-box` | passed | /ctr-search-box-2305 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-search-box.png |
| `timeline` | passed | /ctr-timeline-2305 | 200 | no | - |
| `compare-timeline` | passed | /test-compare-timeline-0516 | 200 | no | - |
| `newsletter` | passed | /test-newsletter-widget-0516 | 200 | no | - |
| `booking-calendar` | passed | /test-booking-calendar-0516 | 200 | no | - |
| `appointment-form` | passed | /test-appointment-form-0516 | 200 | no | - |
| `form-embed` | passed | /ctr-form-embed-2305 | 200 | no | - |
| `contact` | passed | /contact-audit-0516 | 200 | no | - |
| `navigation` | passed | /homepage | 200 | no | - |
| `footer` | passed | /test-footer-widget-0516 | 200 | no | - |
