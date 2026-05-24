# Widget Contract Smoke Results

- **Generated:** 2026-05-24T00:21:01.462Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000

## Run Health

- Playwright CLI: available
- Admin reachable: yes
- Frontend reachable: yes
- Admin auth: authenticated

## Summary

- Admin failures: 27
- Public failures: 2
- Fixture gaps: 9
- Metadata gaps: 11

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `section` | metadata-gap | wizard:passed r1/s1/v1<br>visual:passed r1/s7/v7<br>advanced:passed r1/s2/v2 | - | - |
| `template-section` | failed | wizard:passed r1/s3/v3<br>visual:passed r1/s3/v3<br>advanced:failed r0/s0/v0 | - | - |
| `grid-columns` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `split-layout` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s5/v5<br>advanced:failed r0/s0/v0 | - | - |
| `tabs` | metadata-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:passed r1/s6/v6 | - | - |
| `accordion` | failed | wizard:passed r1/s2/v2<br>visual:passed r1/s4/v4<br>advanced:failed r0/s0/v0 | - | - |
| `toggle-block` | metadata-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `spacer` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s3/v3<br>advanced:failed r0/s0/v0 | - | - |
| `divider` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s4/v4<br>advanced:passed r1/s4/v4 | - | - |
| `stack` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s5/v5<br>advanced:failed r0/s0/v0 | - | - |
| `hero` | failed | wizard:failed r0/s0/v0<br>visual:passed r1/s10/v10<br>advanced:passed r1/s2/v2 | - | - |
| `feature-grid` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:passed r1/s3/v3 | - | - |
| `testimonials` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `pricing-plans` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:passed r1/s3/v3 | - | - |
| `faq-accordion` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |
| `cta-banner` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:passed r1/s3/v3 | - | - |
| `logo-cloud` | metadata-gap | wizard:passed r1/s1/v1<br>visual:passed r1/s5/v5<br>advanced:passed r1/s3/v3 | - | - |
| `gallery-mosaic` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:passed r1/s4/v4 | - | - |
| `stats-kpi` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `team` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:passed r1/s3/v3 | - | - |
| `rich-text-section` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `content-list` | failed | wizard:passed r1/s2/v2<br>visual:failed r0/s0/v0<br>advanced:passed r1/s3/v3 | - | - |
| `posts-feed` | failed | wizard:failed r0/s0/v0<br>visual:failed r0/s0/v0<br>advanced:failed r0/s0/v0 | - | - |
| `entry-teaser` | failed | wizard:failed r0/s0/v0<br>visual:failed r0/s0/v0<br>advanced:failed r0/s0/v0 | - | - |
| `product-gallery` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s5/v5<br>advanced:passed r1/s4/v4 | - | - |
| `product-compare` | failed | wizard:failed r0/s0/v0<br>visual:failed r0/s0/v0<br>advanced:failed r0/s0/v0 | - | - |
| `product-table` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s10/v10<br>advanced:passed r1/s2/v2 | - | - |
| `listing-filters` | failed | wizard:passed r1/s5/v5<br>visual:failed r0/s0/v0<br>advanced:failed r0/s0/v0 | - | - |
| `search-box` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s3/v3<br>advanced:passed r1/s3/v3 | - | - |
| `timeline` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s6/v6<br>advanced:failed r0/s0/v0 | - | - |
| `compare-timeline` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `newsletter` | failed | wizard:failed r0/s0/v0<br>visual:failed r0/s0/v0<br>advanced:failed r0/s0/v0 | - | - |
| `booking-calendar` | failed | wizard:failed r1/s0/v0<br>visual:failed r1/s0/v0<br>advanced:failed r1/s0/v0 | - | - |
| `appointment-form` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:failed r1/s0/v0 | - | - |
| `form-embed` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `contact` | failed | wizard:passed r1/s4/v4<br>visual:failed r0/s0/v0<br>advanced:passed r1/s3/v3 | - | - |
| `navigation` | failed | wizard:failed r1/s0/v0<br>visual:passed r1/s8/v8<br>advanced:failed r1/s0/v0 | - | - |
| `footer` | failed | wizard:failed r1/s0/v0<br>visual:failed r0/s0/v0<br>advanced:failed r1/s0/v0 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `section` | passed | /section-widget-test | 200 | no | - |
| `template-section` | fixture-gap | - | - | - | public_fixture_missing |
| `grid-columns` | passed | /test-grid-columns-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-grid-columns.png |
| `split-layout` | passed | /test-split-layout-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-split-layout.png |
| `tabs` | passed | /test-tabs-0516 | 200 | no | - |
| `accordion` | passed | /test-accordion-0516 | 200 | no | - |
| `toggle-block` | passed | /test-toggle-block-0516 | 200 | no | - |
| `spacer` | passed | /test-spacer-0516 | 200 | no | - |
| `divider` | passed | /test-divider-0516 | 200 | no | - |
| `stack` | fixture-gap | /test-stack-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-stack.png |
| `hero` | passed | /homepage | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png |
| `feature-grid` | passed | /featuregridtest | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-feature-grid.png |
| `testimonials` | failed | /test-testimonials-0516 | 200 | no | card_overflow_unmarked; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-testimonials.png |
| `pricing-plans` | passed | /test-pricing-plans-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-pricing-plans.png |
| `faq-accordion` | passed | /test-faq-accordion-0516 | 200 | no | - |
| `cta-banner` | passed | /test-cta-banner-0516 | 200 | no | - |
| `logo-cloud` | passed | /test-logo-cloud-0516 | 200 | no | - |
| `gallery-mosaic` | passed | /gallery-mosaic-test-0516 | 200 | no | - |
| `stats-kpi` | passed | /stats-kpi-audit-0516 | 200 | no | - |
| `team` | failed | /test-team-0516 | 200 | no | card_overflow_unmarked; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-team.png |
| `rich-text-section` | passed | /richtextsectiontest | 200 | no | - |
| `content-list` | fixture-gap | /test-content-list-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-content-list.png |
| `posts-feed` | passed | /posts-feed-test-page | 200 | no | - |
| `entry-teaser` | passed | /test-entry-teaser-0516 | 200 | no | - |
| `product-gallery` | fixture-gap | /test-product-gallery-widget | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-gallery.png |
| `product-compare` | fixture-gap | /test-product-compare-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-compare.png |
| `product-table` | fixture-gap | /producttabletestproducttabletest | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-table.png |
| `listing-filters` | passed | /test-listing-filters-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-listing-filters.png |
| `search-box` | fixture-gap | - | - | - | public_fixture_missing |
| `timeline` | fixture-gap | - | - | - | public_fixture_missing |
| `compare-timeline` | passed | /test-compare-timeline-0516 | 200 | no | - |
| `newsletter` | passed | /test-newsletter-widget-0516 | 200 | no | - |
| `booking-calendar` | passed | /test-booking-calendar-0516 | 200 | no | - |
| `appointment-form` | passed | /test-appointment-form-0516 | 200 | no | - |
| `form-embed` | fixture-gap | - | - | - | public_fixture_missing |
| `contact` | passed | /contact-audit-0516 | 200 | no | - |
| `navigation` | passed | /homepage | 200 | no | - |
| `footer` | passed | /test-footer-widget-0516 | 200 | no | - |
