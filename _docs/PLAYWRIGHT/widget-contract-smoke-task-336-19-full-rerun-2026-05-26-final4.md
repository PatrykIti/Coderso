# Widget Contract Smoke Results

- **Generated:** 2026-05-26T18:59:39.187Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000
- **Playwright session:** task-336-19-full-rerun-2026-05-26-final4

## Run Health

- Playwright CLI: available
- Admin reachable: yes
- Frontend reachable: yes
- Admin auth: authenticated

## Summary

- Admin failures: 1
- Public failures: 0
- Fixture gaps: 0
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `section` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s5/v5 | - | - |
| `template-section` | passed | visual:passed r1/s4/v4<br>advanced:passed r1/s5/v5 | - | - |
| `grid-columns` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s5/v5 | - | - |
| `split-layout` | passed | visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |
| `tabs` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s6/v6 | - | - |
| `accordion` | passed | visual:passed r1/s6/v6<br>advanced:passed r1/s6/v6 | - | - |
| `toggle-block` | passed | visual:passed r1/s10/v10<br>advanced:passed r1/s5/v5 | - | - |
| `spacer` | passed | visual:passed r1/s5/v5<br>advanced:passed r1/s4/v4 | - | - |
| `divider` | passed | visual:passed r1/s6/v6<br>advanced:passed r1/s5/v5 | - | - |
| `stack` | passed | visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |
| `hero` | passed | visual:passed r1/s13/v13<br>advanced:passed r1/s8/v8 | - | - |
| `feature-grid` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s6/v6 | - | - |
| `testimonials` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s5/v5 | - | - |
| `pricing-plans` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s5/v5 | - | - |
| `faq-accordion` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s5/v5 | - | - |
| `cta-banner` | passed | visual:passed r1/s4/v4<br>advanced:passed r1/s3/v3 | - | - |
| `logo-cloud` | passed | visual:passed r1/s7/v7<br>advanced:passed r1/s6/v6 | - | - |
| `gallery-mosaic` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s6/v6 | - | - |
| `stats-kpi` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s5/v5 | - | - |
| `team` | passed | visual:passed r1/s6/v6<br>advanced:passed r1/s6/v6 | - | - |
| `rich-text-section` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s6/v6 | - | - |
| `content-list` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s5/v5 | - | - |
| `posts-feed` | passed | visual:passed r1/s7/v7<br>advanced:passed r1/s5/v5 | - | - |
| `entry-teaser` | passed | visual:passed r1/s10/v10<br>advanced:passed r1/s5/v5 | - | - |
| `product-gallery` | passed | visual:passed r1/s10/v10<br>advanced:passed r1/s6/v6 | - | - |
| `product-compare` | passed | visual:passed r1/s11/v11<br>advanced:passed r1/s5/v5 | - | - |
| `product-table` | passed | visual:passed r1/s12/v12<br>advanced:passed r1/s4/v4 | - | - |
| `listing-filters` | passed | visual:passed r1/s6/v6<br>advanced:passed r1/s6/v6 | - | - |
| `search-box` | passed | visual:passed r1/s5/v5<br>advanced:passed r1/s5/v5 | - | - |
| `timeline` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s5/v5 | - | - |
| `compare-timeline` | failed | - | - | block_select_missing |
| `newsletter` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s4/v4 | - | - |
| `booking-calendar` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s4/v4 | - | - |
| `appointment-form` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s4/v4 | - | - |
| `form-embed` | passed | visual:passed r1/s9/v9<br>advanced:passed r1/s6/v6 | - | - |
| `contact` | passed | visual:passed r1/s10/v10<br>advanced:passed r1/s5/v5 | - | - |
| `navigation` | passed | visual:passed r1/s5/v5<br>advanced:passed r1/s3/v3 | - | - |
| `footer` | passed | visual:passed r1/s12/v12<br>advanced:passed r1/s6/v6 | - | - |

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
